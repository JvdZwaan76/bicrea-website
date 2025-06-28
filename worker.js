import { Router } from 'itty-router';
import { verify, sign } from 'jsonwebtoken';
import { compare, hash } from 'bcryptjs';

const router = Router();

const securityMiddleware = async ({ request, env }) => {
  try {
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    // Temporarily disable rate limiting
    // const rateLimit = await env.DB.prepare('SELECT count, timestamp FROM rate_limits WHERE ip = ?')
    //   .bind(ip)
    //   .first();
    // if (rateLimit && rateLimit.count >= 100 && Date.now() - rateLimit.timestamp < 3600000) {
    //   return new Response('Rate limit exceeded', { status: 429 });
    // }

    const origin = request.headers.get('origin') || '';
    const allowedOrigins = [
      'https://bicrea.com',
      'https://www.bicrea.com',
      'https://bicrea.net',
      'https://www.bicrea.net',
      'https://bicrea-website.jaspervdz.workers.dev'
    ];
    if (!allowedOrigins.includes(origin)) {
      return new Response('Invalid origin', { status: 403 });
    }

    if (origin === 'http://localhost:8787') {
      return { headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'", 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } };
    }
    return { headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'", 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } };
  } catch (error) {
    console.error(`Security middleware error: ${error.message}`, error.stack);
    return new Response(`Security middleware error: ${error.message}`, { status: 500 });
  }
};

const authMiddleware = async ({ request, env }) => {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return new Response('Unauthorized', { status: 401 });
  try {
    const payload = verify(token, env.JWT_SECRET);
    return { userId: payload.sub };
  } catch (error) {
    console.error(`Auth middleware error: ${error.message}`, error.stack);
    return new Response('Invalid token', { status: 401 });
  }
};

router.all('*', async ({ request, next }) => {
  const url = new URL(request.url);
  if ((url.hostname === 'bicrea.net' || url.hostname === 'www.bicrea.net') && !url.pathname.startsWith('/api/')) {
    const target = `https://bicrea.com${url.pathname}${url.search}`;
    console.log(`Redirecting ${url.hostname} to ${target}`);
    return Response.redirect(target, 301);
  }
  return await next();
});

router.post('/api/auth/login', securityMiddleware, async ({ request, env }) => {
  try {
    const { email, password, mfaCode } = await request.json();
    // Temporarily disable database query
    // const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    return new Response('Login endpoint active (DB disabled)', { status: 200 });
  } catch (error) {
    console.error(`Login error: ${error.message}`, error.stack);
    return new Response(`Login error: ${error.message}`, { status: 500 });
  }
});

router.post('/api/documents', securityMiddleware, authMiddleware, async ({ request, env }) => {
  try {
    // Temporarily disable database and R2 operations
    return new Response('Document upload endpoint active (DB/R2 disabled)', { status: 200 });
  } catch (error) {
    console.error(`Document upload error: ${error.message}`, error.stack);
    return new Response(`Document upload error: ${error.message}`, { status: 500 });
  }
});

router.get('/api/documents/:id', securityMiddleware, authMiddleware, async ({ request, env, params }) => {
  try {
    // Temporarily disable database and R2 operations
    return new Response('Document download endpoint active (DB/R2 disabled)', { status: 200 });
  } catch (error) {
    console.error(`Document fetch error: ${error.message}`, error.stack);
    return new Response(`Document fetch error: ${error.message}`, { status: 500 });
  }
});

router.get('/api/documents', securityMiddleware, authMiddleware, async ({ request, env }) => {
  try {
    // Temporarily disable database query
    return new Response('Documents list endpoint active (DB disabled)', { status: 200 });
  } catch (error) {
    console.error(`Documents fetch error: ${error.message}`, error.stack);
    return new Response(`Documents fetch error: ${error.message}`, { status: 500 });
  }
});

router.all('*', async (request) => {
  const url = new URL(request.url);
  if (url.pathname === '/favicon.ico') return new Response(null, { status: 204 });
  const asset = await env.ASSETS.fetch(request);
  return asset || new Response('Not found', { status: 404 });
});

export default {
  fetch(request) {
    try {
      const response = router.handle(request);
      console.log(`Handled request for ${request.url} with status ${response.status}`);
      return response;
    } catch (error) {
      console.error(`Worker exception: ${error.message}`, error.stack);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};
