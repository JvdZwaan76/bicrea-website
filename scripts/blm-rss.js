#!/usr/bin/env node
'use strict';
/*
 * BLM Oil & Gas Lease Sale tracker — RSS edition.
 * Source: official BLM per-state-office press-release RSS feeds.
 * Buckets each item: firm SALE (dated) | PIPELINE (pre-sale) | RESULT (completed) | excluded.
 * Modes:  node blm-rss.js            fetch live feeds, print
 *         node blm-rss.js <file.xml> parse a saved feed (region from filename or 'Test')
 *         node blm-rss.js --test     assert against test/feed.xml
 */
const fs=require('fs'), path=require('path');

const FEEDS = {
  'National':'https://www.blm.gov/press-release/national-office/rss',
  'Montana-Dakotas':'https://www.blm.gov/press-release/montana-dakotas/rss',
  'Colorado':'https://www.blm.gov/press-release/colorado/rss',
  'New Mexico':'https://www.blm.gov/press-release/new-mexico/rss',
  'Utah':'https://www.blm.gov/press-release/utah/rss',
  'Wyoming':'https://www.blm.gov/press-release/wyoming/rss',
  'Nevada':'https://www.blm.gov/press-release/nevada/rss',
  'Alaska':'https://www.blm.gov/press-release/alaska/rss'
};

// ---- date + state extraction (proven core) ----
const MONTHS={jan:0,january:0,feb:1,february:1,mar:2,march:2,apr:3,april:3,may:4,jun:5,june:5,jul:6,july:6,aug:7,august:7,sep:8,sept:8,september:8,oct:9,october:9,nov:10,november:10,dec:11,december:11};
const DATE_RE=/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2}),?\s+(\d{4})\b/gi;
const SALE_CUES=/(bid opening|lease sale (?:scheduled for|set for|on|will be|held)|hold[^.]*lease sale on|sale scheduled for|auction[^.]*(?:set for|scheduled for|on)|sale held)/i;
const DEADLINE_CUES=/(sealed bids?|bids? (?:by|must be received|due)|receive all sealed)/i;
const DECOY_CUES=/(protest|comment period|scoping|generated|published|closes?|close |ends?|open[^.]*close)/i;
function toISO(mon,d,y){const m=MONTHS[mon.toLowerCase().replace(/\.$/,'')];return m==null?null:new Date(Date.UTC(y,m,d)).toISOString().slice(0,10);}
function extractDates(text){const out=[];let m;DATE_RE.lastIndex=0;while((m=DATE_RE.exec(text))){const iso=toISO(m[1],+m[2],+m[3]);if(!iso)continue;const ctx=text.slice(Math.max(0,m.index-55),m.index).toLowerCase();let role='other';if(DECOY_CUES.test(ctx)&&!SALE_CUES.test(ctx))role='decoy';else if(SALE_CUES.test(ctx))role='sale';else if(DEADLINE_CUES.test(ctx))role='deadline';out.push({iso,role});}return out;}
const STATES=['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Florida','Idaho','Kansas','Louisiana','Michigan','Mississippi','Montana','Nebraska','Nevada','New Mexico','North Dakota','Oklahoma','Oregon','South Dakota','Texas','Utah','Washington','Wyoming'];
function extractStates(t,a){const hay=t+' '+a;const f=new Set();for(const s of STATES)if(new RegExp('\\b'+s+'\\b','i').test(hay))f.add(s);if(/\bDakotas\b/i.test(hay)){f.add('North Dakota');f.add('South Dakota');}if(/coastal plain|arctic national wildlife|NPR-A|national petroleum reserve/i.test(hay))f.add('Alaska');return[...f];}

// ---- RSS parsing ----
function decode(s){return s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#0?39;/g,"'").replace(/&nbsp;/g,' ').replace(/&mdash;/g,'—').replace(/&amp;/g,'&');}
function strip(s){return decode(s).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();}
function parseFeed(xml,region){const items=[];const re=/<item>([\s\S]*?)<\/item>/g;let m;while((m=re.exec(xml))){const b=m[1];const pick=(t)=>{const mm=new RegExp('<'+t+'>([\\s\\S]*?)<\\/'+t+'>').exec(b);return mm?mm[1].trim():'';};items.push({region,title:decode(pick('title')),link:pick('link'),pubDate:pick('pubDate'),text:strip(pick('description'))});}return items;}

// ---- classify ----
function classify(item){
  const t=item.title.toLowerCase(), a=item.text.toLowerCase(), all=t+' '+a;
  const og=/oil and gas (?:lease sale|leases|parcels)|sale of oil and gas leases/.test(all);
  if(!og) return {bucket:'excluded'};
  const dates=extractDates(item.text.length>30?item.text:item.title);
  const sale=(dates.find(d=>d.role==='sale')||{}).iso||null;
  const deadline=(dates.find(d=>d.role==='deadline')||{}).iso||null;
  const states=extractStates(item.title,item.text);
  if(/generate[ds]|total receipts|leased \d+ parcels/.test(all) && !/scheduled for|will hold/.test(all))
    return {bucket:'result', sale_date:sale, states};
  if(sale && /(scheduled for|will hold[^.]*sale on|lease sale (?:on|held)|bid opening)/.test(all))
    return {bucket:'sale', sale_date:sale, bid_deadline:deadline, states};
  if(/seeks?\s+(?:initial\s+)?input|comment period|scoping|may be included|opened a 30-day|plans to include/.test(all))
    return {bucket:'pipeline', states};
  return {bucket: sale?'sale':'review', sale_date:sale, states};
}


// collapse near-duplicate pipeline items (same states + same target sale month/year)
function saleMonthYear(t){ const m=/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i.exec(t); return m?(m[1].toLowerCase()+' '+m[2]):null; }
function dedupePipeline(items){
  const seen=new Map();
  for(const it of items){
    const my=saleMonthYear(it.title+' '+it.text);
    const key=it.states.slice().sort().join('|')+'::'+(my||it.title.toLowerCase());
    const adv=t=>/seeks?\s+input/i.test(t)&&!/initial/i.test(t);   // "seeks input" (comment stage) beats "initial input" (scoping)
    const prev=seen.get(key);
    if(!prev||(adv(it.title)&&!adv(prev.title))) seen.set(key,it);
  }
  return [...seen.values()];
}

function run(items){const out={sale:[],pipeline:[],result:[],review:[],excluded:[]};for(const it of items){const c=classify(it);out[c.bucket].push({...it,...c});}out.sale.sort((x,y)=>(x.sale_date||'').localeCompare(y.sale_date||''));out.pipeline=dedupePipeline(out.pipeline);return out;}

async function fetchLive(){const all=[];for(const [region,url] of Object.entries(FEEDS)){try{const r=await fetch(url,{headers:{'user-agent':'BICREA-BLM-tracker'}});if(!r.ok){console.error('  feed '+region+' -> '+r.status);continue;}all.push(...parseFeed(await r.text(),region));}catch(e){console.error('  feed '+region+' error: '+e.message);}}return all;}

if(require.main===module){(async()=>{
  if(process.argv.includes('--test')){
    const xml=fs.readFileSync(path.join(__dirname,'../test/feed.xml'),'utf8');
    const items=parseFeed(xml,'Montana-Dakotas'); const r=run(items);
    const ok=(c,n)=>{const got=r[c].length; const pass=got===n; console.log(`  ${pass?'✓':'✗'} ${c.padEnd(9)} ${got} (expected ${n})`); return pass;};
    console.log('bucket counts:');
    let all=ok('sale',1)&ok('pipeline',1)&ok('result',1)&ok('excluded',1)&ok('review',0);
    const s=r.sale[0];
    const saleOK = s && s.sale_date==='2026-07-14' && s.states.join(',')==='Montana,North Dakota' && s.bid_deadline===null;
    console.log(`  ${saleOK?'✓':'✗'} firm sale parsed: date=${s&&s.sale_date} states=[${s&&s.states.join(', ')}]`);
    console.log(`  pipeline: ${r.pipeline[0]&&r.pipeline[0].title.slice(0,55)}`);
    console.log(`  result:   ${r.result[0]&&r.result[0].title.slice(0,55)}`);
    console.log(`  excluded: ${r.excluded[0]&&r.excluded[0].title.slice(0,55)}`);
    process.exit(all&&saleOK?0:1);
  }
  const arg=process.argv[2];
  const items = arg ? parseFeed(fs.readFileSync(path.resolve(arg),'utf8'), 'File') : await fetchLive();
  const r=run(items);
  const cutoff=new Date(Date.now()-45*864e5).toISOString().slice(0,10);
  const upcoming=r.sale.filter(s=>s.sale_date>=cutoff);
  console.log(`\n=== FIRM UPCOMING/RECENT SALES (${upcoming.length}) ===`);
  for(const s of upcoming) console.log(`  ${s.sale_date}  [${s.states.join(', ')||'?'}]  ${s.title}`);
  console.log(`\n=== PIPELINE / PRE-SALE (${r.pipeline.length}) ===`);
  for(const s of r.pipeline.slice(0,8)) console.log(`  ${s.states.join(', ')||'?'}: ${s.title}`);
  console.log(`\n=== RECENT RESULTS (${r.result.length}) ===`);
  for(const s of r.result.slice(0,5)) console.log(`  ${s.title}`);
  console.log(`\n(review:${r.review.length}  excluded non-sales:${r.excluded.length}  total items:${items.length})`);
})().catch(e=>{console.error('ERROR:',e.message);process.exit(1);});}
module.exports={parseFeed,classify,run,FEEDS};
