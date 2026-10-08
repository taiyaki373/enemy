// Shared physical stage, used by collision, navigation and 3D rendering.
const arena={width:2000,height:1600};
const obstacles=[
 [390,280,150,100,4],[790,260,100,160,5],[1290,250,180,90,3.5],[1640,320,100,180,5],
 [260,650,180,110,3],[630,650,100,190,5],[1050,640,200,90,3.5],[1450,660,100,190,5],[1760,780,130,100,4],
 [370,1020,120,170,5],[790,990,190,100,3],[1190,1010,100,190,5],[1600,1070,190,100,3.5],
 [250,1350,100,100,4],[640,1340,150,90,3],[1440,1370,120,100,4],[1800,1330,100,150,5]
].map(([x,y,w,h,height])=>({x,y,w,h,height,destroyed:false,collapseTime:0}));
function blocked(x,y,r=0){return x<r||y<r||x>arena.width-r||y>arena.height-r||obstacles.some(o=>!o.destroyed&&Math.abs(x-o.x)<o.w/2+r&&Math.abs(y-o.y)<o.h/2+r);}
function lineBlocked(a,b,r=0){
 return obstacles.some(o=>{if(o.destroyed)return false;let lo=0,hi=1;for(const [axis,size] of [['x','w'],['y','h']]){const d=b[axis]-a[axis],min=o[axis]-o[size]/2-r,max=o[axis]+o[size]/2+r;if(Math.abs(d)<1e-8){if(a[axis]<min||a[axis]>max)return false;}else{const p=(min-a[axis])/d,q=(max-a[axis])/d;lo=Math.max(lo,Math.min(p,q));hi=Math.min(hi,Math.max(p,q));if(lo>hi)return false;}}return true;});
}
function displace(a,dx,dy){const steps=Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/8)||1;let collided=false;for(let i=0;i<steps;i++){const x=a.x+dx/steps,y=a.y+dy/steps;if(!blocked(x,a.y,a.r))a.x=x;else collided=true;if(!blocked(a.x,y,a.r))a.y=y;else collided=true;}return collided;}
function route(a,b){
 const cell=50,cols=arena.width/cell,rows=arena.height/cell;
 const index=(x,y)=>y*cols+x,start=index(Math.floor(a.x/cell),Math.floor(a.y/cell)),goal=index(Math.floor(b.x/cell),Math.floor(b.y/cell));
 const queue=[start],parent=new Map([[start,null]]);let found=start,best=Infinity;
 for(let i=0;i<queue.length;i++){
  const id=queue[i],x=id%cols,y=Math.floor(id/cols),d=Math.hypot(x*cell+25-b.x,y*cell+25-b.y);if(d<best){best=d;found=id;}if(id===goal)break;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,n=index(nx,ny);if(nx<0||ny<0||nx>=cols||ny>=rows||parent.has(n)||blocked(nx*cell+25,ny*cell+25,a.r+3))continue;parent.set(n,id);queue.push(n);}
 }
 const path=[];while(found!==start&&found!==null){path.unshift({x:(found%cols)*cell+25,y:Math.floor(found/cols)*cell+25});found=parent.get(found);}return path;
}

function destroyCover(blast){
 let count=0;
 for(const o of obstacles){
  const dx=Math.max(0,Math.abs(blast.x-o.x)-o.w/2),dy=Math.max(0,Math.abs(blast.y-o.y)-o.h/2);
  if(!o.destroyed&&Math.hypot(dx,dy)<=blast.r){o.destroyed=true;o.collapseTime=0;count++;}
 }
 return count;
}
