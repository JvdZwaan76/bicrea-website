import { Router } from 'itty-router';
import { verify, sign } from 'jsonwebtoken';
import { compare } from 'bcryptjs';

const router = Router();

const securityMiddleware = async ({ request, env }) => {
  try {
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const rateLimit = await env.DB.prepare('SELECT count, timestamp FROM rate_limits WHERE ip = ?').bind(ip).first();
    if (rateLimit && rateLimit.count >= 100 && Date.now() - rateLimit.timestamp < 3600000) {
      return new Response('Rate limit exceeded', { status: 429 });
    }
    const origin = request.headers.get('origin') || '';
    if (!env.ALLOWED_ORIGINS.split(',').includes(origin)) {
      return new Response('Invalid origin', { status: 403 });
    }
    return {
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'",
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
      }
    };
  } catch (error) {
    return new Response(`Security middleware error: ${error.message}`, { status: 500 });
  }
};

const authMiddleware = async ({ request, env }) => {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return new Response('Unauthorized', { status: 401 });
    const payload = verify(token, env.JWT_SECRET);
    return { userId: payload.sub };
  } catch {
    return new Response('Invalid token', { status: 401 });
  }
};

router.post('/api/auth/login', securityMiddleware, async ({ request, env }) => {
  try {
    const { email, password, mfaCode } = await request.json();
    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    if (!user) {
      await env.DB.prepare('INSERT INTO login_attempts (ip, email, success) VALUES (?, ?, 0)')
        .bind(request.headers.get('cf-connecting-ip') || 'unknown', email).run();
      return new Response('Invalid credentials', { status: 401 });
    }
    const passwordMatch = await compare(password, user.password);
    if (!passwordMatch) {
      await env.DB.prepare('INSERT INTO login_attempts (ip, email, success) VALUES (?, ?, 0)')
        .bind(request.headers.get('cf-connecting-ip') || 'unknown', email).run();
      const attempts = await env.DB.prepare('SELECT COUNT(*) as count FROM login_attempts WHERE ip = ? AND timestamp > ?')
        .bind(request.headers.get('cf-connecting-ip') || 'unknown', Date.now() - 3600000).first('count');
      if (attempts >= 3) {
        await env.DB.prepare('INSERT INTO locked_accounts (ip, unlock_time) VALUES (?, ?)')
          .bind(request.headers.get('cf-connecting-ip') || 'unknown', Date.now() + 300000).run();
        return new Response('Account locked', { status: 429 });
      }
      return new Response('Invalid credentials', { status: 401 });
    }
    if (user.mfa_enabled && mfaCode !== '123456') {
      return new Response('Invalid MFA code', { status: 401 });
    }
    const token = sign({ sub: user.id }, env.JWT_SECRET, { expiresIn: '30m' });
    return new Response(JSON.stringify({ token }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(`Login error: ${error.message}`, { status: 500 });
  }
});

router.post('/api/documents', securityMiddleware, authMiddleware, async ({ request, env }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const project = formData.get('project');
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) return new Response('Invalid file type', { status: 400 });
    if (file.size > 10 * 1024 * 1024) return new Response('File too large', { status: 400 });
    const fileId = crypto.randomUUID();
    await env.DOCUMENTS.put(fileId, await file.arrayBuffer());
    await env.DB.prepare('INSERT INTO documents (id, user_id, name, type, size, project, upload_date) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(fileId, request.userId, file.name, file.type, file.size, project, new Date().toISOString()).run();
    return new Response(JSON.stringify({ id: fileId }), { status: 201 });
  } catch (error) {
    return new Response(`Document upload error: ${error.message}`, { status: 500 });
  }
});

router.get('/api/documents/:id', securityMiddleware, authMiddleware, async ({ request, env, params }) => {
  try {
    const document = await env.DB.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').bind(params.id, request.userId).first();
    if (!document) return new Response('Document not found', { status: 404 });
    const file = await env.DOCUMENTS.get(params.id);
    return new Response(file, {
      headers: { 'Content-Type': document.type, 'Content-Disposition': `attachment; filename="${document.name}"` }
    });
  } catch (error) {
    return new Response(`Document fetch error: ${error.message}`, { status: 500 });
  }
});

router.get('/api/documents', securityMiddleware, authMiddleware, async ({ request, env }) => {
  try {
    const documents = await env.DB.prepare('SELECT * FROM documents WHERE user_id = ?').bind(request.userId).all();
    return new Response(JSON.stringify(documents.results), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(`Documents fetch error: ${error.message}`, { status: 500 });
  }
});

router.all('*', () => new Response('Not found', { status: 404 }));

export default { fetch: router.handle };
