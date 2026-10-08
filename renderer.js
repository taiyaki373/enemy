/* Three-dimensional presentation; gameplay coordinates map onto the X/Z plane. */
const graphics = (() => {
 const canvas=document.querySelector('#game');
 let renderer;
 try {renderer=new THREE.WebGLRenderer({canvas,antialias:true});}
 catch(error){document.querySelector('#status').textContent='3D描画を開始できません。WebGL対応ブラウザで開いてください。';throw error;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#151323');scene.fog=new THREE.Fog('#151323',45,100);
 const camera=new THREE.PerspectiveCamera(75,5/3,.1,160);
 const hemisphere=new THREE.HemisphereLight('#c1c7ff','#493043',2);scene.add(hemisphere);
 const sun=new THREE.DirectionalLight('#ffd8b2',3);sun.position.set(-10,22,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-42,right:42,top:35,bottom:-35,near:1,far:110});sun.shadow.bias=-.0005;scene.add(sun);
 const fill=new THREE.DirectionalLight('#ad83ff',1.5);fill.position.set(12,8,-12);scene.add(fill);
 const geometries={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.SphereGeometry(1,12,8),cone:new THREE.ConeGeometry(1,1,8),cylinder:new THREE.CylinderGeometry(1,1,1,12),ring:new THREE.RingGeometry(.85,1,48)};
 const materials=new Map();
 function material(color,glow=false){const key=color+':'+glow;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.8,emissive:glow?color:0,emissiveIntensity:glow?1.2:0}));return materials.get(key);}
 function part(parent,type,color,x,y,z,sx,sy,sz,glow=false){const m=new THREE.Mesh(geometries[type],material(color,glow));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 // Visible claws keep the monster identity in the first-person view.
 const hands=new THREE.Group();camera.add(hands);scene.add(camera);
 for(const side of [-1,1]){
  part(hands,'sphere','#b95878',side*.58,-.5,-.85,.2,.24,.28);
  for(let i=0;i<3;i++){const claw=part(hands,'cone','#e4c5a2',side*(.46+i*.11),-.42,-1.14,.04,.3,.04);claw.rotation.x=-Math.PI/2;}
 }
 hands.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
 const world=new THREE.Group();scene.add(world);
 part(world,'box','#302c3b',0,-.3,0,arena.width*.04,.6,arena.height*.04);
 const grid=new THREE.GridHelper(arena.width*.04,40,'#615064','#40394c');grid.position.y=.015;grid.scale.z=arena.height/arena.width;scene.add(grid);
 for(const z of [-arena.height*.02,arena.height*.02])part(world,'box','#403748',0,1.5,z,arena.width*.04,3,.65);
 for(const x of [-arena.width*.02,arena.width*.02])part(world,'box','#403748',x,1.5,0,.65,3,arena.height*.04);
 const coverMeshes=[],coverVisuals=new Map();
 for(const o of obstacles){
  const group=new THREE.Group();group.position.set((o.x-arena.width/2)*.04,0,(o.y-arena.height/2)*.04);world.add(group);
  const intact=new THREE.Group();group.add(intact);
  const body=part(intact,'box','#51445c',0,o.height/2,0,o.w*.04,o.height,o.h*.04);body.userData.cover=o;coverMeshes.push(body);
  part(intact,'box','#70586d',0,o.height+.12,0,o.w*.04+.2,.24,o.h*.04+.2);
  for(const side of [-1,1])part(intact,'box','#3b3146',side*(o.w*.02-.15),o.height/2,0,.22,o.height,o.h*.04+.05);
  const rubble=new THREE.Group();group.add(rubble);rubble.visible=false;
  for(let i=0;i<8;i++){
   const stone=part(rubble,'box',i%2?'#70586d':'#51445c',0,0,0,.5+(i%3)*.25,.3+(i%2)*.2,.5+(i%3)*.2);
   stone.castShadow=false;stone.userData.index=i;
  }
  coverVisuals.set(o,{intact,rubble});
 }
 function updateCover(){
  for(const [o,{intact,rubble}] of coverVisuals){
   intact.visible=!o.destroyed||o.collapseTime<.55;rubble.visible=o.destroyed;
   const fall=o.destroyed?Math.min(1,o.collapseTime/.55):0;
   intact.scale.y=Math.max(.01,1-fall);intact.rotation.z=fall*.15;
   if(o.destroyed)for(const stone of rubble.children){
    const i=stone.userData.index,a=i*Math.PI/4,progress=Math.min(1,o.collapseTime/.85);
    stone.position.set(Math.cos(a)*(o.w*.018+.5)*progress,.15+Math.sin(progress*Math.PI)*(o.height*.6+.3),Math.sin(a)*(o.h*.018+.5)*progress);
    stone.rotation.set(progress*(i+1)*.45,progress*i*.7,progress*.8);
   }
  }
 }
 for(const x of [-38,38])for(const z of [-27,-9,9,27]){
  part(world,'box','#54465b',x,2,z,1,4,1);part(world,'box','#6a5464',x,4,z,1.4,.35,1.4);
  const flame=part(world,'sphere','#ff9463',x,4.4,z,.23,.4,.23,true);flame.castShadow=false;
  const light=new THREE.PointLight('#ff9b6b',12,8);light.position.set(x,4,z);scene.add(light);
 }
 for(let i=0;i<16;i++){const a=i*Math.PI/8;part(world,'cone','#30293c',Math.cos(a)*50,2,Math.sin(a)*44,4,10+(i%3)*2,4);}
 const mark=part(scene,'ring','#ffcba0',0,.05,0,1,1,1,true);mark.rotation.x=-Math.PI/2;mark.castShadow=false;
 const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();
 const objects=new Map();let width=0,height=0,time=0;
 const wx=x=>(x-arena.width/2)*.04,wz=y=>(y-arena.height/2)*.04;
 function model(type,color,role){
  const g=new THREE.Group();scene.add(g);g.userData.type=type;
  const health=new THREE.Group();const backing=part(health,'box','#1c1625',0,0,0,1.7,.09,.04);backing.castShadow=false;
  const hp=part(health,'box',color,0,0,.03,1.65,.065,.03,true);hp.castShadow=false;health.position.y=type==='boss'?4.7:type==='minion'?1.7:2.65;g.add(health);g.userData.health=health;g.userData.hp=hp;
  if(type==='boss'){
   part(g,'sphere',color,0,1.8,0,1.15,1.35,.8);part(g,'sphere','#8c3e59',0,3,-.2,.75,.7,.65);
   for(const s of [-1,1]){
    const arm=part(g,'sphere',color,s*1.05,1.8,0,.45,.9,.48);arm.rotation.z=-s*.3;
    part(g,'box','#643448',s*.55,.5,0,.65,1,.75);
    const horn=part(g,'cone','#e4c5a2',s*.62,3.85,-.15,.22,1.2,.22);horn.rotation.z=-s*.4;
    part(g,'sphere','#ffcf75',s*.25,3.12,-.78,.11,.09,.08,true);
    for(let j=0;j<3;j++)part(g,'cone','#e4c5a2',s*(1.15+j*.13),.85,-.4,.07,.35,.07);
   }
   for(let i=0;i<4;i++){const spike=part(g,'cone','#b29ba4',0,2.8-i*.35,.7,.22,.65,.22);spike.rotation.x=Math.PI/2;}
  }else if(type==='hero'){
   part(g,'cylinder',color,0,1.05,0,.38,1,.32);part(g,'sphere','#e5c5b2',0,1.9,0,.28,.3,.28);
   part(g,'sphere',role===0?'#bcc4d5':'#3b3049',0,2.05,.02,.32,.2,.32);
   for(const s of [-1,1]){part(g,'box','#292536',s*.19,.35,0,.23,.65,.28);const arm=part(g,'box',color,s*.47,1.2,-.05,.2,.65,.22);arm.rotation.z=s*.2;}
   if(role===4){
    part(g,'box','#81766a',0,1.15,0,.95,1.15,.65);part(g,'box','#c8bdab',0,2.03,-.03,.68,.5,.6);part(g,'box','#292536',0,2.06,-.34,.42,.08,.04);
    for(const side of [-1,1])part(g,'sphere',color,side*.58,1.6,0,.35,.3,.38);
    part(g,'box','#63574b',-.65,1.15,-.5,.85,1.65,.18);part(g,'box',color,-.65,1.15,-.61,.7,1.48,.08);part(g,'box','#eee0be',-.65,1.15,-.67,.12,1.2,.04);
    part(g,'cylinder','#63574b',.65,1.1,-.2,.07,1.2,.07);part(g,'box','#c8bdab',.65,1.75,-.2,.45,.42,.45);
    g.scale.setScalar(1.2);
   }else if(role===0){g.userData.sword=part(g,'box','#d5e0ed',.6,1.25,-.4,.12,1.25,.12);part(g,'box','#e3bb81',.6,.85,-.4,.45,.12,.15);part(g,'cylinder','#738eaa',-.55,1.2,-.25,.45,.12,.45).rotation.x=Math.PI/2;}
   else if(role===1){const bow=new THREE.Mesh(new THREE.TorusGeometry(.45,.05,6,16,Math.PI),material('#bc885d'));bow.position.set(.6,1.2,-.25);bow.rotation.z=-Math.PI/2;g.add(bow);}
   else {part(g,'cylinder','#826c61',.6,1.1,-.2,.06,2,.06);part(g,'sphere',color,.6,2.15,-.2,.18,.18,.18,true);if(role===2)part(g,'cone',color,0,2.45,.02,.42,.7,.42);}
  }else if(type==='minion'){
   part(g,'sphere',color,0,.65,0,.4,.6,.35);for(const s of [-1,1]){part(g,'cone','#dac5ae',s*.27,1.2,0,.09,.45,.09);part(g,'sphere','#ffdfa0',s*.14,.9,-.3,.055,.06,.06,true);part(g,'box','#743b56',s*.23,.18,0,.18,.35,.23);}
  }
  return g;
 }
 function sync(entity,type,color,role,live){
  let g=objects.get(entity);if(!g){g=model(type,color,role);objects.set(entity,g);}live.add(entity);g.visible=entity.hp>0&&type!=='boss';
  g.position.set(wx(entity.x),0,wz(entity.y));
  const living=current.heroes.filter(h=>h.hp>0);
  const target=type==='boss'?current.aim:type==='minion'&&living.length?living.reduce((a,b)=>Math.hypot(a.x-entity.x,a.y-entity.y)<Math.hypot(b.x-entity.x,b.y-entity.y)?a:b):current.boss;
  if(type==='boss'&&entity.dash>0)g.rotation.y=Math.atan2(-entity.dx,-entity.dy);else g.rotation.y=Math.atan2(-(target.x-entity.x),-(target.y-entity.y));
  g.userData.health.quaternion.copy(g.quaternion).invert().multiply(camera.quaternion);
  const fraction=Math.max(0,entity.hp/(entity.max||85));g.userData.hp.scale.x=1.65*fraction;g.userData.hp.position.x=-(1-fraction)*1.65/2;
  if(g.userData.sword)g.userData.sword.rotation.x=entity.cd>.6?Math.sin((.85-entity.cd)*10)*1.3:0;
  if(type==='minion'){g.position.y=Math.sin(time*10+entity.x)*.08;g.scale.setScalar(entity.dash>0?1.25:1.1);}
  if(type==='boss')g.scale.setScalar(entity.dash>0?1.06:1);
 }
 const transient=new Map();
 function effectMesh(e,shot){let g=transient.get(e);if(!g){
  g=new THREE.Group();scene.add(g);transient.set(e,g);
  if(shot){part(g,'box','#e4c79a',0,1.4,0,.045,.045,.9);const tip=part(g,'cone','#fff0cd',0,1.4,-.5,.1,.25,.1);tip.rotation.x=-Math.PI/2;}
  else {const color=e.color||(e.heal?'#8bd3ad':e.blast?'#ff936b':'#e8d9c8');const ring=part(g,'ring',color,0,.06,0,1,1,1,true);ring.rotation.x=-Math.PI/2;ring.castShadow=false;
   const sphere=new THREE.Mesh(geometries.sphere,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.22,depthWrite:false}));sphere.position.y=.2;g.add(sphere);if(e.hostile&&e.r>=95){const meteor=part(g,'sphere',color,0,10,0,.5,.5,.5,true);meteor.castShadow=false;}if(e.beam){const beam=part(g,'cylinder',color,0,0,0,.05,1,.05,true);beam.castShadow=false;}}
 }return g;}
 function addExplosion(g){
  const burst=new THREE.Group();g.add(burst);g.userData.burst=burst;
  const shockMaterial=new THREE.MeshBasicMaterial({color:'#ffcb83',transparent:true,opacity:1,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
  const shock=new THREE.Mesh(geometries.ring,shockMaterial);shock.rotation.x=-Math.PI/2;shock.position.y=.12;burst.add(shock);g.userData.shock=shock;
  const sparkMaterial=new THREE.MeshBasicMaterial({color:'#ffb65d',transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending});
  const sparks=[];for(let i=0;i<24;i++){const spark=new THREE.Mesh(geometries.sphere,sparkMaterial);spark.scale.setScalar(.08+(i%3)*.025);burst.add(spark);sparks.push(spark);}g.userData.sparks=sparks;
  const smokeMaterial=new THREE.MeshBasicMaterial({color:'#786c79',transparent:true,opacity:.22,depthWrite:false});
  const smoke=[];for(let i=0;i<8;i++){const puff=new THREE.Mesh(geometries.sphere,smokeMaterial);burst.add(puff);smoke.push(puff);}g.userData.smoke=smoke;
  const light=new THREE.PointLight('#ff9860',0,28);light.position.y=2;burst.add(light);g.userData.flashLight=light;
 }
 function updateExplosion(g,e,radius){
  if(!g.userData.burst)addExplosion(g);
  g.userData.burst.visible=e.fired;
  if(!e.fired){g.children[0].scale.setScalar(radius*(.98+Math.sin(time*18)*.02));return;}
  const p=Math.min(1,1-e.t/(e.explosionLife||.8));
  g.children[0].visible=false;const flash=g.children[1];flash.position.y=.6;flash.scale.set(radius*(.15+p*.85),2+p*3,radius*(.15+p*.85));flash.material.opacity=.5*(1-p)*(1-p);
  const shock=g.userData.shock;shock.scale.setScalar(radius*(.1+p*.9));shock.material.opacity=1-p;
  g.userData.flashLight.intensity=65*(1-p)*(1-p);
  for(let i=0;i<g.userData.sparks.length;i++){const spark=g.userData.sparks[i],a=i*Math.PI*2/24;const d=radius*(.4+(i%4)*.15)*p;spark.position.set(Math.cos(a)*d,.4+Math.sin(p*Math.PI)*(2+i%5),Math.sin(a)*d);spark.material.opacity=1-p;}
  for(let i=0;i<g.userData.smoke.length;i++){const puff=g.userData.smoke[i],a=i*Math.PI/4;puff.position.set(Math.cos(a)*radius*.5*p,.5+p*3,Math.sin(a)*radius*.5*p);puff.scale.setScalar(.2+p*1.5);puff.material.opacity=.25*(1-p);}
 }
 function discard(group){scene.remove(group);group.traverse(o=>{if(o.geometry&&!Object.values(geometries).includes(o.geometry))o.geometry.dispose();if(o.material&&!Array.from(materials.values()).includes(o.material))o.material.dispose();});}
 let current;
 function render(state){
  current=state;time=performance.now()/1000;
  const w=canvas.clientWidth,h=canvas.clientHeight;if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  updateCover();
  pose(state.boss,state.view);
  const shaking=state.effects.find(e=>e.destroysCover&&e.fired&&e.t>(e.explosionLife||.8)-.25);
  if(shaking){const strength=Math.max(0,1-Math.hypot(state.boss.x-shaking.x,state.boss.y-shaking.y)/800)*.05;camera.position.x+=Math.sin(time*95)*strength;camera.position.y+=Math.cos(time*110)*strength;}
  hands.visible=!state.end;hands.position.z=state.boss.dash>0?-.12:0;
  mark.position.set(wx(state.aim.x),.05,wz(state.aim.y));
  const live=new Set();sync(state.boss,'boss','#b95878',0,live);for(const h of state.heroes)sync(h,'hero',h.color,h.role,live);for(const m of state.minions)sync(m,'minion','#cd738e',0,live);
  for(const [e,g] of objects)if(!live.has(e)){discard(g);objects.delete(e);}
  const active=new Set();for(const s of state.shots){const g=effectMesh(s,true);g.position.set(wx(s.x),0,wz(s.y));g.rotation.y=Math.atan2(-s.dx,-s.dy);active.add(s);}
  for(const e of state.effects){const g=effectMesh(e,false);g.position.set(wx(e.x),0,wz(e.y));const radius=e.r*.04;g.children[0].scale.set(radius,radius,radius);const sphere=g.children[1];sphere.visible=!e.blast||e.fired;sphere.scale.set(radius,e.blast&&e.fired?2:radius*.5,radius);sphere.material.opacity=.4*e.t/e.life;if(e.hostile&&e.r>=95){const meteor=g.children[2];meteor.visible=!e.fired;meteor.position.y=Math.max(.2,(e.t-.3)/(e.life-.3)*12);}if(e.beam){const beam=g.children[2],from=new THREE.Vector3(wx(e.from.x)-wx(e.x),1.8,wz(e.from.y)-wz(e.y)),to=new THREE.Vector3(0,1.8,0),delta=to.clone().sub(from);beam.position.copy(from).add(to).multiplyScalar(.5);beam.scale.set(.06,delta.length(),.06);beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());}if(e.destroysCover)updateExplosion(g,e,radius);active.add(e);}
  for(const [e,g] of transient)if(!active.has(e)){discard(g);transient.delete(e);}
  renderer.render(scene,camera);
 }
 function pose(boss,view){camera.position.set(wx(boss.x),3.1,wz(boss.y));camera.rotation.order='YXZ';camera.rotation.set(view.pitch,view.yaw,0);camera.updateMatrixWorld();}
 function target(boss,view){
  pose(boss,view);ray.setFromCamera(new THREE.Vector2(0,0),camera);
  // Looking above the horizon places a ground attack at maximum range.
  const cover=ray.intersectObjects(coverMeshes.filter(m=>!m.userData.cover.destroyed))[0];
  if(cover&&cover.distance<=32)return {x:cover.point.x/.04+arena.width/2,y:cover.point.z/.04+arena.height/2};
  if(ray.ray.intersectPlane(plane,hit)&&hit.distanceTo(camera.position)<=32)return {x:hit.x/.04+arena.width/2,y:hit.z/.04+arena.height/2};
  return {x:boss.x-Math.sin(view.yaw)*800,y:boss.y-Math.cos(view.yaw)*800};
 }
 return {render,target};
})();
