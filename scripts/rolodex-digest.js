#!/usr/bin/env node
/**
 * BIC REA — Counsel Outreach Digest (weekly)
 * Reads data/attorney-rolodex.json and emails the team a branded Monday digest:
 * this week's call list, pipeline by status/state, and recent movement.
 * Mirrors scripts/blm-notify.js: Zoho SMTP via nodemailer, --dry-run, --preview,
 * priority-recipient split, same env-var pattern.
 *
 * Env:  ZOHO_USER, ZOHO_APP_PASSWORD (same secrets as BLM tracker)
 *       ROLODEX_RECIPIENTS  (comma list; falls back to BLM_RECIPIENTS)
 *       ROLODEX_PRIORITY    (comma list; optional high-priority header split)
 * Flags: --dry-run  (log, no send)   --preview  (write preview.html, no send)
 */
const fs = require('fs');
const path = require('path');

const has = f => process.argv.some(a => a === `--${f}` || a.startsWith(`--${f}=`));
const DRY = has('dry-run');
const PREVIEW = has('preview');
const SENDER = process.env.ZOHO_USER;
const RECIPIENTS = (process.env.ROLODEX_RECIPIENTS || process.env.BLM_RECIPIENTS || '')
  .split(',').map(x => x.trim()).filter(Boolean);
const PRIORITY = new Set((process.env.ROLODEX_PRIORITY || '')
  .split(',').map(x => x.trim().toLowerCase()).filter(Boolean));

const DATA_PATH = path.join(__dirname, '..', 'data', 'attorney-rolodex.json');

// ---------- data ----------
const STATUS_LABEL = {
  not_contacted: 'Not yet contacted', contacted: 'Contacted — awaiting reply',
  replied: 'Replied', call_scheduled: 'Call scheduled', engaged: 'Engaged',
  declined: 'Declined', parked: 'Parked'
};
const ACTIVE = ['contacted', 'replied', 'call_scheduled'];

function load() {
  const d = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  if (!Array.isArray(d.candidates)) throw new Error('rolodex JSON malformed: no candidates[]');
  return d;
}

// ---------- html ----------
const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const NAVY = '#0a0a0a', GOLD = '#c9a961', CREAM = '#f4f1ea', INK = '#1a1a1a', MUTED = '#6b6b6b';

function candidateRow(c, showNext) {
  const contact = [c.phone, c.email].filter(Boolean).map(esc).join(' &middot; ');
  const next = showNext && c.next_step ? `<div style="color:${MUTED};font-size:13px;margin-top:2px;">Next: ${esc(c.next_step)}${c.owner ? ' (' + esc(c.owner) + ')' : ''}</div>` : '';
  const caveat = c.caveat ? `<div style="color:#8a6d3b;font-size:13px;margin-top:2px;">&#9888; ${esc(c.caveat)}</div>` : '';
  return `<div style="padding:12px 0;border-bottom:1px solid #e3ddd0;">
    <div style="font-size:15px;color:${INK};"><strong>${esc(c.person)}</strong> &mdash; ${esc(c.firm)} <span style="color:${MUTED};">(${esc(c.state)}, ${esc(c.location)})</span></div>
    ${contact ? `<div style="color:${MUTED};font-size:13px;margin-top:2px;">${contact}${c.site ? ' &middot; ' + esc(c.site) : ''}</div>` : ''}
    <div style="color:${INK};font-size:13px;margin-top:4px;">${esc(c.why)}</div>
    ${caveat}${next}
  </div>`;
}

function digestEmail(data) {
  const cands = data.candidates;
  const callList = cands.filter(c => c.tier === 1 && c.status === 'not_contacted').slice(0, 5);
  const inFlight = cands.filter(c => ACTIVE.includes(c.status));
  const engaged = cands.filter(c => c.status === 'engaged');
  const byState = ['TX', 'OK', 'ND'].map(st => {
    const g = cands.filter(c => c.state === st);
    return `${st}: ${g.length} (${g.filter(c => ACTIVE.includes(c.status) || c.status === 'engaged').length} active)`;
  }).join(' &nbsp;&middot;&nbsp; ');

  const counts = {};
  for (const c of cands) counts[c.status] = (counts[c.status] || 0) + 1;
  const statusLine = Object.entries(counts)
    .map(([k, v]) => `${STATUS_LABEL[k] || k}: <strong>${v}</strong>`).join(' &nbsp;&middot;&nbsp; ');

  const section = (title, inner) => inner ? `
    <h2 style="font-family:Georgia,serif;font-weight:normal;font-size:19px;color:${INK};margin:28px 0 4px;border-bottom:2px solid ${GOLD};display:inline-block;padding-bottom:4px;">${title}</h2>${inner}` : '';

  const html = `<div style="background:#ffffff;padding:24px 0;">
  <div style="max-width:640px;margin:0 auto;background:${CREAM};font-family:Georgia,'Times New Roman',serif;">
    <div style="background:${NAVY};padding:18px 28px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="color:${GOLD};font-size:16px;letter-spacing:2px;">&#9670; BIC REA LLC</td>
        <td align="right" style="color:${GOLD};font-size:11px;letter-spacing:3px;">OUTREACH DIGEST</td>
      </tr></table>
    </div>
    <div style="padding:24px 28px 30px;">
      <h1 style="font-weight:normal;font-size:26px;color:${INK};margin:0 0 2px;">Counsel outreach &mdash; weekly pipeline</h1>
      <div style="border-bottom:2px solid ${GOLD};width:64px;margin:8px 0 14px;"></div>
      <div style="color:${MUTED};font-size:13px;">Rolodex updated ${esc(data.updated)} &middot; ${cands.length} vetted candidates &middot; ${byState}</div>

      ${section("This week's call list", callList.length
        ? callList.map(c => candidateRow(c, false)).join('')
        : `<div style="padding:10px 0;color:${MUTED};font-size:14px;">Tier 1 fully contacted &mdash; work the in-flight list below or promote Tier 2.</div>`)}

      ${section('In flight', inFlight.length ? inFlight.map(c => `
        <div style="padding:10px 0;border-bottom:1px solid #e3ddd0;font-size:14px;color:${INK};">
          <strong>${esc(c.person)}</strong> &mdash; ${esc(c.firm)} (${esc(c.state)})
          <span style="color:${MUTED};">&middot; ${STATUS_LABEL[c.status]}${c.last_touch ? ' &middot; last touch ' + esc(c.last_touch) : ''}</span>
          ${c.next_step ? `<div style="color:${MUTED};font-size:13px;">Next: ${esc(c.next_step)}${c.owner ? ' (' + esc(c.owner) + ')' : ''}</div>` : ''}
        </div>`).join('') : '')}

      ${section('Engaged', engaged.length ? engaged.map(c =>
        `<div style="padding:8px 0;font-size:14px;color:${INK};"><strong>${esc(c.person)}</strong> &mdash; ${esc(c.firm)} (${esc(c.state)})</div>`).join('') : '')}

      <div style="margin-top:26px;background:#ece7db;padding:12px 16px;font-size:12px;color:${MUTED};">
        Pipeline: ${statusLine}<br><br>
        Language rule: opinions are &ldquo;coordinated through independent licensed counsel, confirmed per state at
        engagement&rdquo; &mdash; never &ldquo;our attorney network.&rdquo; Confirm bar standing for the signing attorney
        at engagement. Update the pipeline by editing <code>data/attorney-rolodex.json</code> &mdash; this digest reads it every Monday.
      </div>
    </div>
    <div style="background:${NAVY};padding:12px 28px;color:${GOLD};font-size:11px;">
      <a href="https://bicrea.com" style="color:${GOLD};text-decoration:none;">bicrea.com</a>
      &nbsp;&middot;&nbsp; BIC REA LLC &mdash; Comprehensive Title Research
    </div>
  </div></div>`;

  const subject = `Counsel outreach digest — ${callList.length} to call this week, ${inFlight.length} in flight`;
  return { subject, html };
}

// ---------- send (same pattern as blm-notify.js) ----------
async function send(mail) {
  if (PREVIEW) {
    fs.writeFileSync(path.join(__dirname, '..', 'rolodex-preview.html'), mail.html);
    console.log(`  [PREVIEW] wrote rolodex-preview.html — subject: "${mail.subject}"`);
    return;
  }
  if (DRY) {
    console.log(`  [DRY] would email ${RECIPIENTS.length} (high-priority:${RECIPIENTS.filter(r => PRIORITY.has(r.toLowerCase())).length}): "${mail.subject}"`);
    return;
  }
  const nodemailer = require('nodemailer');
  const t = nodemailer.createTransport({ host: 'smtp.zoho.com', port: 465, secure: true, auth: { user: SENDER, pass: process.env.ZOHO_APP_PASSWORD } });
  const hi = RECIPIENTS.filter(r => PRIORITY.has(r.toLowerCase()));
  const norm = RECIPIENTS.filter(r => !PRIORITY.has(r.toLowerCase()));
  const base = { from: `"BIC REA LLC" <${SENDER}>`, subject: mail.subject, html: mail.html };
  if (hi.length) await t.sendMail({ ...base, to: hi.join(','), priority: 'high' });
  if (norm.length) await t.sendMail({ ...base, to: norm.join(','), priority: 'normal' });
  console.log(`  sent: ${mail.subject}  (high-priority:${hi.length}, normal:${norm.length})`);
}

(async () => {
  const data = load();
  await send(digestEmail(data));
  console.log(`${DRY ? '[DRY] ' : ''}candidates=${data.candidates.length}  updated=${data.updated}`);
})().catch(e => { console.error('ROLODEX ERROR:', e.message); process.exit(1); });
