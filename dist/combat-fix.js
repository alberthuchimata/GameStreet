'use strict';
// Combat state machine. The engine handles the round clock and drawing; these
// methods own fighter actions and their transitions.
const combatAttacks={
  jab:{duration:.34,active:[.11,.20],recovery:.13,damage:42,reach:365},
  kick:{duration:.50,active:[.19,.33],recovery:.19,damage:65,reach:405},
  heavy:{duration:.62,active:[.26,.41],recovery:.24,damage:82,reach:385},
  sweep:{duration:.68,active:[.27,.45],recovery:.25,damage:76,reach:410,knock:true},
  neon:{duration:.78,active:[.32,.47],recovery:.25,damage:88,reach:0,projectile:true,cost:35},
  spin:{duration:.72,active:[.27,.47],recovery:.28,damage:105,reach:425,knock:true,cost:50},
  charge:{duration:.72,active:[.29,.51],recovery:.26,damage:98,reach:395},
  pulse:{duration:.80,active:[.35,.57],recovery:.28,damage:86,reach:395,cost:40},
  special:{duration:1.12,active:[.41,.79],recovery:.33,damage:185,reach:440,cost:100,knock:true}
};
const combatBaseUpdate=StreetFight.prototype.update;
const combatBaseEndRound=StreetFight.prototype.endRound;

StreetFight.prototype.attack=function(f,type){
  const cfg=combatAttacks[type];
  if(!cfg||!f||this.paused||this.countdown>0||this.endTimer||f.life<=0||
     ['attack','hit','recovery','ko','win'].includes(f.state)||f.power<(cfg.cost||0))return false;
  f.power-=cfg.cost||0;
  f.attack={type,...cfg,t:0,hit:false,spawned:false};
  f.state='attack';f.crouch=false;f.vx=type==='charge'?f.dir*220:0;
  f.clock=0;f.frame=0;
  if(f.side==='c')f.aiCooldown=.75;
  window.arcadeAudio.effect(['neon','pulse','special'].includes(type)?'start':'confirm');
  return true;
};
StreetFight.prototype.isBlocking=function(f){
  const back=f.dir>0?'arrowleft':'arrowright';
  return f.side==='p'&&f.ground&&f.life>0&&this.keys.has(back)&&!['attack','hit','recovery','ko','win'].includes(f.state);
};
StreetFight.prototype.playerInput=function(){
  const f=this.player;
  if(f.life<=0||['attack','hit','recovery','ko','win'].includes(f.state)||this.countdown>0||this.endTimer)return;
  const left=this.keys.has('arrowleft'),right=this.keys.has('arrowright');
  const down=this.keys.has('arrowdown');
  const back=f.dir>0?left:right;
  const incoming=this.cpu.attack&&Math.abs(this.cpu.x-f.x)<this.cpu.attack.reach+25;
  if(back&&incoming){f.state='guard';f.vx=0;f.crouch=false;return;}
  if(down){f.state='crouch';f.vx=0;f.crouch=true;return;}
  f.crouch=false;
  if(this.pressed.has('arrowup')&&f.ground){f.vy=-650;f.ground=false;f.state='jump';}
  const move=(right?1:0)-(left?1:0);
  if(f.ground)f.state=move?'walk':'idle';
  f.vx=move*(this.keys.has('shift')?390:225);
};
StreetFight.prototype.cpuThink=function(dt){
  const f=this.cpu,p=this.player;
  if(f.life<=0||['attack','hit','recovery','ko','win'].includes(f.state)||this.countdown>0||this.endTimer)return;
  f.ai=(f.ai||0)-dt;f.aiCooldown=Math.max(0,(f.aiCooldown||0)-dt);
  const distance=Math.abs(p.x-f.x);
  if(p.attack&&distance<415&&Math.random()<.025){f.vx=0;f.state='guard';return;}
  if(distance>375){f.vx=f.dir*165;f.state='walk';return;}
  f.vx=0;f.state='idle';
  if(f.ai>0||f.aiCooldown>0)return;
  f.ai=.35+Math.random()*.35;
  if(Math.random()<.65)this.attack(f,f.power>=100&&Math.random()<.22?'special':f.power>=40&&Math.random()<.25?'pulse':Math.random()<.35?'kick':'charge');
};
StreetFight.prototype.updateFighter=function(f,dt){
  f.clock+=dt;
  if(f.state==='attack'&&f.attack){
    const a=f.attack;a.t+=dt;
    if(a.type==='charge')f.vx=f.dir*300;
    if(a.projectile&&!a.spawned&&a.t>=a.active[0]){
      a.spawned=true;
      this.projectiles.push({owner:f,x:f.x+f.dir*90,y:f.y-145,vx:f.dir*430,life:1.8,damage:a.damage});
    }
    if(!a.projectile&&!a.hit&&a.t>=a.active[0]&&a.t<=a.active[1])
      this.tryHit(f,f.side==='p'?this.cpu:this.player,a);
    if(a.t>=a.duration){f.attack=null;f.state='recovery';f.recovery=a.recovery;f.vx=0;}
  }else if(f.state==='hit'){
    f.hitstun=Math.max(0,(f.hitstun||0)-dt);
    f.vx*=.84;
    if(f.hitstun===0){f.state='recovery';f.recovery=.12;}
  }else if(f.state==='recovery'){
    f.recovery=Math.max(0,(f.recovery||0)-dt);f.vx*=.7;
    if(f.recovery===0)f.state='idle';
  }else if(f.state==='guard')f.vx=0;
  if(!f.ground){
    f.vy+=1800*dt;f.y+=f.vy*dt;
    if(f.y>=this.floorY){f.y=this.floorY;f.vy=0;f.ground=true;if(f.state==='jump')f.state='idle';}
  }
  f.x=Math.max(120,Math.min(1160,f.x+f.vx*dt));
  if(f.state!=='walk'&&f.state!=='attack')f.vx*=.82;
};
StreetFight.prototype.tryHit=function(attacker,target,a){
  if(a.hit||target.life<=0||target.invuln>0)return;
  if(!a.fromProjectile&&(target.x-attacker.x)*attacker.dir<0)return;
  if(Math.abs(target.x-attacker.x)>a.reach)return;
  a.hit=true;
  const blocking=this.isBlocking(target)||target.side==='c'&&target.state==='guard';
  target.life=Math.max(0,target.life-Math.round(a.damage*(blocking?.18:1)));
  target.power=Math.min(100,target.power+(blocking?10:16));
  attacker.power=Math.min(100,attacker.power+10);
  target.attack=null;target.vx=attacker.dir*(blocking?90:220);
  target.hitstun=blocking?0:.23;target.recovery=blocking?.14:0;
  target.state=blocking?'recovery':'hit';target.invuln=blocking?.13:.27;
  this.hitBursts.push({x:target.x-attacker.dir*42,y:target.y-145,t:0,blocked:blocking,special:a.type==='special'});
  if(blocking)this.callout('BLOCK!');
  window.arcadeAudio.effect(blocking?'move':'confirm');this.updateHud();
};
StreetFight.prototype.update=function(dt){
  if(this.player)this.player.invuln=Math.max(0,(this.player.invuln||0)-dt);
  if(this.cpu)this.cpu.invuln=Math.max(0,(this.cpu.invuln||0)-dt);
  const side=this.player&&this.cpu?(this.cpu.x>=this.player.x?1:-1):1;
  combatBaseUpdate.call(this,dt);
  if(!this.player||!this.cpu||this.endTimer||this.countdown>0)return;
  const left=side>0?this.player:this.cpu,right=side>0?this.cpu:this.player;
  const minimum=292;
  if(right.x-left.x<minimum){
    const target=Math.max(120,Math.min(1160-minimum,(left.x+right.x-minimum)/2));
    left.x=target;right.x=target+minimum;
    if(left.vx>0)left.vx=0;if(right.vx<0)right.vx=0;
  }
  this.player.dir=this.cpu.x>this.player.x?1:-1;
  this.cpu.dir=-this.player.dir;
};
StreetFight.prototype.endRound=function(){
  if(this.endTimer)return;
  combatBaseEndRound.call(this);
  const loser=this.koFighter,winner=loser===this.player?this.cpu:this.player;
  loser.state='ko';loser.attack=null;loser.vx=0;
  winner.state='win';winner.attack=null;winner.vx=0;
};

// The motion atlas uses four rows of different heights; equal-height slicing
// pulls shoes from the previous fighter and cuts off feet.
StreetFight.prototype.drawFighter=function(f){
  const img=this.assets.motion;
  if(!img?.complete||!img.naturalWidth)return;
  const row={birrow:0,halfred:1,hector:2,cesar:3}[f.id]??0;
  const bounds=[0,265,485,705,887];
  const col=f.state==='ko'?6:f.state==='win'?7:f.state==='guard'||f.state==='crouch'?3:f.state==='hit'?5:f.state==='attack'?4:f.state==='walk'?(Math.floor(f.clock*9)%2?1:2):0;
  const cellW=img.naturalWidth/8,top=bounds[row],cellH=bounds[row+1]-top;
  const scale=row===0?1.28:1.42,w=cellW*scale,h=cellH*scale;
  const bob=f.state==='walk'?Math.sin(f.clock*18)*3:0;
  const lunge=f.state==='attack'&&f.attack?Math.sin(Math.min(1,f.attack.t/f.attack.duration)*Math.PI)*14:0;
  const ctx=this.ctx;ctx.save();ctx.translate(f.x+f.dir*lunge,f.y+bob);
  if(f.dir<0)ctx.scale(-1,1);
  ctx.drawImage(img,col*cellW,top,cellW,cellH,-w/2,-h,w,h);
  if(f.state==='guard'){
    ctx.strokeStyle='#75faff';ctx.lineWidth=4;ctx.globalAlpha=.85;
    ctx.beginPath();ctx.arc(0,-h*.52,38,Math.PI*.68,Math.PI*1.32);ctx.stroke();
  }
  ctx.restore();
};
