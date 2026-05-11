#!/usr/bin/env node
/*
 * BICREA Florida — Production Build Script
 * ============================================================================
 *
 * Purpose: Content-hash CSS and JS assets and place them under /assets/
 * so they can be cached forever (`Cache-Control: immutable`) without manual
 * cache invalidation. This is the standard enterprise pattern used by Stripe,
 * GitHub, Vercel-hosted apps, etc.
 *
 * Why the /assets/ subdirectory:
 *   Cloudflare Pages applies headers from ALL matching `_headers` rules and
 *   concatenates same-name values with commas. A rule like `/*.js` matching
 *   `/sw.js` would inherit `Cache-Control: immutable` even if `/sw.js` has
 *   its own override — the values would join to a malformed Cache-Control.
 *   Placing hashed assets under /assets/ means the immutable rule applies
 *   to a path pattern (`/assets/*.js`) that does NOT match `/sw.js` at the
 *   root, eliminating any possibility of header conflicts.
 *
 * How it works:
 *   1. Read each source asset (styles.css, script.js, etc.)
 *   2. Compute a short SHA-256 hash of the content (10 chars)
 *   3. Write the asset to dist/assets/ with the hash in the filename
 *      e.g.  styles.css  →  dist/assets/styles.a3f2c91xxx.css
 *            script.js   →  dist/assets/script.b8d2e44yyy.js
 *   4. Copy all other files (HTML, images, _headers, _redirects, sw.js,
 *      etc.) to dist/
 *   5. Rewrite HTML in dist/ to reference /assets/<hashed>
 *
 * What does NOT get hashed:
 *   - sw.js (Service Worker spec requires stable URL — stays at /sw.js)
 *   - Images (already content-named filenames like hero-mineral-title.webp)
 *   - Favicons (same)
 *   - HTML (entry points, must remain referenceable)
 *
 * How it's invoked:
 *   - Locally:           `node build.js`  (writes to ./dist/)
 *   - Cloudflare Pages:  set build command to `node build.js` and
 *                        build output directory to `dist`
 *
 * Dependencies: none (uses only Node.js built-ins). No npm install needed.
 * Node version: 18+ for built-in fs APIs.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SRC = process.cwd();
const OUT = path.join(SRC, 'dist');
const ASSETS_DIR = 'assets';  // hashed assets go to dist/assets/

// Source asset files to be content-hashed (everything else copied as-is)
//
// Note: critical.css is intentionally NOT in this list. Its content is
// inlined into every HTML file as <style id="critical-css">…</style> at
// build time outside this script (currently maintained by hand). The
// source critical.css remains in the repo for developer reference, but
// it is NOT served as a standalone asset. See IGNORE_NAMES below.
const HASHED_ASSETS = [
    'styles.css',
    'script.js',
    'consent.js',
    'analytics.js',
    'smart-form.js',
    'email-protect.js',
];

// Top-level entries to skip when copying. The .md filter below also catches
// any new documentation file added to the repo without updating this list.
const IGNORE_NAMES = new Set([
    'dist',
    'node_modules',
    '.git',
    '.github',
    'build.js',
    'critical.css',  // inlined in HTML's <style id="critical-css">, source-only
]);

function shouldIgnore(name) {
    if (IGNORE_NAMES.has(name)) return true;
    // Exclude ALL .md files (in any directory) — these are internal
    // documentation (READMEs, deploy guides, audit reports). Never public.
    if (name.endsWith('.md')) return true;
    // Defensive: common OS artifacts and developer backup files. These
    // should never reach a deploy. If git is clean these shouldn't exist,
    // but defensive matching costs nothing.
    if (name === '.DS_Store' || name === 'Thumbs.db') return true;
    if (name.endsWith('.bak') || name.endsWith('.orig') ||
        name.endsWith('.swp') || name.endsWith('~')) return true;
    return false;
}

const log = (...a) => console.log('[build]', ...a);

function shortHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 10);
}

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function copyRecursive(src, dst) {
    // Filter subdirectory entries too — shouldIgnore catches .md files and
    // OS artifacts no matter how deeply nested. Without this check, files
    // like favicon/README.md or any .DS_Store would slip through.
    if (shouldIgnore(path.basename(src))) return;
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
        for (const entry of fs.readdirSync(src)) {
            copyRecursive(path.join(src, entry), path.join(dst, entry));
        }
    } else {
        fs.copyFileSync(src, dst);
    }
}

/* ============================================================
   STEP 1: Compute hashes for each asset
   ============================================================ */
log('Computing content hashes…');
const hashMap = {};  // 'styles.css' → 'styles.a3f2c91xxx.css'
const publicPath = {};  // 'styles.css' → '/assets/styles.a3f2c91xxx.css' (URL)
for (const asset of HASHED_ASSETS) {
    const srcPath = path.join(SRC, asset);
    if (!fs.existsSync(srcPath)) {
        log(`  SKIP (not found): ${asset}`);
        continue;
    }
    const content = fs.readFileSync(srcPath);
    const hash = shortHash(content);
    const ext = path.extname(asset);
    const base = path.basename(asset, ext);
    const hashed = `${base}.${hash}${ext}`;
    hashMap[asset] = hashed;
    publicPath[asset] = `/${ASSETS_DIR}/${hashed}`;
    log(`  ${asset.padEnd(20)} → ${publicPath[asset]}`);
}

/* ============================================================
   STEP 2: Prepare dist/
   ============================================================ */
log('Preparing dist/…');
if (fs.existsSync(OUT)) {
    fs.rmSync(OUT, { recursive: true, force: true });
}
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(OUT, ASSETS_DIR), { recursive: true });

/* ============================================================
   STEP 3: Copy everything except hashed source assets and ignored items
   ============================================================ */
log('Copying static files…');
let copiedCount = 0;
for (const entry of fs.readdirSync(SRC)) {
    if (shouldIgnore(entry)) continue;
    if (HASHED_ASSETS.includes(entry)) continue;  // hashed below
    copyRecursive(path.join(SRC, entry), path.join(OUT, entry));
    copiedCount++;
}
log(`  ${copiedCount} top-level entries copied`);

/* ============================================================
   STEP 4: Write hashed assets to dist/assets/
   ============================================================ */
log('Writing hashed assets to dist/assets/…');
for (const [original, hashed] of Object.entries(hashMap)) {
    const content = fs.readFileSync(path.join(SRC, original));
    fs.writeFileSync(path.join(OUT, ASSETS_DIR, hashed), content);
}

/* ============================================================
   STEP 5: Rewrite HTML files in dist/ to reference hashed URLs
   ============================================================ */
log('Rewriting HTML references…');
const htmlFiles = fs.readdirSync(OUT).filter((f) => f.endsWith('.html'));
let totalRewrites = 0;
for (const hf of htmlFiles) {
    const filePath = path.join(OUT, hf);
    let html = fs.readFileSync(filePath, 'utf8');
    let fileRewrites = 0;
    for (const [original, hashed] of Object.entries(hashMap)) {
        // Match  href="/file.css"  or  src="/file.js"  optionally with ?query
        // We require a whitespace before href/src to avoid matching `data-href`,
        // `data-src`, or anything else where href/src is part of a longer
        // attribute name.
        const pat = new RegExp(
            `(\\s)(href|src)="/${escapeRegex(original)}(?:\\?[^"]*)?"`,
            'g'
        );
        const newHtml = html.replace(pat, `$1$2="${publicPath[original]}"`);
        const matches = (html.match(pat) || []).length;
        if (matches > 0) {
            html = newHtml;
            fileRewrites += matches;
        }
    }
    fs.writeFileSync(filePath, html);
    totalRewrites += fileRewrites;
    if (fileRewrites > 0) {
        log(`  ${hf}: ${fileRewrites} refs rewritten`);
    }
}
log(`  Total: ${totalRewrites} references updated across ${htmlFiles.length} HTML files`);

/* ============================================================
   STEP 6: Write build-info.json (debugging aid)
   ============================================================ */
const buildInfo = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    assetsBaseUrl: `/${ASSETS_DIR}/`,
    hashedAssets: hashMap,
    publicPaths: publicPath,
    totalRewrites,
};
fs.writeFileSync(
    path.join(OUT, 'build-info.json'),
    JSON.stringify(buildInfo, null, 2)
);

log('Build complete.');
log(`Output directory: ${OUT}`);
log(`Hashed assets: ${Object.keys(hashMap).length} → dist/${ASSETS_DIR}/`);
log(`HTML rewrites: ${totalRewrites}`);
