const canvas = document.querySelector('#game');
const buttons = Object.fromEntries(['dash','blast','summon'].map(k=>[k,document.getElementById(k)]));
const enemyHpCards=Array.from(document.querySelectorAll('.enemy-hp-card'));
const names = {dash:'左クリック · 突進',blast:'Q · 遠隔範囲攻撃',summon:'右クリック · 雑魚召喚'};
const keys = new Set(), aim = {x:500,y:100};
const view={yaw:0,pitch:-.22};
const dashStats={damage:150,minDamage:120,maxDamage:170,roleOffsets:[-30,0,20,0],criticalChance:.05,criticalMultiplier:1.4,lifeSteal:.07};
let hitFeedback={text:'',time:0,critical:false};
const lookHint=document.querySelector('#look-hint');
let lookPointer=null;
let boss, heroes, minions, shots, effects, cooldown, end, last = 0, touch = false;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function reset(){
 obstacles.forEach(o=>{o.destroyed=false;o.collapseTime=0;});
 hitFeedback={text:'',time:0,critical:false};
 boss={x:1000,y:1380,hp:1000,max:1000,r:27,dash:0,dx:0,dy:0,hits:new Set()};
 heroes=[['剣士','#78bdde',830,550,2200],['弓使い','#e4be78',1150,520,1560],['魔術師','#b8a0ee',1430,440,1440],['僧侶','#8bd3ad',1010,380,1800],['重装タンク','#d7a66d',980,760,3600]].map(([name,color,x,y,hp],i)=>({name,color,x,y,hp,max:hp,r:i===4?23:15,cd:i*.3,role:i,heal:2,shield:0,nav:0,path:[]}));
 minions=[];shots=[];effects=[];cooldown={dash:0,blast:0,summon:0};end='';keys.clear();touch=false;view.yaw=0;view.pitch=-.22;lookPointer=null;releaseStick();
}
function skill(type){
 if(!buttons[type]||end||cooldown[type]>0)return;
 refreshAim();
 if(type==='dash'){boss.dx=-Math.sin(view.yaw);boss.dy=-Math.cos(view.yaw);boss.dash=.38;boss.hits.clear();cooldown.dash=3;}
 if(type==='blast'){effects.push({x:aim.x,y:aim.y,r:285,t:1.3,life:1.3,warning:.5,blast:true,fired:false,destroysCover:true});cooldown.blast=5;}
 if(type==='summon'){for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const m={x:clamp(boss.x+Math.cos(a)*55,30,arena.width-30),y:clamp(boss.y+Math.sin(a)*55,30,arena.height-30),hp:320,max:320,r:12,cd:0,life:30,nav:0,path:[],dash:0,dashCd:i*.3,blastCd:1+i*.25,hits:new Set()};if(blocked(m.x,m.y,m.r)){m.x=boss.x;m.y=boss.y;}minions.push(m);}cooldown.summon=2;}
}
Object.keys(buttons).forEach(k=>buttons[k].onclick=()=>skill(k));
document.querySelector('#restart').onclick=reset;
addEventListener('keydown',e=>{if(e.key==='Escape'){keys.clear();if(document.pointerLockElement===canvas)document.exitPointerLock();return;}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase());if(!e.repeat)skill({'q':'blast','1':'dash','2':'blast','3':'summon'}[e.key.toLowerCase()]);});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('blur',()=>{keys.clear();touch=false;lookPointer=null;});
function refreshAim(){const target=graphics.target(boss,view);aim.x=clamp(target.x,25,arena.width-25);aim.y=clamp(target.y,25,arena.height-25);}
function look(dx,dy){view.yaw-=dx*.0025;view.pitch=clamp(view.pitch-dy*.0025,-1.2,1.1);refreshAim();}
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&!end)look(e.movementX,e.movementY);});
function syncLock(){const locked=document.pointerLockElement===canvas;lookHint.hidden=locked||touch||Boolean(end);}
document.addEventListener('pointerlockchange',()=>{keys.clear();syncLock();});
document.addEventListener('pointerlockerror',()=>{lookHint.textContent='ドラッグで視点を動かせます';});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{
 if(end)return;
 if(e.pointerType==='mouse'){e.preventDefault();if(e.button===0)skill('dash');if(e.button===2)skill('summon');}
 if(e.pointerType==='mouse'&&document.pointerLockElement!==canvas){try{const request=canvas.requestPointerLock();if(request&&request.catch)request.catch(()=>{lookHint.textContent='ドラッグで視点を動かせます';});}catch{lookHint.textContent='ドラッグで視点を動かせます';}}
 if(document.pointerLockElement!==canvas){lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY};if(e.pointerType!=='mouse')canvas.setPointerCapture(e.pointerId);}
 if(e.pointerType!=='mouse'){touch=true;syncLock();}
});
canvas.addEventListener('pointermove',e=>{if(lookPointer&&lookPointer.id===e.pointerId&&document.pointerLockElement!==canvas){look(e.clientX-lookPointer.x,e.clientY-lookPointer.y);lookPointer.x=e.clientX;lookPointer.y=e.clientY;}});
function releasePointer(){lookPointer=null;touch=false;syncLock();}
canvas.addEventListener('pointerup',releasePointer);canvas.addEventListener('pointercancel',releasePointer);
let movePointer=null,stick={x:0,y:0};const pad=document.querySelector('#move-pad'),knob=document.querySelector('#move-knob');
function moveStick(e){const r=pad.getBoundingClientRect();const x=(e.clientX-r.left-r.width/2)/(r.width*.35),y=(e.clientY-r.top-r.height/2)/(r.height*.35);const d=Math.max(1,Math.hypot(x,y));stick={x:x/d,y:y/d};knob.style.transform=`translate(${stick.x*30}px,${stick.y*30}px)`;}
pad.addEventListener('pointerdown',e=>{movePointer=e.pointerId;pad.setPointerCapture(e.pointerId);moveStick(e);});
pad.addEventListener('pointermove',e=>{if(movePointer===e.pointerId)moveStick(e);});
function releaseStick(){movePointer=null;stick={x:0,y:0};knob.style.transform='';}
pad.addEventListener('pointerup',releaseStick);pad.addEventListener('pointercancel',releaseStick);addEventListener('blur',releaseStick);
function moveTo(a,b,speed,dt){const d=distance(a,b)||1;return displace(a,(b.x-a.x)/d*speed*dt,(b.y-a.y)/d*speed*dt);}
function navigate(a,b,speed,dt){
 a.nav-=dt;
 if(!lineBlocked(a,b,a.r+3)){a.path=[];moveTo(a,b,speed,dt);return;}
 if(a.nav<=0||!a.path.length){a.path=route(a,b);a.nav=.7;}
 while(a.path.length&&distance(a,a.path[0])<14)a.path.shift();
 if(a.path.length)moveTo(a,a.path[0],speed,dt);
}
function guardingTank(target){
 return heroes.find(h=>h.role===4&&h.hp>0&&h!==target&&distance(h,target)<240&&!lineBlocked(h,target));
}
function damage(target,n,{roleAdjusted=false}={}){
 if(target.shield>0)n*=.55;
 if(target.role===0&&!roleAdjusted)n*=.7;
 if(target.role===4)n*=.5;
 else if(heroes.includes(target)&&guardingTank(target))n*=.75;
 const previous=target.hp;target.hp=Math.max(0,target.hp-n);return previous-target.hp;
}
function dashHit(target){
 const critical=Math.random()<dashStats.criticalChance;
 const base=clamp(dashStats.damage+(dashStats.roleOffsets[target.role]||0),dashStats.minDamage,dashStats.maxDamage);
 const dealt=damage(target,base*(critical?dashStats.criticalMultiplier:1),{roleAdjusted:true});
 const previous=boss.hp;boss.hp=Math.min(boss.max,boss.hp+dealt*dashStats.lifeSteal);
 const healed=boss.hp-previous;
 hitFeedback={text:`${critical?'CRITICAL! · ':''}${target.name} −${dealt.toFixed(1)} · HP +${healed.toFixed(1)}`,time:2.5,critical};
 effects.push({x:target.x,y:target.y,r:critical?45:28,t:.35,life:.35,color:critical?'#ffdc78':'#e8b4c7'});
 return {dealt,healed,critical};
}
function zone(x,y,r,damage,delay,color){effects.push({x,y,r,damage,t:delay+.3,life:delay+.3,blast:true,hostile:true,fired:false,color});}
function projectile(h,target,angle=0){const d=distance(h,target)||1,dx=(target.x-h.x)/d,dy=(target.y-h.y)/d;shots.push({x:h.x,y:h.y,dx:dx*Math.cos(angle)-dy*Math.sin(angle),dy:dx*Math.sin(angle)+dy*Math.cos(angle),speed:640,r:5,damage:87,life:3,color:h.color,kind:'arrow'});}
function update(dt){
 if(end)return;
 refreshAim();hitFeedback.time=Math.max(0,hitFeedback.time-dt);
 for(const o of obstacles)if(o.destroyed)o.collapseTime+=dt;
 for(const k in cooldown)cooldown[k]=Math.max(0,cooldown[k]-dt);
 if(boss.dash>0){boss.dash-=dt;if(displace(boss,boss.dx*1000*dt,boss.dy*1000*dt))boss.dash=0;for(const h of heroes)if(h.hp>0&&distance(boss,h)<boss.r+h.r+8&&!boss.hits.has(h)&&!lineBlocked(boss,h)){dashHit(h);boss.hits.add(h);}}
 else {const right=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'))+stick.x,forward=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'))-stick.y,d=Math.max(1,Math.hypot(right,forward));displace(boss,(Math.cos(view.yaw)*right-Math.sin(view.yaw)*forward)/d*220*dt,(-Math.sin(view.yaw)*right-Math.cos(view.yaw)*forward)/d*220*dt);}
 for(const e of effects){
  e.t-=dt;
  const fireAt=e.warning===undefined?.3:e.life-e.warning;
  if(e.blast&&!e.fired&&e.t<=fireAt){
   e.fired=true;e.explosionLife=fireAt;
   if(e.destroysCover){e.destroyedCount=destroyCover(e);for(const a of [...heroes,...minions]){a.path=[];a.nav=0;}}
   const targets=e.hostile?[boss,...minions]:heroes;
   for(const h of targets)if(h.hp>0&&distance(e,h)<e.r+h.r&&!lineBlocked(e,h))damage(h,e.damage||85);
  }
 }

 effects=effects.filter(e=>e.t>0);
 for(const h of heroes){
  if(h.hp<=0)continue;h.cd-=dt;h.heal-=dt;h.shield=Math.max(0,h.shield-dt);
  const targets=[boss,...minions.filter(m=>m.hp>0)],target=targets.reduce((a,b)=>distance(h,a)<distance(h,b)?a:b),d=distance(h,target),visible=!lineBlocked(h,target),range=[90,470,520,440,105][h.role];
  const danger=effects.find(e=>e.blast&&!e.hostile&&!e.fired&&distance(e,h)<e.r+35);
  if(danger){let dx=h.x-danger.x,dy=h.y-danger.y;const len=Math.hypot(dx,dy)||1;if(len===1){dx=1;dy=0;}navigate(h,{x:clamp(h.x+dx/len*180,30,arena.width-30),y:clamp(h.y+dy/len*180,30,arena.height-30)},240,dt);}
  else if(!visible||d>range)navigate(h,target,h.role===4?125:h.role===0?205:155,dt);
  else if(h.role!==0&&h.role!==4&&d<240){const len=d||1;navigate(h,{x:clamp(h.x+(h.x-target.x)/len*150,30,arena.width-30),y:clamp(h.y+(h.y-target.y)/len*150,30,arena.height-30)},175,dt);}
  if(h.cd<=0&&visible&&d<range+40){
   if(h.role===0){h.cd=.85;zone(target.x,target.y,72,158,.25,'#78bdde');effects.push({x:h.x,y:h.y,r:100,t:.25,life:.25,color:h.color});}
   if(h.role===4){h.cd=1.6;zone(target.x,target.y,85,110,.45,h.color);effects.push({x:h.x,y:h.y,r:110,t:.45,life:.45,color:h.color});}
   if(h.role===1){h.cd=.95;for(const angle of [-.08,0,.08])projectile(h,target,angle);}
   if(h.role===2){h.cd=2.25;zone(target.x,target.y,140,233,.85,'#be8cff');if(minions.length>0){const m=minions.find(m=>m.hp>0);if(m)zone(m.x,m.y,95,150,.65,'#be8cff');}}
   if(h.role===3){h.cd=1.6;damage(target,72);effects.push({x:target.x,y:target.y,r:28,t:.35,life:.35,color:'#fff1af',beam:true,from:{x:h.x,y:h.y}});}
  }
  if(h.role===3&&h.heal<=0){h.heal=3.2;for(const ally of heroes)if(ally.hp>0&&distance(h,ally)<650){ally.hp=Math.min(ally.max,ally.hp+115);ally.shield=2.4;effects.push({x:ally.x,y:ally.y,r:30,t:.6,life:.6,heal:true});}}
 }
 for(const m of minions){
  m.life-=dt;m.dashCd-=dt;m.blastCd-=dt;const alive=heroes.filter(h=>h.hp>0);if(!alive.length)break;const h=alive.reduce((a,b)=>distance(m,a)<distance(m,b)?a:b),d=distance(m,h);
  if(m.dash>0){m.dash-=dt;if(displace(m,m.dx*750*dt,m.dy*750*dt))m.dash=0;for(const enemy of alive)if(distance(m,enemy)<m.r+enemy.r+12&&!m.hits.has(enemy)&&!lineBlocked(m,enemy)){damage(enemy,75);m.hits.add(enemy);}}
  else if(m.dashCd<=0&&d<310&&!lineBlocked(m,h,m.r)){m.dx=(h.x-m.x)/(d||1);m.dy=(h.y-m.y)/(d||1);m.dash=.4;m.dashCd=3.5;m.hits.clear();}
  else navigate(m,h,190,dt);
  if(m.blastCd<=0&&d<470&&!lineBlocked(m,h)){m.blastCd=5;effects.push({x:h.x,y:h.y,r:72,damage:55,t:.8,life:.8,blast:true,fired:false,color:'#dc8fa9'});}
 }

 minions=minions.filter(m=>m.hp>0&&m.life>0);
 for(const s of shots){const old={x:s.x,y:s.y};s.x+=s.dx*s.speed*dt;s.y+=s.dy*s.speed*dt;s.life-=dt;if(lineBlocked(old,s,s.r)){s.life=0;continue;}for(const t of [boss,...minions])if(t.hp>0&&distance(s,t)<t.r+s.r){damage(t,s.damage);s.life=0;break;}}
 shots=shots.filter(s=>s.life>0&&s.x>0&&s.x<arena.width&&s.y>0&&s.y<arena.height);
 if(boss.hp<=0)end='敗北 — 冒険者たちに討伐された';else if(heroes.every(h=>h.hp<=0))end='勝利 — 魔獣の領域を守り抜いた';
}
function draw(){
 graphics.render({boss,heroes,minions,shots,effects,aim,end,view});
 if(end&&document.pointerLockElement===canvas)document.exitPointerLock();
 syncLock();
 for(const k in buttons){buttons[k].disabled=Boolean(end)||cooldown[k]>0;buttons[k].querySelector('b').textContent=names[k]+(cooldown[k]>0?` (${cooldown[k].toFixed(1)}秒)`:'');}
 document.querySelector('#status').textContent=`冒険者 ${heroes.filter(h=>h.hp>0).length} / ${heroes.length} 人 · 眷属 ${minions.length} 体 · 難易度：絶望`;
 document.querySelector('#hp-fill').style.width=`${boss.hp/boss.max*100}%`;
 document.querySelector('#hp-text').textContent=`${Math.ceil(boss.hp)} / ${boss.max}`;
 heroes.forEach((h,i)=>{
  const card=enemyHpCards[i],track=card.querySelector('.enemy-hp-track');
  card.querySelector('.enemy-hp-value').textContent=h.hp>0?`${Math.ceil(h.hp)} / ${h.max}`:'討伐済み';
  track.querySelector('i').style.width=`${Math.max(0,h.hp/h.max)*100}%`;
  track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',h.max);track.setAttribute('aria-valuenow',Math.ceil(h.hp));
  card.classList.toggle('defeated',h.hp<=0);
 });
 const feedback=document.querySelector('#hit-feedback');feedback.hidden=hitFeedback.time<=0||Boolean(end);feedback.textContent=hitFeedback.text;feedback.classList.toggle('critical',hitFeedback.critical);
 const result=document.querySelector('#result');result.hidden=!end;document.querySelector('#result-text').textContent=end;
}
function frame(now){update(Math.min((now-last)/1000,.033));last=now;draw();requestAnimationFrame(frame);}
reset();draw();requestAnimationFrame(frame);
