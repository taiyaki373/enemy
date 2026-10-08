const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function game(){
 const elements=new Map();
 const element=id=>{if(!elements.has(id))elements.set(id,{style:{},classList:{toggle(){}},setAttribute(){},addEventListener(){},querySelector:selector=>element(id+selector)});return elements.get(id);};
 const context=vm.createContext({
  document:{querySelector:element,getElementById:element,querySelectorAll:()=>[0,1,2,3,4].map(i=>element(`hero${i}`)),addEventListener(){}},
  addEventListener(){},requestAnimationFrame(){},
  graphics:{target:boss=>({x:boss.x,y:boss.y-250}),render(){}},
 });
 for(const filename of ['world.js','game.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',filename),'utf8'),context);
 return source=>vm.runInContext(source,context);
}
test('dash normal damage is 120/150/170/150 and heals 7% of actual damage',()=>{
 const run=game();run('Math.random=()=>.5;boss.hp=500');
 for(const [role,expected] of [[0,120],[1,150],[2,170],[3,150]]){
  const before=run('boss.hp');assert.equal(run(`dashHit(heroes[${role}]).dealt`),expected);assert.ok(Math.abs(run('boss.hp')-before-expected*.07)<1e-8);
 }
});
test('5% critical threshold multiplies damage by 1.4',()=>{
 const run=game();run('Math.random=()=>.049999;boss.hp=500');
 assert.equal(run('dashHit(heroes[2]).critical'),true);
 assert.equal(run('heroes[2].max-heroes[2].hp'),238);
 run('Math.random=()=>.05');assert.equal(run('dashHit(heroes[1]).critical'),false);
});
test('lifesteal uses shield-adjusted damage, caps overkill and maximum HP',()=>{
 const run=game();run('Math.random=()=>.5;boss.hp=500;heroes[0].shield=1');
 assert.equal(run('dashHit(heroes[0]).dealt'),66);
 assert.ok(Math.abs(run('boss.hp')-504.62)<1e-8);
 run('boss.hp=999;heroes[1].hp=10');assert.equal(run('dashHit(heroes[1]).dealt'),10);assert.ok(Math.abs(run('boss.hp')-999.7)<1e-8);
 run('boss.hp=999;heroes[2].hp=100');assert.equal(run('dashHit(heroes[2]).healed'),1);assert.equal(run('boss.hp'),1000);
});
test('dash hits a target once per charge and cannot hit through cover',()=>{
 const run=game();run('Math.random=()=>.5;heroes.forEach(h=>h.cd=100);heroes[4].hp=0;boss.x=1000;boss.y=900;boss.hp=500;boss.dash=.38;boss.dx=0;boss.dy=-1;heroes[1].x=1000;heroes[1].y=865');
 run('update(.01);update(.01)');assert.equal(run('heroes[1].max-heroes[1].hp'),150);assert.ok(run('boss.hp>500'));
});
test('explosion overlap destroys cover, clears movement and sight, resets on retry',()=>{
 const run=game();assert.equal(run('blocked(390,280,10)'),true);assert.equal(run('lineBlocked({x:200,y:280},{x:600,y:280})'),true);
 // Edge of obstacle lies within blast, while its center lies outside.
 assert.equal(run('destroyCover({x:290,y:280,r:25})'),1);
 assert.equal(run('obstacles[0].destroyed'),true);assert.equal(run('blocked(390,280,10)'),false);assert.equal(run('lineBlocked({x:200,y:280},{x:600,y:280})'),false);
 assert.equal(run('obstacles[1].destroyed'),false);assert.equal(run('destroyCover({x:290,y:280,r:25})'),0);
 run('reset()');assert.equal(run('blocked(390,280,10)'),true);assert.equal(run('obstacles.every(o=>!o.destroyed&&o.collapseTime===0)'),true);
});
test('player blast collapses cover only at detonation and preserves 2-second summon CT',()=>{
 const run=game();run('boss.x=1000;boss.y=890;skill("blast")');assert.equal(run('effects[0].r'),285);
 run('update(.1)');assert.equal(run('obstacles.some(o=>o.destroyed)'),false);
 run('update(.41)');assert.equal(run('effects[0].fired'),true);assert.equal(run('obstacles[6].destroyed'),true);
 run('skill("summon")');assert.equal(run('minions.length'),5);assert.equal(run('cooldown.summon'),2);
});

test('tank reduces all attacks and protects only living allies within visible range',()=>{
 const run=game();run('Math.random=()=>.5;boss.hp=500');
 assert.equal(run('heroes.length'),5);
 assert.equal(run('dashHit(heroes[4]).dealt'),75);
 assert.equal(run('damage(heroes[4],100)'),50);
 run('heroes[1].x=1000;heroes[1].y=850;heroes[4].x=1100;heroes[4].y=850');
 assert.equal(run('dashHit(heroes[1]).dealt'),112.5);
 run('heroes[1].shield=1');assert.equal(run('damage(heroes[1],100)'),41.25);
 run('heroes[1].shield=0;heroes[4].x=1400');assert.equal(run('damage(heroes[1],100)'),100);
 run('heroes[1].x=300;heroes[1].y=280;heroes[4].x=500;heroes[4].y=280');
 assert.equal(run('Boolean(guardingTank(heroes[1]))'),false);
 run('heroes[4].x=1100;heroes[4].y=850;heroes[1].x=1000;heroes[1].y=850;heroes[4].hp=0');
 assert.equal(run('damage(heroes[1],100)'),100);
});
test('tank attacks in melee and must be defeated for victory, retry restores it',()=>{
 const run=game();run('heroes.slice(0,4).forEach(h=>h.hp=0);boss.x=1000;boss.y=850;heroes[4].x=1100;heroes[4].y=850;heroes[4].cd=0');
 run('update(.01)');assert.equal(run('end'),'');assert.equal(run('effects.some(e=>e.hostile&&e.damage===110)'),true);
 run('update(.46)');assert.equal(run('boss.hp'),890);
 run('heroes[4].hp=0;update(.01)');assert.match(run('end'),/勝利/);
 run('reset();draw()');assert.equal(run('heroes[4].hp'),3600);assert.equal(run('end'),'');
});
