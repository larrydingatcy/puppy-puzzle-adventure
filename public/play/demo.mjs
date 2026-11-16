import {create,apply,summary,locked,questionType,adminActions} from './game.mjs';
const key='ai-for-future-demo-v1';
let admin=false;
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
export async function demo(a){
  const date=today();
  const state=JSON.parse(localStorage.getItem(key)||'null')||create();
  const both=(zh,en)=>state.settings.language==='en'?en:state.settings.language==='zh'?zh:zh+'\n'+en;
  let reply;
  if(a?.kind==='login'){
    if(a.pin!=='1234') throw new Error('试玩 PIN / Demo PIN: 1234');
    admin=true;
  }else if(a?.kind==='logout') admin=false;
  else if(a){
    if(adminActions.includes(a.kind)&&!admin) throw new Error('Parent PIN required');
    if(a.kind==='draft') throw new Error('AI drafts require the Mac Studio edition');
    if(a.kind==='reward') a.reward.id ||=crypto.randomUUID();
    if(a.kind==='speech') reply={transcript:'',speechUnavailable:true};
    if(['ask','evaluate','hint'].includes(a.kind)){
      const input=a.input||'';
      const safety_flag=/火|电|刀|药|\b(fire|electricity|knife|medicine)\b/i.test(input);
      const type=questionType(input);
      const discussion=(state.forest.count+1)%3===0;
      const reason=/因为|所以|because|since/i.test(input);
      const compare=state.forest.discussion&&/选|同意|第[一二]|first|second|choose/i.test(input);
      reply={stars:safety_flag?0:a.kind==='ask'?(type==='if'?2:1):a.kind==='hint'?0:1,safety_flag,type,reason,compare,
        followup:state.forest.count>0&&/那|还有|然后|呢|^and|^but|^then/i.test(input),discussion,
        praise:safety_flag?both('这要找大人。','Find a grown-up for this.'):both('你把自己的想法告诉我了！','You shared your own idea!'),
        one_question_or_suggestion:safety_flag?'':a.kind==='ask'&&discussion?both('你选哪一个？为什么？怎么试试看？','Which do you pick, why, and how could you check?'):a.kind==='evaluate'&&state.active?.step===3?both('你想改一个什么地方？','What is one thing you would change?'):'',
        answer:safety_flag?'':/程序|机器人|computer|robot/i.test(input)?both('我是电脑程序。','I am a computer program.'):discussion?both('有两种可能：光变了，或者我们看的位置变了。','Maybe the light changed, or maybe we moved where we were looking from.'):both('我想和你一起查一查。','Let’s look it up together.'),
        try_it:safety_flag?'':both('找一件安全的小东西，换一个位置看。','Pick a safe object and look at it from a different spot.')};
      if(a.kind==='hint') reply.praise=both('找找身边的线索。','Look for a clue around you.');
      if(a.kind!=='ask') {delete reply.answer;delete reply.try_it;}
      a.evaluation=reply;
    }
    apply(state,a,date);
    localStorage.setItem(key,JSON.stringify(state));
  }
  return {state,admin,date,locked:locked(state,date),speechFallback:false,reply,
    ...(admin?{summaries:[...new Set([date,...state.logs.map(l=>l.date)])].map(d=>summary(state,d))}:{})};
}
