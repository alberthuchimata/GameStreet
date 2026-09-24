'use strict';
// Hard separation layer: the visual bodies never share the same fighting space.
const baseFightUpdate=StreetFight.prototype.update;
const baseAttack=StreetFight.prototype.attack;
StreetFight.prototype.attack=function(f,type){
  baseAttack.call(this,f,type);
  if(f?.attack&&!f.attack.projectile)f.attack.reach=Math.max(f.attack.reach,370);
};
StreetFight.prototype.update=function(dt){
  baseFightUpdate.call(this,dt);
  if(!this.player||!this.cpu||this.endTimer||this.countdown>0)return;
  const gap=335,delta=this.cpu.x-this.player.x,distance=Math.abs(delta);
  if(distance>=gap)return;
  const sign=delta===0?1:Math.sign(delta),push=(gap-distance)/2;
  this.player.x=Math.max(170,Math.min(1110,this.player.x-sign*push));
  this.cpu.x=Math.max(170,Math.min(1110,this.cpu.x+sign*push));
  this.player.dir=this.cpu.x>=this.player.x?1:-1;
  this.cpu.dir=this.player.x>=this.cpu.x?1:-1;
};

// Isolated rendering path for the padded atlas. It does not depend on the old sheet processor.
StreetFight.prototype.drawFighter=function(f){
  const img=this.assets.states||this.assets[f.id+'Fallback'];
  if(!img||!img.complete||!img.naturalWidth)return;
  const ctx=this.ctx,atlas=img===this.assets.states,row={birrow:0,halfred:1,hector:2,cesar:3}[f.id]??0;
  const cols=atlas?5:6,rows=atlas?4:4,cw=img.naturalWidth/cols,ch=img.naturalHeight/rows;
  const phase=Math.floor(f.clock*7)%2;
  const col=atlas?(f.ko?3:f.win?4:f.state==='guard'?1:f.state==='hit'?2:f.attack?(f.attack.type==='special'?4:(f.attack.t<f.attack.duration*.42?0:2)):f.state==='walk'?phase:0):0;
  const pad=atlas?18:12,sw=cw-pad*2,sh=ch-pad*2,w=cw*1.2,h=ch*1.2;
  const walk=f.state==='walk'?Math.sin(f.clock*14)*5:0;
  const lunge=f.attack?Math.sin(Math.min(1,f.attack.t/f.attack.duration)*Math.PI)*30:0;
  const idle=Math.sin(f.clock*4)*2;
  ctx.save();ctx.translate(f.x+f.dir*lunge,f.y+walk+idle);if(f.dir<0)ctx.scale(-1,1);if(f.state==='crouch'||f.state==='guard')ctx.scale(1,.88);
  ctx.drawImage(img,col*cw+pad,row*ch+pad,sw,sh,-w/2,-h,w,h);
  ctx.restore();
};
