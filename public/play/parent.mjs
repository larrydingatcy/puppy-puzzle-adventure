import {catalog,getCatalog} from './game.mjs';
const langs=['zh','en','both'];
export function parentView({s,data,t,lines,esc,button,photoTag,title,demoMode}){
  if(!data.admin) return `<section class="panel"><h1>⚙ ${lines('家长','Parent')}</h1>
    <form id="login"><label>PIN<input name="pin" type="password" inputmode="numeric" required autocomplete="current-password"></label><button class="primary">${esc(t('进入','Unlock'))}</button></form>
    ${demoMode?'<p>Demo PIN · 1234</p>':''}</section>`;
  const {settings}=s;
  const form=(id,inner,label)=>`<form id="${id}">${inner}<button class="primary">${label}</button></form>`;
  const field=(key,label,value='',type='text')=>`<label>${label}<input type="${type}" name="${key}" value="${esc(value)}"></label>`;
  const block=(zh,en,inner)=>`<section class="tile"><h2>${lines(zh,en)}</h2>${inner}</section>`;
  const reviews=s.pending.map(p=>`<article class="tile"><p>${esc(p.kind==='mission'?title(getCatalog(s).find(m=>m.id===p.mission)):p.name)} · ${p.stars||p.cost} ★</p>
    ${button('approve',esc(t('确认','Approve')),p.id,'primary')}${p.kind==='reward'?button('reject',esc(t('取消','Reject')),p.id):''}</article>`).join('');
  const rewards=s.rewards.map(r=>`<p>${esc(r.name)} · ${r.cost} ★ ${button('editReward','✎',r.id)} ${button('deleteReward','×',r.id)}</p>`).join('');
  const receipts=(s.receipts||[]).filter(r=>r.kind==='reward').map(r=>`<p>${esc(r.reviewDate)} · ${esc(r.name)} · ${r.cost} ★ · ${esc(r.status)}</p>`).join('');
  const logs=(s.logs||[]).slice().reverse().map(l=>`<details><summary>${esc(l.date+' · '+l.kind+' · '+(l.input||'📎'))}</summary><p class="speech">${esc([l.evaluation.praise,l.evaluation.answer,l.evaluation.try_it,l.evaluation.one_question_or_suggestion].filter(Boolean).join('\n'))}</p>
    ${l.guess?`<p>${esc(l.guess)}</p>`:''}${l.evaluation.safety_flag?'⚑ ':''}${photoTag(l.image)}${photoTag(l.guessImage)}${l.audio?`<audio controls preload="none" src="${esc(l.audio)}"></audio>`:''}</details>`).join('');
  const sums=(data.summaries||[]).map(d=>`<details><summary>${esc(d.date)} · ${d.minutes} min ${d.safety_flag?'⚑':''}</summary><pre>${esc(JSON.stringify(d,null,2))}</pre></details>`).join('');
  const drafts=(s.drafts||[]).map(m=>`<details><summary>${esc(title(m))}</summary><pre>${esc(JSON.stringify(m,null,2))}</pre>${button('reviewDraft',esc(t('审核通过','Approve draft')),m.id,'primary')}${button('rejectDraft',esc(t('丢弃','Discard')),m.id)}</details>`).join('');
  const picker=`<label>${esc(t('选择任务','Choose mission'))}<select id="mission-picker"><option value="">+</option>${getCatalog(s).map(m=>`<option value="${esc(m.id)}">${esc(title(m))}</option>`).join('')}</select></label>`;
  return `<section class="panel"><h1>⚙ ${lines('家长后台','Parent Settings')}</h1>${button('logout',esc(t('锁定后台','Lock parent settings')))}
    <div class="admin-grid">
    ${block('待确认','Pending reviews',reviews||'—')}
    ${block('奖励商店','Reward shop',rewards+form('reward','<input type="hidden" name="id"><label>'+esc(t('名称','Name'))+'<input name="name" required></label>'+field('cost','★','','number')+'<label>📷 <input name="image" type="file" accept="image/*"></label>',esc(t('保存奖励','Save reward')))+receipts)}
    ${block('系统设置','Settings',form('settings',field('minutes',esc(t('每日分钟','Minutes per day')),settings.minutes,'number')+
      `<label>${esc(t('语言','Language'))}<select name="language">${langs.map(l=>`<option ${l===settings.language?'selected':''} value="${l}">${l}</option>`).join('')}</select></label>`+
      field('base_url','Base URL',settings.base_url)+field('model','Text model',settings.model)+field('vision_model','Vision model',settings.vision_model)+
      `<label>${esc(t('导师提示词','Tutor prompt'))}<textarea name="prompt">${esc(settings.prompt)}</textarea></label>`,esc(t('保存设置','Save settings'))))}
    ${block('任务编辑和审核','Missions and drafts',picker+form('saveMission','<label>JSON<textarea name="mission" required>'+esc(JSON.stringify({...catalog[0],id:'my-mission',unlock_requires:[]},null,2))+'</textarea></label>',esc(t('保存任务','Save mission')))+
      form('draft',field('theme',esc(t('任务主题','Mission theme'))),esc(t('生成待审核草稿','Generate draft')))+drafts)}
    ${block('每日摘要','Daily summaries',sums||'—')}
    ${block('对话和附件','Conversations and attachments',logs||'—')}
    </div></section>`;
}
export async function adminAction({s,$,act,t,notify},kind,id){
  if(kind==='editReward'){
    const reward=s.rewards.find(r=>r.id===id);
    const elements=$('reward').elements;
    elements.id.value=id;elements.name.value=reward.name;elements.cost.value=reward.cost;
    elements.name.focus();
  }
  if(['approve','reject','deleteReward','logout'].includes(kind)){
    const value=await act({kind,id});
    if(value&&kind==='approve')notify(t('已确认。','Approved.'));
  }
  if(['reviewDraft','rejectDraft'].includes(kind))await act({kind:'reviewDraft',id,accept:kind==='reviewDraft'});
}
export async function adminSubmit({s,act,compress,notify},form){
  const fields=Object.fromEntries(new FormData(form));
  try{
    switch(form.id){
      case 'login': await act({kind:'login',pin:fields.pin});break;
      case 'settings': await act({kind:'settings',settings:{...fields,minutes:Number(fields.minutes)}});break;
      case 'draft': await act({kind:'draft',input:fields.theme});break;
      case 'saveMission': await act({kind:'saveMission',mission:JSON.parse(fields.mission)});break;
      case 'reward': {
        const {name,id,cost,image}=fields;
        const saved=await compress(image)||s.rewards.find(r=>r.id===id)?.image||'';
        await act({kind:'reward',reward:{name,id,cost:Number(cost),image:saved}});
        break;
      }
    }
  }catch(e){notify(e.message);}
}
