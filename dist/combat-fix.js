'use strict';
// Hard separation layer: the visual bodies never share the same fighting space.
const baseFightUpdate=StreetFight.prototype.update;
const baseAttack=StreetFight.prototype.attack;
const baseTryHit=StreetFight.prototype.tryHit;
const basePlayerInput=StreetFight.prototype.playerInput;
StreetFight.prototype.attack=function(f,type){
  baseAttack.call(this,f,type);
  // A hit only connects at close fighting distance. Projectiles keep their own path.
  if(f?.attack&&!f.attack.projectile)f.attack.reach=300;
};
StreetFight.prototype.update=function(dt){
  if(this.player)this.player.invuln=Math.max(0,(this.player.invuln||0)-dt);
  if(this.cpu)this.cpu.invuln=Math.max(0,(this.cpu.invuln||0)-dt);
  baseFightUpdate.call(this,dt);
  if(!this.player||!this.cpu||this.endTimer||this.countdown>0)return;
  // Keep two separate bodies: close enough for a jab, never inside each other.
  const gap=285,delta=this.cpu.x-this.player.x,distance=Math.abs(delta);
  if(distance>=gap)return;
  const sign=delta===0?1:Math.sign(delta),push=(gap-distance)/2;
  this.player.x=Math.max(170,Math.min(1110,this.player.x-sign*push));
  this.cpu.x=Math.max(170,Math.min(1110,this.cpu.x+sign*push));
  this.player.dir=this.cpu.x>=this.player.x?1:-1;
  this.cpu.dir=this.player.x>=this.cpu.x?1:-1;
};

// A fighter can recover into a back-block instead of being trapped in a chain.
StreetFight.prototype.playerInput=function(dt){
  const f=this.player;
  if(f?.hitstun>0&&this.isBlocking(f)){
    f.hitstun=0;f.guardTime=.16;f.state='guard';f.vx=0;
    return;
  }
  basePlayerInput.call(this,dt);
};

StreetFight.prototype.tryHit=function(attacker,target,a){
  if(target?.invuln>0){a.hit=true;return;}
  const before=target?.life;
  baseTryHit.call(this,attacker,target,a);
  if(target&&target.life!==before){
    target.invuln=target.guardTime>0?.10:.22;
    if(!target.guardTime)target.hitstun=Math.min(target.hitstun,.16);
  }
};

// Eight padded, independent poses per fighter. All source art faces right.
StreetFight.prototype.drawFighter=function(f){
  const pose=f.ko?'ko':f.win?'win':f.state==='guard'||f.state==='crouch'?'crouch':f.state==='hit'?'hit':f.attack?'attack':f.state==='walk'?(Math.floor(f.clock*9)%2?'walk1':'walk2'):'idle';
  const isolated=this.assets['frame_'+f.id+'_'+pose];
  const img=isolated||this.assets.motion||this.assets.states||this.assets[f.id+'Fallback'];
  if(!img||!img.complete||!img.naturalWidth)return;
  const ctx=this.ctx,motion=img===this.assets.motion,atlas=img===this.assets.states,row={birrow:0,halfred:1,hector:2,cesar:3}[f.id]??0;
  if(isolated){
    const w=img.naturalWidth*1.22,h=img.naturalHeight*1.22,walk=f.state==='walk'?Math.sin(f.clock*18)*3:0,lunge=f.attack?Math.sin(Math.min(1,f.attack.t/f.attack.duration)*Math.PI)*14:0,idle=f.state==='idle'?Math.sin(f.clock*4)*2:0;
    ctx.save();ctx.translate(f.x+f.dir*lunge,f.y+walk+idle);if(f.dir<0)ctx.scale(-1,1);ctx.drawImage(img,0,0,img.naturalWidth,img.naturalHeight,-w/2,-h,w,h);if(f.state==='guard'){ctx.strokeStyle='#75faff';ctx.lineWidth=4;ctx.globalAlpha=.85;ctx.beginPath();ctx.arc(0,-h*.52,38,Math.PI*.68,Math.PI*1.32);ctx.stroke();}ctx.restore();return;
  }
  const cols=motion?8:(atlas?5:6),cw=img.naturalWidth/cols,ch=img.naturalHeight/4;
  const walkFrame=1+Math.floor(f.clock*9)%2;
  const col=motion?(f.ko?6:f.win?7:f.state==='guard'||f.state==='crouch'?3:f.state==='hit'?5:f.attack?4:f.state==='walk'?walkFrame:0):(atlas?(f.ko?3:f.win?4:f.state==='guard'?1:f.state==='hit'?2:0):0);
  const pad=motion?16:(atlas?18:12),sw=cw-pad*2,sh=ch-pad*2,w=cw*1.22,h=ch*1.22;
  const walk=f.state==='walk'?Math.sin(f.clock*18)*3:0;
  const lunge=f.attack?Math.sin(Math.min(1,f.attack.t/f.attack.duration)*Math.PI)*14:0;
  const idle=f.state==='idle'?Math.sin(f.clock*4)*2:0;
  ctx.save();ctx.translate(f.x+f.dir*lunge,f.y+walk+idle);if(f.dir<0)ctx.scale(-1,1);
  ctx.drawImage(img,col*cw+pad,row*ch+pad,sw,sh,-w/2,-h,w,h);
  if(f.state==='guard'){
    ctx.strokeStyle='#75faff';ctx.lineWidth=4;ctx.globalAlpha=.85;ctx.beginPath();ctx.arc(0,-h*.52,38,Math.PI*.68,Math.PI*1.32);ctx.stroke();
  }
  ctx.restore();
};
