#!/usr/bin/env node
'use strict';
/*
 * BLM notifier — runs daily via GitHub Action.
 * - pulls firm sales via blm-rss
 * - fires an email 7 days and 2 days before each sale (threshold-based, so a missed run self-heals)
 * - weekly digest (Mondays) of upcoming + pipeline
 * - writes data/blm-sales.json (for the phase-2 page) and data/blm-state.json (dedupe)
 *
 * Flags:  --dry-run           don't send or write, just print what WOULD happen
 *         --today=YYYY-MM-DD  simulate a date (testing)
 *         --feed-file=PATH    parse a local feed instead of fetching (testing)
 *         --digest            force-send the digest regardless of weekday
 */
const fs=require('fs'), path=require('path');
const rss=require('./blm-rss.js');

const arg=(k,d)=>{const a=process.argv.find(s=>s.startsWith('--'+k+'='));return a?a.split('=')[1]:d;};
const has=(k)=>process.argv.includes('--'+k);
const DRY=has('dry-run');
const TODAY=arg('today', new Date().toISOString().slice(0,10));
const STATE_PATH=path.join(__dirname,'../data/blm-state.json');
const JSON_PATH =path.join(__dirname,'../data/blm-sales.json');
const RECIPIENTS=(process.env.BLM_RECIPIENTS||'sandra.petkov@bicrea.com').split(',').map(s=>s.trim()).filter(Boolean);
const PRIORITY=new Set((process.env.BLM_PRIORITY||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean));
const SENDER=process.env.ZOHO_USER||'notifications@bicrea.com';

const MILESTONES=[{key:'T-7',hi:7,lo:3},{key:'T-2',hi:2,lo:0}];
const daysBetween=(a,b)=>Math.round((Date.parse(b)-Date.parse(a))/864e5);

function loadState(){ try{return JSON.parse(fs.readFileSync(STATE_PATH,'utf8'));}catch{return {alerts:{}};} }
function saveState(s){ if(DRY)return; fs.mkdirSync(path.dirname(STATE_PATH),{recursive:true}); fs.writeFileSync(STATE_PATH,JSON.stringify(s,null,2)); }

async function getData(){
  const ff=arg('feed-file',null);
  if(ff){ const items=rss.parseFeed(fs.readFileSync(ff,'utf8'),'File'); return rss.run(items); }
  const items=[]; for(const [region,url] of Object.entries(rss.FEEDS)){
    try{const r=await fetch(url,{headers:{'user-agent':'BICREA-BLM'}}); if(r.ok) items.push(...rss.parseFeed(await r.text(),region)); }catch{}
  } return rss.run(items);
}

function fmt(d){ return new Date(d+'T00:00:00Z').toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}); }

// ---------- on-brand email shell (email-client robust: tables + inline styles) ----------
const B={ dark:'#14120e', gold:'#d4af37', goldText:'#8a6d1a', ink:'#1c1a17', muted:'#6b6b6b', line:'#e7e2d6', card:'#ffffff', page:'#efece5', panel:'#faf8f2' };
function shell(kicker,title,body,preheader){
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${preheader}</div>`+
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${B.page};margin:0;padding:24px 0"><tr><td align="center">`+
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:${B.card};border:1px solid ${B.line}">`+
      `<tr><td style="background:${B.dark};padding:20px 32px"><table role="presentation" width="100%"><tr>`+
        `<td style="font-family:Georgia,'Times New Roman',serif;color:${B.gold};font-size:17px;letter-spacing:2px">&#9674;&nbsp; BIC REA LLC</td>`+
        `<td align="right" style="font-family:Arial,sans-serif;color:${B.gold};font-size:10px;letter-spacing:2px;text-transform:uppercase">${kicker}</td>`+
      `</tr></table></td></tr>`+
      `<tr><td style="padding:26px 32px 6px"><h1 style="margin:0;font-family:Georgia,serif;font-size:21px;color:${B.ink};font-weight:normal">${title}</h1>`+
        `<div style="height:3px;width:44px;background:${B.gold};margin-top:12px;font-size:0;line-height:0">&nbsp;</div></td></tr>`+
      `<tr><td style="padding:10px 32px 6px;font-family:Arial,Helvetica,sans-serif;color:${B.ink};font-size:15px;line-height:1.55">${body}</td></tr>`+
      `<tr><td style="padding:18px 32px 26px;border-top:1px solid ${B.line}"><p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:${B.muted};line-height:1.5">`+
        `Automated from official BLM state-office feeds. Verify all details on the linked notice before acting.<br>`+
        `<a href="https://www.bicrea.com" style="color:${B.goldText};text-decoration:none">bicrea.com</a> &nbsp;&middot;&nbsp; BIC REA LLC &mdash; Mineral Title Research</p></td></tr>`+
    `</table></td></tr></table>`;
}
function sectionHdr(t){ return `<p style="font-family:Georgia,serif;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${B.goldText};margin:22px 0 10px">${t}</p>`; }
function cleanPipe(t){ return t.replace(/^BLM\s+seeks?\s+(initial\s+)?input\s+for\s+/i,'').replace(/\s+sale of oil and gas leases.*$/i,' sale').replace(/^Potential.*/i,'potential leasing (early scoping)'); }

function alertEmail(sale,days){
  const subject=`Action needed: BLM lease sale in ${days} day${days===1?'':'s'} — ${sale.states.join(', ')}`;
  const body=
    `<table role="presentation" width="100%" style="margin:4px 0 16px"><tr><td style="padding:16px;background:${B.dark};text-align:center">`+
      `<span style="font-family:Georgia,serif;color:${B.gold};font-size:30px;vertical-align:middle">${days}</span>`+
      `<span style="font-family:Arial,sans-serif;color:#c9bd98;font-size:12px;letter-spacing:2px;vertical-align:middle"> &nbsp;DAY${days===1?'':'S'} UNTIL BID OPENING</span>`+
    `</td></tr></table>`+
    `<p style="font-family:Georgia,serif;font-size:18px;color:${B.ink};margin:0 0 2px"><strong>${fmt(sale.sale_date)}</strong></p>`+
    `<p style="font-size:14px;color:${B.muted};margin:0 0 12px">${sale.states.join(', ')}</p>`+
    (sale.bid_deadline?`<p style="font-size:13px;color:#9a2b2b;margin:0 0 14px">Sealed-bid deadline: <strong>${fmt(sale.bid_deadline)}</strong></p>`:'')+
    `<p style="margin:0"><a href="${sale.link}" style="display:inline-block;background:${B.gold};color:${B.dark};text-decoration:none;padding:11px 20px;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;letter-spacing:.5px">View the BLM notice &rsaquo;</a></p>`;
  return { subject, html: shell('Lease Sale Alert', `${sale.states.join(', ')} — sale approaching`, body, `${fmt(sale.sale_date)} · ${days} day${days===1?'':'s'} out`) };
}
function digestEmail(data){
  const cutoff=new Date(Date.parse(TODAY)-2*864e5).toISOString().slice(0,10);
  const up=data.sale.filter(s=>s.sale_date>=cutoff);
  const saleRow=s=>`<table role="presentation" width="100%" style="margin:0 0 8px"><tr><td style="padding:11px 14px;background:${B.panel};border-left:3px solid ${B.gold}">`+
    `<span style="font-family:Georgia,serif;font-size:15px;color:${B.ink}"><strong>${fmt(s.sale_date)}</strong></span><br>`+
    `<span style="font-size:13px;color:${B.muted}">${s.states.join(', ')}</span> &nbsp;&middot;&nbsp; `+
    `<a href="${s.link}" style="color:${B.goldText};font-size:13px;text-decoration:none">BLM notice &rsaquo;</a></td></tr></table>`;
  const pipeRow=p=>`<tr><td style="padding:4px 0;font-family:Arial,sans-serif;font-size:13px;color:#444;line-height:1.45">`+
    `<span style="color:${B.goldText}">&#9674;</span>&nbsp; <strong style="color:${B.ink};font-weight:600">${p.states.join(', ')||'—'}</strong>`+
    `<span style="color:#999"> &mdash; </span>${cleanPipe(p.title)}</td></tr>`;
  const body=
    sectionHdr(`Upcoming firm sales (${up.length})`)+
    (up.length?up.map(saleRow).join(''):`<p style="color:${B.muted};margin:0 0 6px">No firm sales currently scheduled — the pipeline below is what's ahead.</p>`)+
    sectionHdr(`In the pipeline (${data.pipeline.length})`)+
    `<table role="presentation" width="100%">${data.pipeline.slice(0,16).map(pipeRow).join('')}</table>`;
  return { subject:`BLM lease sale digest — ${up.length} upcoming`, html: shell('Weekly BLM Digest','Upcoming BLM Lease Sales', body, `${up.length} upcoming firm sale${up.length===1?'':'s'}, ${data.pipeline.length} in the pipeline`) };
}

async function send(mail){
  if(DRY){ console.log(`  [DRY] would email ${RECIPIENTS.length} (high-priority:${RECIPIENTS.filter(r=>PRIORITY.has(r.toLowerCase())).length}): "${mail.subject}"`); return; }
  const nodemailer=require('nodemailer');
  const t=nodemailer.createTransport({host:'smtp.zoho.com',port:465,secure:true,auth:{user:SENDER,pass:process.env.ZOHO_APP_PASSWORD}});
  const hi=RECIPIENTS.filter(r=>PRIORITY.has(r.toLowerCase()));
  const norm=RECIPIENTS.filter(r=>!PRIORITY.has(r.toLowerCase()));
  const base={from:`"BIC REA LLC" <${SENDER}>`,subject:mail.subject,html:mail.html};
  if(hi.length)   await t.sendMail({...base,to:hi.join(','),priority:'high'});
  if(norm.length) await t.sendMail({...base,to:norm.join(','),priority:'normal'});
  console.log(`  sent: ${mail.subject}  (high-priority:${hi.length}, normal:${norm.length})`);
}

(async()=>{
  const data=await getData();
  if(arg('html-out',null)){ require('fs').writeFileSync(arg('html-out'), digestEmail(data).html); console.log('wrote preview HTML -> '+arg('html-out')); return; }
  const state=loadState();
  const cutoff=new Date(Date.parse(TODAY)-1*864e5).toISOString().slice(0,10);
  const upcoming=data.sale.filter(s=>s.sale_date && s.sale_date>=cutoff);

  let queued=0;
  for(const sale of upcoming){
    const d=daysBetween(TODAY, sale.sale_date);
    for(const ms of MILESTONES){
      const id=`${sale.link}|${ms.key}`;
      if(d>=ms.lo && d<=ms.hi && !state.alerts[id]){
        await send(alertEmail(sale,d)); state.alerts[id]=TODAY; queued++;
      }
    }
  }
  const isMonday=new Date(TODAY+'T00:00:00Z').getUTCDay()===1;
  if(has('digest')||isMonday){ await send(digestEmail(data)); queued++; }

  // write outputs
  if(!DRY){
    fs.mkdirSync(path.dirname(JSON_PATH),{recursive:true});
    fs.writeFileSync(JSON_PATH,JSON.stringify({generated:TODAY,upcoming:data.sale,pipeline:data.pipeline,results:data.result.slice(0,10)},null,2));
  }
  saveState(state);
  console.log(`\n${DRY?'[DRY] ':''}today=${TODAY}  upcoming firm sales=${upcoming.length}  emails ${DRY?'that would send':'sent'}=${queued}`);
})().catch(e=>{console.error('NOTIFY ERROR:',e.message);process.exit(1);});
