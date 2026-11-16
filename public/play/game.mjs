import missions from './missions.mjs';
import forest from './forest.mjs';
export const catalog = missions;
export const levels = forest;
export const sources = ['ai','family','observe','photo'];
const dayBefore = date => new Date(Date.parse(date+'T00:00:00Z')-86400000).toISOString().slice(0,10);
const clamp = (value,min,max) => Number.isFinite(value) ? Math.max(min,Math.min(max,Math.trunc(value))) : min;
const fail = (key,message) => { throw Object.assign(new Error(message),{key}); };
export const create = () => ({
  stars:0, earned:0, visit:null, streak:0, usage:{}, completed:[], badges:[], cards:[], logs:[],
  pending:[], receipts:[], rewards:[], drafts:[], custom:[], active:null,
  forest:{level:0,chain:0,count:0,discussion:false,lastType:null},
  settings:{language:'both',minutes:30,base_url:'',model:'',vision_model:'',prompt:''}
});
export const getCatalog = s => [...catalog.filter(m=>!s.custom.some(c=>c.id===m.id)),...s.custom];
export const available = s => getCatalog(s).filter(m=>!s.completed.includes(m.id) &&
  !s.pending.some(p=>p.kind==='mission'&&p.mission===m.id) &&
  m.unlock_requires.every(id=>s.completed.includes(id)));
export function recommendation(s) {
  const target = clamp(1+Math.floor((s.completed.length+s.receipts.filter(r=>r.kind==='mission'&&r.stars===3).length)/3),1,3);
  return available(s).sort((a,b)=>Math.abs(a.difficulty-target)-Math.abs(b.difficulty-target))[0];
}
export function questionType(text) {
  if (/如果|假如|要是|what if|suppose/i.test(text)) return 'if';
  if (/真的吗|真的么|真的是|确定吗|不一定|really|are you sure|is that true/i.test(text)) return 'doubt';
  if (/为什么|为啥|\bwhy\b/i.test(text)) return 'why';
  if (/怎么|如何|怎样|\bhow\b/i.test(text)) return 'how';
  return 'what';
}
const add = (s,n) => {s.stars+=n;s.earned+=n;};
const badge = (s,id) => {if (!s.badges.includes(id)) s.badges.push(id);};
export const locked = (s,date) => (s.usage[date]||0)>=s.settings.minutes*60;
export const adminActions = ['approve','reject','settings','reward','deleteReward','saveMission','draft','reviewDraft'];
const includesInput = a => typeof a.input==='string'&&a.input.trim().length>0;
export function apply(s,a,date) {
  const e=a.evaluation||{};
  const mission=s.active&&getCatalog(s).find(m=>m.id===s.active.id);
  const step=s.active?.step;
  if (locked(s,date)&&!['time',...adminActions].includes(a.kind)) fail('locked','Daily time is up');
  if (['ask','evaluate','card'].includes(a.kind)&&!includesInput(a)&&!a.image) fail('input','Add a voice answer, text, or photo');
  switch(a.kind) {
    case 'hint':
    case 'speech': break;
    case 'visit':
      if(s.visit===date) break;
      s.streak=s.visit===dayBefore(date)?s.streak+1:1;
      s.visit=date;
      add(s,1+(s.streak%7===0?5:0));
      break;
    case 'time':
      s.usage[date]=(s.usage[date]||0)+clamp(a.seconds,0,1800);
      break;
    case 'ask': {
      const type=e.type||questionType(a.input||'');
      const f=s.forest;
      f.count++;
      f.chain=e.followup===true?f.chain+1:0;
      const checks={first:true,why:type==='why',follow3:f.chain>=3,if:type==='if',doubtReason:type==='doubt'&&e.reason===true,compareReason:e.compare===true&&e.reason===true};
      if(!e.safety_flag&&checks[forest[f.level]?.check]===true) f.level++;
      f.discussion=!!e.discussion;
      f.lastType=type;
      if(!e.safety_flag){add(s,clamp(e.stars,1,3));badge(s,type);}
      break;
    }
    case 'start':
      if(s.active||!available(s).some(m=>m.id===a.id)) fail('mission','This mission is unavailable');
      s.active={id:a.id,step:1,plans:0,cards:0,attempt:crypto.randomUUID()};
      break;
    case 'card':
      if(step!==2||!sources.includes(a.source)||s.active.cards>=2) fail('card','Choose an information source');
      if(a.source==='photo'&&!a.image) fail('photo','Add a photo');
      s.cards.push({id:crypto.randomUUID(),mission:mission.id,source:a.source,input:a.input||'',image:a.image||null,date});
      s.active.cards++;
      add(s,1);
      if(s.active.cards===2) s.active.step=3;
      break;
    case 'evaluate':
      if(!mission||![1,3,4].includes(step)) fail('step','This step is unavailable');
      if(step===1&&e.stars>0&&!e.safety_flag) {add(s,1);s.active.step=2;}
      if(step===3&&e.stars>0&&!e.safety_flag&&s.active.plans<2) {
        add(s,clamp(e.stars,1,3));
        s.active.plans++;
        if(s.active.plans===2) s.active.step=4;
      }
      if(step===4) {
        if(!a.image||!includesInput(a)) fail('photo','Add a result photo and reflection');
        if(e.stars>0&&!e.safety_flag){
          add(s,clamp(e.stars,1,3));
          s.pending.push({id:crypto.randomUUID(),kind:'mission',mission:mission.id,stars:clamp(e.bigStars??e.stars,1,3),date});
          s.active=null;
        }
      }
      break;
    case 'advance':
      if(step!==3||!s.active.plans) fail('step','Share a plan first');
      s.active.step=4;
      break;
    case 'redeem': {
      const r=s.rewards.find(r=>r.id===a.id);
      if(!r||s.stars<r.cost||s.pending.some(p=>p.kind==='reward'&&p.reward===r.id)) fail('reward','This reward cannot be requested');
      s.pending.push({id:crypto.randomUUID(),kind:'reward',reward:r.id,name:r.name,cost:r.cost,date});
      break;
    }
    case 'approve':
    case 'reject': {
      const i=s.pending.findIndex(p=>p.id===a.id);
      if(i<0) fail('pending','This request has already been reviewed');
      const p=s.pending[i];
      if(a.kind==='reject'&&p.kind==='mission') fail('pending','Mission completion is awaiting confirmation');
      if(a.kind==='approve'&&p.kind==='mission'){
        add(s,p.stars);s.completed.push(p.mission);badge(s,p.mission);
      }
      if(a.kind==='approve'&&p.kind==='reward'){
        if(s.stars<p.cost) fail('reward','There are not enough stars');
        s.stars-=p.cost;
      }
      s.pending.splice(i,1);
      s.receipts.push({...p,status:a.kind==='approve'?'approved':'rejected',reviewDate:date});
      break;
    }
    case 'language':
      if(!['zh','en','both'].includes(a.language)) fail('settings','Unknown language');
      s.settings.language=a.language;
      break;
    case 'settings':
      s.settings={...s.settings,...a.settings};
      break;
    case 'reward':
      s.rewards=[...s.rewards.filter(r=>r.id!==a.reward.id),a.reward];
      break;
    case 'deleteReward':
      s.rewards=s.rewards.filter(r=>r.id!==a.id);
      break;
    case 'saveMission':
      s.custom=[...s.custom.filter(m=>m.id!==a.mission.id),a.mission];
      break;
    case 'draft':
      s.drafts.push(a.mission);
      break;
    case 'reviewDraft': {
      const m=s.drafts.find(d=>d.id===a.id);
      if(!m) fail('mission','Draft is unavailable');
      if(a.accept) apply(s,{kind:'saveMission',mission:m},date);
      s.drafts=s.drafts.filter(d=>d.id!==a.id);
      break;
    }
    default: fail('action','Unknown action');
  }
  if(['ask','evaluate','card','hint','speech'].includes(a.kind)) {
    s.logs.push({id:crypto.randomUUID(),date,kind:a.kind,input:a.input||'',guess:a.guess||'',image:a.image||null,guessImage:a.guessImage||null,audio:a.audio||null,source:a.source||null,mission:mission?.id||null,step,evaluation:e});
  }
  return s;
}
export function summary(s,date){
  const logs=s.logs.filter(l=>l.date===date);
  const asks=logs.filter(l=>l.kind==='ask');
  const types={};
  for(const q of asks) {const k=q.evaluation.type||questionType(q.input);types[k]=(types[k]||0)+1;}
  return {date,questions:asks.map(l=>l.input||'📷'),interests:[...new Set(asks.flatMap(l=>l.evaluation.interests||[]))],types,safety_flag:logs.some(l=>l.evaluation.safety_flag),minutes:Math.floor((s.usage[date]||0)/60)};
}
