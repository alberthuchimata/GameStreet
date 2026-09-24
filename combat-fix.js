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
