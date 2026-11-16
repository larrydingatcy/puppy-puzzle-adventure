import demoMode from './mode.mjs';
import {demo} from './demo.mjs';
import {catalog,levels,getCatalog,available,recommendation} from './game.mjs';
import {parentView,adminAction,adminSubmit} from './parent.mjs';
const app=document.querySelector('#app');
const $=id=>document.getElementById(id);
const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let data,s,view='home',mood='happy',busy=false,reply='',phase='',source='',photo='',transcript='',askDraft=null,noticeTimer,audioContext,recording,micToken=0,holding=false;
let queued=0,spokenLock='',lastTime=performance.now();
const langs=['zh','en','both'];
const types={what:['🧩','是什么','What'],why:['🔍','为什么','Why'],how:['🛠','怎么做','How'],if:['💭','如果','What if'],doubt:['🤔','真的吗','Really?']};
const sources={ai:['✦','问小星','Ask Little Star'],family:['👪','问家人','Ask family'],observe:['👀','观察','Observe'],photo:['📷','拍照','Photo']};
const icons=['🌱','♻️','🛍️','🥣','🌉','🎒'];
const stepNames=[['👂','说说任务','Tell me the mission'],['🔎','找两条线索','Find two clues'],['🖍️','分享计划','Share a plan'],['🏁','完成与反思','Finish and reflect']];
const lang=()=>s?.settings.language||'both';
const t=(zh,en)=>lang()==='zh'?zh:lang()==='en'?en:zh+'\n'+en;
const one=(zh,en)=>lang()==='en'?en:zh;
const lines=(zh,en)=>lang()==='both'?esc(zh)+'<span class="block">'+esc(en)+'</span>':esc(t(zh,en));
const missionText=(m,key)=>t(m?.[key+'_zh']||'',m?.[key+'_en']||'');
const icon=m=>icons[catalog.findIndex(i=>i.id===m?.id)]||'🧭';
const title=m=>missionText(m,'title');
const read=text=>{
  if(!window.speechSynthesis||!text) return;
  speechSynthesis.cancel();
  for(const part of String(text).split('\n').filter(Boolean)){
    const utter=new SpeechSynthesisUtterance(part);
    utter.lang=/[\p{Script=Han}]/u.test(part)?'zh-CN':'en-US';
    const voices=speechSynthesis.getVoices();
    const voice=voices.find(v=>v.localService&&v.lang===utter.lang)||voices.find(v=>v.localService&&v.lang.startsWith(utter.lang.slice(0,2)));
    if(voice) utter.voice=voice;
    else if(!demoMode) continue;
    utter.rate=.86;
    speechSynthesis.speak(utter);
  }
};
const notify=(message,say=false)=>{ $('notice').textContent=message;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').textContent='',4200);if(say)read(message); };
const readBtn=(message,label='🔊')=>`<button class="small" data-action="read" data-value="${esc(message)}" aria-label="${esc(t('朗读','Read aloud'))}">${label}</button>`;
const button=(action,label,value='',css='small',disabled=false)=>`<button class="${css}" data-action="${action}" data-value="${esc(value)}"${disabled?' disabled':''}>${label}</button>`;
const photoTag=data=>data?`<img class="attachment" src="${esc(data)}" alt="${esc(t('照片','Photo'))}">`:'';
const mascot=()=>`<div class="mascot ${mood}" aria-hidden="true"><div class="halo"></div><span class="spark">✧</span><span class="spark alt">✦</span><div class="star-body"><div class="face"><i class="eye"></i><i class="eye"></i><b></b></div></div></div>`;
function sound(){
  try{
    const C=window.AudioContext||window.webkitAudioContext;
    if(C){audioContext??=new C();audioContext.resume().catch(()=>{});}
  }catch{}
}
function celebrate(n,big=false){
  if(!n)return;
  document.querySelector('.mascot')?.classList.add('clap');
  $('burst').innerHTML=`<span>${big?'✨ ':''}+${n} ★</span>`;
  setTimeout(()=>$('burst').replaceChildren(),1250);
  sound();
  try{
    [523,659,784,...(big?[1046]:[])].forEach((frequency,i)=>{
      const now=audioContext.currentTime+i*.11,osc=audioContext.createOscillator(),gain=audioContext.createGain();
      osc.frequency.value=frequency;gain.gain.setValueAtTime(.07,now);
      gain.gain.exponentialRampToValueAtTime(.001,now+.19);
      osc.connect(gain).connect(audioContext.destination);osc.start(now);osc.stop(now+.2);
    });
  }catch{}
}
async function request(action){
  if(demoMode) return demo(action);
  const response=await fetch('../api/game',action?{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(action)}:{cache:'no-store'});
  const result=await response.json();
  if(!response.ok) throw Object.assign(new Error(result.error),{key:result.key,status:response.status});
  return result;
}
function update(value){data=value;s=value.state;}
function clearInput(){photo='';transcript='';source='';askDraft=null;phase='';}
function go(next,spoken){
  clearInput();reply='';mood='happy';view=next;window.speechSynthesis?.cancel();render();
  if(spoken) read(spoken);
}
function thinking(on){
  busy=on;
  const banner=$('thinking');
  if(banner){banner.hidden=!on;banner.textContent=t('小星在想…','Little Star is thinking…');}
  document.querySelector('.mascot')?.classList.toggle('think',on);
  app.setAttribute('aria-busy',String(on));
  for(const el of app.querySelectorAll('[data-action],#mic,form button')){
    if(on&&!el.disabled){el.disabled=true;el.dataset.wasEnabled='1';}
    else if(!on&&el.dataset.wasEnabled){el.disabled=false;delete el.dataset.wasEnabled;}
  }
}
async function act(action,{speak=true,keepInput=false,renderResult=true}={}){
  const before=s?.stars||0;
  if(busy||ticking) return null;
  sound();thinking(true);
  try{
    const value=await request(action);
    update(value);
    const r=value.reply;
    if(r&&action.kind!=='speech'){
      reply=[r.praise,r.answer,r.try_it,r.one_question_or_suggestion].filter(Boolean).join('\n');
      mood=r.safety_flag||r.discussion?'surprise':'happy';
      if(action.kind==='ask'&&r.type) reply=types[r.type][0]+' '+t(...types[r.type].slice(1))+'\n'+reply;
    }
    const gain=s.stars-before;
    if(gain>0&&!r?.discussion) mood='clap';
    if(!keepInput) clearInput();
    if(renderResult) render();
    if(gain>0&&action.kind!=='approve') celebrate(gain);
    if(speak&&r&&reply) read(reply);
    return value;
  }catch(e){
    if(e.key==='locked'||e.key==='conflict'||e.status===403){
      try{update(await request());render();}catch{}
    }
    notify(e.message,true);
    return null;
  }finally{thinking(false);}
}
function controls(){
  return `<div class="controls">
    <button id="mic" class="mic" aria-label="${esc(t('按住说话','Hold to talk'))}">🎙 ${esc(one('按住说','Hold'))}</button>
    ${button('camera','📷 '+esc(one('拍照','Photo')))}
    ${button('submit','➜ '+esc(one('发送','Send')),'','primary')}
<input id="photo" class="file" type="file" accept="image/*" capture="environment" tabindex="-1" aria-label="Camera">
    </div><div id="speech-output" class="muted" role="status"></div>
    <details ${transcript?'open':''}><summary>${esc(t('⌨ 输入文字','⌨ Type'))}</summary><textarea id="words" maxlength="4000" aria-label="${esc(t('说说你的想法','Share your idea'))}">${esc(transcript)}</textarea></details>
    <div id="preview">${photoTag(photo)}</div>`;
}
function stage(heading,prompt,html){
  return `<section class="stage"><div>${mascot()}</div><section class="panel"><h1>${heading}</h1>
    <p id="guide" class="speech">${esc(prompt)}</p>${readBtn(prompt)}
    <p id="thinking" class="speech" role="status" hidden></p>
    ${reply?`<p class="speech" aria-live="polite">${esc(reply)}</p>${readBtn(reply)}`:''}
    ${html}</section></section>`;
}
function home(){
  const greet=t('嗨，我是小星！我们去哪儿探险？','Hi, I’m Little Star! Where shall we explore?');
  return `<section class="hero"><div><h1>${lines('和小星去探险','Explore with Little Star')}</h1><p>${esc(greet)}</p>${readBtn(greet)}</div>${mascot()}</section>
  <section class="worlds"><button class="world" data-action="forest"><span class="world-icon" aria-hidden="true">🌳</span><strong>${lines('好奇森林','Curiosity Forest')}</strong><small>${lines('问一个想知道的问题','Ask something you wonder about')}</small><span class="go" aria-hidden="true">➜</span></button>
  <button class="world mission" data-action="missions"><span class="world-icon" aria-hidden="true">🚀</span><strong>${lines('任务基地','Mission Base')}</strong><small>${lines('动手完成一个挑战','Try a hands-on challenge')}</small><span class="go" aria-hidden="true">➜</span></button></section>
  ${demoMode?`<p class="muted demo-note">${esc(t('试玩 · 使用示例回复。请用虚构内容。','Demo · Sample responses. Use pretend details.'))}</p>`:''}`;
}
function forest(){
  const level=levels[s.forest.level];
  const prompt=phase==='guess'?t('你觉得呢？','What do you think?'):t('按住话筒，问我一个问题。','Hold the microphone and ask me a question.');
  const goal=level?t(level.zh,level.en):t('森林关卡全部完成！','You completed all forest levels!');
  return stage(lines('好奇森林','Curiosity Forest'),prompt,
    `${controls()}${phase==='guess'?button('skipGuess','⏭ '+esc(t('先听听','Hear an answer'))):''}
    <div class="steps" aria-label="Forest levels">${levels.map((item,i)=>button('read',i<s.forest.level?'✓':i===s.forest.level?'🌟':'🔒',t(item.zh,item.en),'step '+(i<s.forest.level?'done':i===s.forest.level?'current':''))).join('')}</div>
    <p>${esc(goal)} ${readBtn(goal)}</p>`);
}
function missions(){
  const m=getCatalog(s).find(m=>m.id===s.active?.id);
  if(!m){
    const next=recommendation(s);
    const pending=s.pending.some(p=>p.kind==='mission');
    const prompt=next?missionText(next,'brief'):pending?t('小星在等家长确认大星。','Little Star is waiting for a grown-up to confirm your big stars.'):t('你完成了所有可以玩的任务！','You finished every available mission!');
    return stage(lines('任务基地','Mission Base'),prompt,
      `${next?button('start',icon(next)+' '+esc(title(next)),next.id,'primary'):''}
      <div class="steps">${getCatalog(s).map(item=>button('read',s.completed.includes(item.id)?'✓':available(s).includes(item)?icon(item):'🔒',title(item),'step')).join('')}</div>`);
  }
  const step=s.active.step;
  const guides=[
    missionText(m,'brief')+'\n'+t('用你自己的话说一遍。','Tell me the mission in your own words.'),
    t('选一个来源，找两条线索。','Choose a source and find two clues.'),
    t('画个计划拍给我，或者说给我听。','Draw and photograph your plan, or tell me about it.'),
    t('做完后拍张照片。想一想：','Take a photo of what you made. Think about this:')+'\n'+t(m.reflection_prompts.zh.join(' '),m.reflection_prompts.en.join(' '))
  ];
  const indicators=`<div class="steps">${stepNames.map(([sym,zh,en],i)=>button('read',i+1<step?'✓':sym,t(zh,en),'step '+(i+1===step?'current':i+1<step?'done':''))).join('')}</div>`;
  const clue=step===2?`<div class="controls">${Object.entries(sources).map(([key,[sym,zh,en]])=>button('source',sym+' '+esc(one(zh,en)),key,source===key?'primary':'small')).join('')}</div>
    <p>${'🗂️'.repeat(s.active.cards)}${'▫️'.repeat(2-s.active.cards)}</p>${source==='ai'?button('hint','✦ '+esc(one('请小星提示','Get a clue'))):''}`:'';
  const next=step===3&&s.active.plans?button('advance','➜ '+esc(t('去动手','Start making')),'','primary'):'';
  return stage(esc(icon(m)+' '+title(m)).replaceAll('\n','<br>'),guides[step-1],indicators+clue+controls()+next);
}
function shelf(){
  const titles=[['小探索者','Little Explorer'],['小提问家','Question Finder'],['小侦探','Little Detective'],['小发明家','Little Inventor'],['未来创想家','Future Creator']];
  const rank=[0,10,25,50,90].filter(n=>s.earned>=n).length-1;
  const label=t(...titles[rank]),streak=t('连续打卡','Visit streak')+' '+s.streak;
  return `<section class="panel"><h1>★ ${s.stars} · ${esc(label)}</h1>${readBtn(label)}
    <p>${esc(streak)} 🔥 ${readBtn(streak)}</p>
    <div class="split"><section><h2>${lines('徽章墙','Badge Wall')}</h2><div class="steps">
      ${s.badges.map(id=>types[id]?button('read',types[id][0],t(...types[id].slice(1)),'step'):button('read',icon(getCatalog(s).find(m=>m.id===id)),title(getCatalog(s).find(m=>m.id===id)),'step')).join('')||'☆'}</div></section>
    <section><h2>${lines('信息卡收藏册','Clue Collection')}</h2><div class="list">${s.cards.map(c=>`<article class="tile">${sources[c.source]?.[0]||''} ${esc(c.input)} ${readBtn(c.input||t('照片线索','Photo clue'))}${photoTag(c.image)}</article>`).join('')||'🗂️'}</div></section></div></section>`;
}
function shop(){
  const empty=t('商店还没有奖励。','The shop has no rewards yet.');
  return `<section class="panel"><h1>🎁 ${lines('奖励商店','Reward Shop')}</h1>
  <div class="list">${s.rewards.map(r=>`<article class="tile">${photoTag(r.image)}<p>${esc(r.name)} · ${r.cost} ★ ${readBtn(r.name+' '+r.cost)}</p>
    ${button('redeem',esc(s.pending.some(p=>p.reward===r.id)?t('等家长确认','Waiting for a grown-up'):t('请家长兑换','Ask to redeem')),r.id,'primary',s.stars<r.cost||s.pending.some(p=>p.reward===r.id))}</article>`).join('')||esc(empty)+' '+readBtn(empty)}</div></section>`;
}
const ui=()=>({s,data,t,lines,esc,button,photoTag,title,act,notify,demoMode,compress,$});
function render(){
  if(!s)return;
  $('language').textContent=lang()==='en'?'EN':lang()==='zh'?'中':'中 / EN';
  $('stars').textContent=s.stars;
  document.documentElement.lang=lang()==='en'?'en':'zh';
  if(data.locked&&view!=='parent'){
    const message=t('今天的时间到了。明天再一起玩！','Time is up for today. See you tomorrow!');
    app.innerHTML=stage('🌙',message,'');
    if(spokenLock!==data.date){spokenLock=data.date;read(message);}
  }else app.innerHTML=({home,forest,missions,shelf,shop,parent:()=>parentView(ui())}[view]||home)();
  app.setAttribute('aria-busy',String(busy));
  bindMic();
}
function capture(){
  const words=$('words');
  if(words) transcript=words.value.trim();
  return {input:transcript,image:photo||undefined};
}
async function compress(file){
  if(!file?.size)return '';
  const url=URL.createObjectURL(file);
  try{
    const image=new Image();
    image.src=url;await image.decode();
    const ratio=Math.min(1,960/Math.max(image.width,image.height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.round(image.width*ratio);canvas.height=Math.round(image.height*ratio);
    const context=canvas.getContext('2d');
    context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(image,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/jpeg',.74);
  }finally{URL.revokeObjectURL(url);}
}
function showTranscript(value){
  transcript=value.trim();
  if($('words')) $('words').value=transcript;
  if($('speech-output')) $('speech-output').textContent=transcript;
}
async function submit(skip=false){
  const current=capture();
  if(view==='forest'){
    if(phase!=='guess'){
      if(!current.input&&!current.image)return notify(t('先说一句，或者拍张照片。','Say something or take a photo first.'),true);
      askDraft=current;photo='';transcript='';phase='guess';reply='';render();
      read(t('你觉得呢？','What do you think?'));
      return;
    }
    if(!skip&&!current.input&&!current.image)return notify(t('说说你的想法，或点跳过。','Share your idea or tap Hear an answer.'),true);
    await act({kind:'ask',...askDraft,guess:skip?'':current.input,guessImage:skip?undefined:current.image});
    return;
  }
  if(view!=='missions'||!s.active)return;
  const prior=s.active.step;
  if(prior===2&&!source)return notify(t('先选一个线索图标。','Pick a clue icon first.'),true);
  if(prior===4&&(!current.input||!current.image))return notify(t('拍张照片，再说说你做得怎么样。','Take a photo and tell me how it went.'),true);
  if(!current.input&&!current.image)return notify(t('先说给小星听，或者拍张照片。','Tell Little Star or take a photo first.'),true);
  const result=await act({kind:prior===2?'card':'evaluate',...current,source});
  if(!result)return;
  if(prior===2&&s.active?.step===2)read(t('线索收好了。再找一条！','Your clue is saved. Find one more!'));
  else if(s.active?.step!==prior)read([reply,$('guide')?.textContent].filter(Boolean).join('\n'));
}
function fallbackSpeech(){
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!data.speechFallback||!Recognition){
    notify(t('语音现在用不了。请试试文字输入。','Voice is unavailable. Try typing.'),true);
    document.querySelector('details')?.setAttribute('open','');
    return;
  }
  const recognition=new Recognition();
  recognition.lang=lang()==='en'?'en-US':lang()==='both'&&/^[A-Za-z]/.test(askDraft?.input||'')?'en-US':'zh-CN';
  if('processLocally' in recognition) recognition.processLocally=true;
  recognition.onresult=event=>showTranscript(event.results[0][0].transcript);
  recognition.onerror=()=>notify(t('没听清。再试一次。','I missed that. Try again.'),true);
  try{recognition.start();}catch{recognition.onerror();}
}
async function beginMic(event){
  if(busy||holding||recording)return;
  event.preventDefault();sound();window.speechSynthesis?.cancel();
  const mic=$('mic'),token=++micToken;
  holding=true;mic.classList.add('recording');
  $('speech-output').textContent=t('我在听…','I’m listening…');
  let stream;
  try{
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder||demoMode){
      holding=false;mic.classList.remove('recording');fallbackSpeech();return;
    }
    stream=await navigator.mediaDevices.getUserMedia({audio:true});
    if(token!==micToken||!holding){stream.getTracks().forEach(track=>track.stop());return;}
    const mr=new MediaRecorder(stream),chunks=[];
    recording=mr;
    mr.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    mr.onstop=async()=>{
      clearTimeout(limit);
      stream.getTracks().forEach(track=>track.stop());
      if(!chunks.length){recording=null;notify(t('请按住话筒再说。','Hold the microphone while you speak.'),true);return;}
      try{
        const audio=await new Promise((resolve,reject)=>{
          const reader=new FileReader();
          reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;
          reader.readAsDataURL(new Blob(chunks,{type:mr.mimeType.split(';')[0]}));
        });
        const result=await act({kind:'speech',audio},{keepInput:true,speak:false,renderResult:false});
        if(result?.reply?.transcript){
          showTranscript(result.reply.transcript);
          const message=t('听到了。准备好就按箭头。','I heard you. Tap the arrow when you are ready.');
          notify(message,true);
        }
        else if(result?.reply?.speechUnavailable)fallbackSpeech();
      }catch{fallbackSpeech();}finally{recording=null;}
    };
    const limit=setTimeout(endMic,40000);
    mr.start();
  }catch{
    holding=false;recording=null;
    stream?.getTracks().forEach(track=>track.stop());
    mic.classList.remove('recording');fallbackSpeech();
  }
}
function endMic(event){
  if(!holding)return;
  event?.preventDefault();holding=false;
  $('mic')?.classList.remove('recording');
  if(recording?.state==='recording'){
    $('speech-output').textContent=t('我在听你刚才的话…','Listening to your recording…');
    recording.stop();
  }else if($('speech-output'))$('speech-output').textContent=t('话筒准备好后，再按住说。','Hold again when the microphone is ready.');
}
function bindMic(){
  const mic=$('mic');
  if(!mic)return;
  mic.onpointerdown=event=>{if(event.button===0){mic.setPointerCapture?.(event.pointerId);void beginMic(event);}};
  mic.onpointerup=endMic;mic.onpointercancel=endMic;
  mic.onkeydown=event=>{if(!event.repeat&&[' ','Enter'].includes(event.key))void beginMic(event);};
  mic.onkeyup=event=>{if([' ','Enter'].includes(event.key))endMic(event);};
  mic.oncontextmenu=event=>event.preventDefault();
}
const nav=new Set(['home','forest','missions','shelf','shop','parent']);
document.addEventListener('click',async event=>{
  const el=event.target.closest('[data-action]');
  if(!el||busy||ticking||!s||holding||recording)return;
  const {action,value}=el.dataset;
  sound();
  if(nav.has(action)){
    const recentApproval=view==='parent'&&action!=='parent'?[...(s.receipts||[])].reverse().find(r=>r.kind==='mission'&&r.status==='approved'):null;
    if(view==='parent'&&action!=='parent'&&data.admin)await act({kind:'logout'},{speak:false});
    go(action);
    if(recentApproval&&localStorage.getItem('future-celebration')!==recentApproval.id){
      localStorage.setItem('future-celebration',recentApproval.id);
      celebrate(recentApproval.stars,true);
    }
    read($('guide')?.textContent);
    return;
  }
  if(action==='read')return read(value);
  if(action==='camera')return $('photo')?.click();
  if(action==='language'){
    if(data.locked)return;
    capture();await act({kind:'language',language:langs[(langs.indexOf(lang())+1)%langs.length]},{keepInput:true,speak:false});
    return;
  }
  if(action==='submit'||action==='skipGuess')return submit(action==='skipGuess');
  if(action==='source'){
    capture();source=value;render();
    read(t(...sources[value].slice(1)));
    if(value==='photo')$('photo')?.click();
    return;
  }
  if(action==='hint'){
    const result=await act({kind:'hint',...capture()},{keepInput:true});
    if(result?.reply&&!result.reply.safety_flag)showTranscript([result.reply.praise,result.reply.one_question_or_suggestion].filter(Boolean).join('\n'));
    return;
  }
  if(['start','advance'].includes(action)){
    const result=await act({kind:action,id:value});
    if(result)read($('guide')?.textContent);
    return;
  }
  if(action==='redeem'){
    const result=await act({kind:'redeem',id:value});
    if(result)notify(t('已经请家长确认。','A grown-up can now confirm.'),true);
    return;
  }
  if(view==='parent')await adminAction(ui(),action,value);
});
document.addEventListener('change',async event=>{
  const field=event.target;
  if(field.id==='photo'){
    try{
      const next=await compress(field.files[0]);
      if(!next||!$('preview'))return;
      photo=next;$('preview').innerHTML=photoTag(photo);
      notify(t('照片准备好了。','Photo ready.'));
    }catch{notify(t('照片没打开，请再拍一次。','The photo could not open. Try again.'),true);}
  }
  if(field.id==='mission-picker'){
    const m=getCatalog(s).find(m=>m.id===field.value);
    $('saveMission').elements.mission.value=JSON.stringify(m||{...catalog[0],id:'my-mission',unlock_requires:[]},null,2);
  }
});
document.addEventListener('submit',async event=>{
  event.preventDefault();
  if(view==='parent'&&!busy)await adminSubmit(ui(),event.target);
});
async function heartbeat(){
  const now=performance.now(),elapsed=Math.min(15,Math.floor((now-lastTime)/1000));
  lastTime=now;
  if(!data||document.hidden)return;
  if(view!=='parent'&&!data.locked)queued+=elapsed;
  if(busy||ticking||holding||recording)return;
  if(data.locked||queued<1){
    if(data.locked){
      try{const next=await request();if(next.date!==data.date){update(next);await act({kind:'visit'},{keepInput:true});render();}}catch{}
    }
    return;
  }
  const seconds=Math.min(20,queued);
  queued-=seconds;
  ticking=true;
  try{
    const next=await request({kind:'time',seconds});
    const redraw=next.locked||next.date!==data.date||next.admin!==data.admin;
    const newDay=next.date!==data.date;
    update(next);
    ticking=false;
    if(newDay&&!next.locked)await act({kind:'visit'},{keepInput:true});
    else if(redraw)render();
  }catch{queued+=seconds;}
  finally{ticking=false;}
}
let ticking=false;
async function init(){
  try{
    update(await request());render();
    if(!data.locked&&s.visit!==data.date)await act({kind:'visit'});
    setInterval(heartbeat,5000);
    if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }catch(e){
    app.innerHTML='<section class="panel"><h1>AI for Future</h1><p>'+esc(e.message)+'</p><button class="primary" id="retry">↻</button></section>';
    $('retry').onclick=init;
    app.setAttribute('aria-busy','false');
  }
}
void init();
