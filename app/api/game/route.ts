import {createHmac,createHash,timingSafeEqual} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {NextRequest,NextResponse} from 'next/server';
import {create,apply,getCatalog,locked,summary,adminActions} from '../../../public/play/game.mjs';
import {endpoint,evaluation,model} from './model';

const globalDb=globalThis as typeof globalThis & {futureDb?:PrismaClient};
const db=globalDb.futureDb??=new PrismaClient();
const asDate=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:process.env.APP_TIMEZONE||'Asia/Nicosia',year:'numeric',month:'2-digit',day:'2-digit'}).format();
const text=(v:unknown,max=4000)=>typeof v==='string'?v.trim().slice(0,max):'';
const secret=()=>process.env.APP_SECRET||'';
const hash=(a:string)=>createHash('sha256').update(a).digest();
const sign=(a:string)=>createHmac('sha256',secret()).update(a).digest('hex');
const parent=(r:NextRequest)=>{
  const [until,sig]=r.cookies.get('future-parent')?.value.split('.')||[];
  return secret().length>=32&&!!until&&!!sig&&Number(until)>Date.now()&&timingSafeEqual(hash(sig),hash(sign(until)));
};
const initial=create();
type Log={id:string;kind:string;input:string;guess?:string;mission:string|null;step?:number;image?:string|null;guessImage?:string|null;source?:string;date:string;evaluation:Record<string,unknown>};
type State=Omit<typeof initial,'active'|'logs'|'drafts'> & {
  active:null|{id:string;step:number;plans:number;cards:number;attempt:string};
  logs:Log[];
  drafts:Array<Record<string,unknown>&{id:string}>;
};
const info=(s:State,r:NextRequest,date:string,admin=parent(r))=>{
  const {logs,drafts,receipts,settings,...child}=s;
  return {state:{...child,settings:admin?settings:{language:settings.language,minutes:settings.minutes},receipts:receipts.filter((x:{kind:string})=>admin||x.kind==='mission'),...(admin?{logs,drafts}:{} )},
    date,admin,locked:locked(s,date),speechFallback:process.env.WEB_SPEECH_FALLBACK==='1',
    ...(admin?{summaries:[...new Set([date,...Object.keys(s.usage),...logs.map((l:{date:string})=>l.date)])].sort().reverse().map(d=>summary(s,d))}:{})};
};
const json=(x:unknown,status=200)=>NextResponse.json(x,{status,headers:{'Cache-Control':'no-store'}});
const record=()=>db.game.upsert({where:{id:1},update:{},create:{id:1,snapshot:JSON.stringify(initial)}});
export async function GET(r:NextRequest){
  try{return json(info(JSON.parse((await record()).snapshot),r,asDate()));}
  catch{return json({error:'Database unavailable. Run npm run db:setup.'},503);}
}
let failures=0;
let retryAt=0;
const shape=['understand_check','info_hints','plan_rubric','result_rubric','reflection_prompts'] as const;
function mission(v:Record<string,unknown>){
  if(!v||typeof v!=='object') throw new Error('Add mission details');
  const id=text(v.id,64);
  if(!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error('Mission ID must use lowercase letters, digits and hyphens');
  const result:Record<string,unknown>={id,difficulty:Number(v.difficulty),est_minutes:Number(v.est_minutes),
    unlock_requires:Array.isArray(v.unlock_requires)?[...new Set(v.unlock_requires.map(x=>text(x,64)).filter(Boolean))]:[]};
  if(![1,2,3].includes(Number(result.difficulty))||!Number.isInteger(result.est_minutes)||Number(result.est_minutes)<1||Number(result.est_minutes)>120) throw new Error('Check difficulty and minutes');
  for(const k of ['title_zh','title_en','brief_zh','brief_en']){
    result[k]=text(v[k],k.startsWith('title')?100:1200);
    if(!result[k]) throw new Error('Fill both languages');
  }
  for(const k of shape){
    const group=v[k] as Record<string,unknown>;
    const list=(language:string)=>Array.isArray(group?.[language])?(group[language] as unknown[]).slice(0,12).map(x=>text(x,500)).filter(Boolean):[];
    const zh=list('zh'),en=list('en');
    if(!zh.length||!en.length) throw new Error('Fill both languages for '+k);
    result[k]={zh,en};
  }
  return result;
}
const image=(v:unknown)=>typeof v==='string'&&v.length<2_000_000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v)?v:null;
const audio=(v:unknown)=>typeof v==='string'&&v.length<8_000_000&&/^data:audio\/(webm|mp4|wav|ogg|mpeg);base64,[A-Za-z0-9+/=]+$/.test(v)?v:null;
const rubric=(s:State)=>getCatalog(s).find((m:{id:string})=>m.id===s.active?.id);
const required='Return {stars,praise,one_question_or_suggestion,safety_flag}. Set safety_flag to a boolean.';
function unsafe(input:string){
  return /火|电|刀|药|插座|打火机|\b(fire|electricity|electrical|outlet|knives|knife|medicine|medication|pills|lighter)\b/i.test(input);
}
function safety(lang:string){
  return {stars:0,praise:lang==='zh'?'这要找大人。':lang==='en'?'Find a grown-up for this.':'这要找大人。\nFind a grown-up for this.',one_question_or_suggestion:'',safety_flag:true};
}
export async function POST(r:NextRequest){
  if(r.headers.get('sec-fetch-site')==='cross-site'||r.headers.get('sec-fetch-site')==='same-site') return json({error:'Cross-origin request'},403);
  try {
    const date=asDate();
    const len=Number(r.headers.get('content-length')||0);
    if(len>11_000_000) return json({error:'Attachment is too large'},413);
    const raw=await r.text();
    if(raw.length>11_000_000) return json({error:'Attachment is too large'},413);
    const b=JSON.parse(raw);
    const kind=text(b.kind,40);
    if(kind==='login'){
      if(Date.now()<retryAt) return json({error:'Try again in one minute'},429);
      const pin=process.env.APP_PIN||'';
      if(!/^\d{4,12}$/.test(pin)||secret().length<32) return json({error:'Set APP_PIN and APP_SECRET on Mac Studio'},503);
      if(!timingSafeEqual(hash(pin),hash(text(b.pin,20)))){
        if(++failures>=5){retryAt=Date.now()+60_000;failures=0;}
        return json({error:'PIN is incorrect'},401);
      }
      failures=0;
      const until=String(Date.now()+30*60_000);
      const response=json(info(JSON.parse((await record()).snapshot),r,date,true));
      response.cookies.set('future-parent',until+'.'+sign(until),{httpOnly:true,sameSite:'strict',secure:r.nextUrl.protocol==='https:'||r.headers.get('x-forwarded-proto')==='https',path:'/api/game',maxAge:1800});
      return response;
    }
    if(kind==='logout'){
      const response=json(info(JSON.parse((await record()).snapshot),r,date,false));
      response.cookies.set('future-parent','',{path:'/api/game',maxAge:0});
      return response;
    }
    if(adminActions.includes(kind)&&!parent(r)) return json({error:'Parent PIN required'},403);
    const row=await record();
    const s=JSON.parse(row.snapshot) as State;
    if(locked(s,date)&&!['time',...adminActions].includes(kind)) return json({error:'Daily time is up',key:'locked'},423);
    const a:Record<string,unknown>={kind,id:text(b.id,128),input:text(b.input),guess:text(b.guess),image:image(b.image),guessImage:image(b.guessImage),audio:audio(b.audio),source:text(b.source,20),language:b.language,accept:b.accept===true};
    let reply;
    if(kind==='time') a.seconds=Math.max(0,Math.min(20,Number(b.seconds)||0));
    if(kind==='settings'){
      const v=b.settings||{};
      const base_url=text(v.base_url,300);
      if(base_url) endpoint(base_url);
      if(!Number.isInteger(v.minutes)||v.minutes<1||v.minutes>240||!['zh','en','both'].includes(v.language)) throw new Error('Check language and daily minutes');
      a.settings={base_url,language:v.language,minutes:v.minutes,model:text(v.model,120),vision_model:text(v.vision_model,120),prompt:text(v.prompt,3500)};
    }
    if(kind==='reward'){
      const reward=b.reward||{};
      if(!text(reward.name,100)||!Number.isInteger(reward.cost)||reward.cost<1||reward.cost>9999) throw new Error('Add a reward name and star cost');
      a.reward={id:text(reward.id,128)||crypto.randomUUID(),name:text(reward.name,100),image:image(reward.image),cost:reward.cost};
    }
    if(kind==='saveMission'||kind==='reviewDraft'){
      const m=kind==='saveMission'?mission(b.mission):s.drafts.find((d:{id:string})=>d.id===a.id);
      if(m&&(kind==='saveMission'||a.accept)){
        const graph=new Map(getCatalog(s).map((item:{id:string;unlock_requires:string[]})=>[item.id,item.unlock_requires] as const));
        graph.set(String(m.id),m.unlock_requires as string[]);
        function check(id:string,seen:Set<string>){
          if(seen.has(id)||!graph.has(id)) throw new Error('Mission prerequisites must exist and cannot form a cycle');
          for(const dep of graph.get(id)||[]) check(dep,new Set([...seen,id]));
        }
        check(String(m.id),new Set());
        a.mission=m;
      }
    }
    if(kind==='draft'){
      const result=await model(s.settings,'Create one safe home mission for a 5-year-old based on the theme. Output these keys: id (lowercase hyphens), title_zh, title_en, brief_zh, brief_en, difficulty 1-3, unlock_requires empty array, understand_check, info_hints, plan_rubric, result_rubric, reflection_prompts (each an object with zh/en arrays of short strings), est_minutes integer.',{theme:a.input});
      a.mission=mission({...result,id:'mission-'+crypto.randomUUID().slice(0,8),unlock_requires:[]});
    }
    if(kind==='speech'){
      if(!a.audio) throw new Error('Recording format is unavailable');
      try{
        const [header,data]=String(a.audio).split(',');
        const form=new FormData();
        const mime=header.slice(5,-7);
        form.set('file',new Blob([new Uint8Array(Buffer.from(data,'base64'))],{type:mime}),'recording.'+mime.split('/')[1]);
        form.set('response_format','json');
        form.set('language',s.settings.language==='both'?'auto':s.settings.language);
        const resp=await fetch(endpoint(process.env.WHISPER_URL||'http://127.0.0.1:8080/inference'),{method:'POST',body:form,redirect:'error',signal:AbortSignal.timeout(25000)});
        if(!resp.ok) throw new Error();
        a.input=text((await resp.json()).text);
        if(!a.input) throw new Error();
        reply={transcript:a.input};
      }catch{reply={transcript:'',speechUnavailable:true};}
      if(unsafe(String(a.input))) a.evaluation=safety(s.settings.language);
    }
    if(['ask','hint','evaluate'].includes(kind)){
      if(kind!=='hint'&&!a.input&&!a.image) throw new Error('Add voice, text or a photo');
      if(kind==='evaluate'&&(!s.active||![1,3,4].includes(s.active.step))) throw new Error('Start the correct mission step');
      if(kind==='evaluate'&&s.active?.step===4&&(!a.image||!a.input)) throw new Error('Add a result photo and reflection');
      try {
      if(unsafe(String(a.input)+' '+String(a.guess))) reply=safety(s.settings.language);
      else if(kind==='ask'){
        const recent=s.logs.filter((l:{kind:string})=>l.kind==='ask').slice(-6).map((l:{input:string;evaluation:unknown})=>({question:l.input,reply:l.evaluation}));
        const discussion=(s.forest.count+1)%3===0&&!s.forest.discussion;
        const raw=await model(s.settings,required+
          ' Also return {answer,try_it,type,followup,reason,compare,interests}. Type is what/why/how/if/doubt. Award 1–3 stars for curiosity and reasoning. Answer briefly with a safe at-home observation. A followup explicitly builds on the most recent question. Reason means the child gave an actual explanation. Compare means the child picked one of the previously offered ideas. If offerChoices=true, present two plausible explanations or predictions in answer and ask which, why, and how to check in one_question_or_suggestion. Do not invent a scientific controversy. Accurately say you are a computer program if asked.',{question:a.input,childGuess:a.guess,recent,offerChoices:discussion,previousDiscussion:s.forest.discussion},[a.image,a.guessImage].filter(Boolean).map(String));
        reply={...evaluation(raw),discussion,compare:s.forest.discussion&&raw.compare===true};
      } else {
        const m=rubric(s);
        if(!m) throw new Error('Start a mission first');
        const step=s.active?.step;
        if(kind==='hint'){
          if(step!==2) throw new Error('Information cards are unavailable');
          reply=evaluation(await model(s.settings,required+' Provide one mission-relevant clue in praise and one question. Leave stars at zero.',{hints:m.info_hints,title:m.title_en,question:a.input},a.image?String(a.image):undefined));
        }else{
          const criteria=step===1?m.understand_check:step===3?m.plan_rubric:m.result_rubric;
          const previous=step===3&&s.active?.plans?s.logs.filter(l=>l.mission===m.id&&l.step===3&&l.kind==='evaluate'&&Number(l.evaluation.stars)>0).at(-1):undefined;
          const evidence={activity:m.title_en,step,criteria,response:a.input,priorPlan:previous?.input,reflectionPrompts:step===4?m.reflection_prompts:undefined,
            imageOrder:[a.image?'current work':null,previous?.image?'previous plan':null].filter(Boolean)};
          const first=evaluation(await model(s.settings,required+' Score using only criteria and evidence. Step 1: award 1 only if child restates the core goal, otherwise 0 and rephrase the task. Step 3: 0 for missing evidence, otherwise 1–3, praise one concrete detail and ask one improvement question; if a prior plan exists award 0 when the submitted plan repeats it without any improvement. Step 4: 0 if evidence or meaningful reflection is missing, otherwise 1–3 for reflection grounded in the result. An unsuccessful experiment can earn credit.',evidence,[a.image,previous?.image].filter(Boolean).map(String)));
          if(step===4&&first.stars>0&&!first.safety_flag){
            const big=evaluation(await model(s.settings,required+' Give 1–3 completion stars based only on the result criteria and evidence. Judge the observed outcome and effort without requiring a successful experiment. Report safety concerns.',evidence,String(a.image)));
            reply={...first,bigStars:big.stars,safety_flag:big.safety_flag||first.safety_flag};
          }else reply=first;
        }
      }
      if(reply?.safety_flag) reply=safety(s.settings.language);
      a.evaluation=reply;
      }catch{
        const zh='小星暂时连不上。请大人看看本地模型，再试一次。';
        const en='Little Star cannot connect. Ask a grown-up to check the local model, then try again.';
        const praise=s.settings.language==='zh'?zh:s.settings.language==='en'?en:zh+'\n'+en;
        s.logs.push({id:crypto.randomUUID(),date,kind,input:String(a.input),mission:s.active?.id||null,step:s.active?.step,
          guess:text(a.guess),image:image(a.image),guessImage:image(a.guessImage),source:text(a.source,20),
          evaluation:{stars:0,praise,one_question_or_suggestion:'',safety_flag:false,unavailable:true}});
        await db.game.updateMany({where:{id:1,revision:row.revision},data:{revision:{increment:1},snapshot:JSON.stringify(s)}});
        return json({error:praise},503);
      }
    }
    if(kind==='card'&&unsafe(String(a.input))) a.evaluation=safety(s.settings.language);
    apply(s,a,date);
    const saved=await db.game.updateMany({where:{id:1,revision:row.revision},data:{revision:{increment:1},snapshot:JSON.stringify(s)}});
    if(!saved.count) return json({error:'Game changed on another screen. Refresh and try again.',key:'conflict'},409);
    return json({...info(s,r,date),reply});
  }catch(e){
    const error=e as Error&{key?:string};
    const rawError=error.message||'Game service unavailable';
    const message=/prisma|invocation|sqlite|DATABASE_URL/i.test(rawError)?'Database unavailable. Run npm run db:setup.':rawError.slice(0,170);
    return json({error:message,key:error.key},400);
  }
}
