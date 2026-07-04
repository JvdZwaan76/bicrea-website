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

function alertEmail(sale, days){
  const subject=`BLM lease sale in ${days} day${days===1?'':'s'}: ${sale.states.join(', ')} — ${fmt(sale.sale_date)}`;
  const html=`<div style="font-family:Georgia,serif;color:#1a1a1a;max-width:560px">
    <p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#8a6d1a;margin:0 0 6px">BIC REA LLC · BLM Lease Sale Alert</p>
    <h2 style="margin:0 0 4px">${sale.states.join(', ')} — sale in ${days} day${days===1?'':'s'}</h2>
    <p style="font-size:16px;margin:2px 0"><strong>${fmt(sale.sale_date)}</strong></p>
    ${sale.bid_deadline?`<p style="margin:2px 0;color:#555">Sealed-bid deadline: ${fmt(sale.bid_deadline)}</p>`:''}
    <p style="margin:12px 0 4px">${sale.title}</p>
    <p style="margin:4px 0"><a href="${sale.link}">Read the BLM notice →</a></p>
    <hr style="border:none;border-top:1px solid #ddd;margin:16px 0">
    <p style="font-size:12px;color:#888">Automated from official BLM press-release feeds. Verify details on the linked notice before acting.</p>
  </div>`;
  return {subject,html};
}
function digestEmail(data){
  const cutoff=new Date(Date.parse(TODAY)-2*864e5).toISOString().slice(0,10);
  const up=data.sale.filter(s=>s.sale_date>=cutoff);
  const row=s=>`<li style="margin:4px 0"><strong>${fmt(s.sale_date)}</strong> — ${s.states.join(', ')} <a href="${s.link}">(notice)</a></li>`;
  const pipe=p=>`<li style="margin:3px 0;color:#555">${p.states.join(', ')||'—'}: ${p.title}</li>`;
  return {subject:`BLM lease sale digest — ${up.length} upcoming`,
    html:`<div style="font-family:Georgia,serif;color:#1a1a1a;max-width:600px">
      <p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#8a6d1a">BIC REA LLC · Weekly BLM Digest</p>
      <h3 style="margin:8px 0">Upcoming firm sales (${up.length})</h3><ul>${up.map(row).join('')||'<li>None scheduled</li>'}</ul>
      <h3 style="margin:14px 0 6px">In the pipeline (${data.pipeline.length})</h3><ul>${data.pipeline.slice(0,12).map(pipe).join('')}</ul>
      <hr style="border:none;border-top:1px solid #ddd;margin:16px 0">
      <p style="font-size:12px;color:#888">Automated from official BLM feeds. bicrea.com</p></div>`};
}

async function send(mail){
  if(DRY){ console.log(`  [DRY] would email ${RECIPIENTS.length} recipients: "${mail.subject}"`); return; }
  const nodemailer=require('nodemailer');
  const t=nodemailer.createTransport({host:'smtp.zoho.com',port:465,secure:true,auth:{user:SENDER,pass:process.env.ZOHO_APP_PASSWORD}});
  await t.sendMail({from:`"BIC REA LLC" <${SENDER}>`,to:RECIPIENTS.join(','),subject:mail.subject,html:mail.html});
  console.log(`  sent: ${mail.subject}`);
}

(async()=>{
  const data=await getData();
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
