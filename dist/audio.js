/* Original procedural score and arcade effects. No recordings or third-party samples. */
class ArcadeAudio {
  constructor(){this.ctx=null;this.enabled=true;this.scene='studio';this.step=0;this.timer=null;this.next=0;this.stats={steps:0,effects:0};}
  async unlock(){
    if(!this.enabled)return false;
    try{
      if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;this.ctx=new C();this.master=this.ctx.createGain();this.master.gain.value=.36;this.compressor=this.ctx.createDynamicsCompressor();this.compressor.threshold.value=-15;this.compressor.ratio.value=5;this.master.connect(this.compressor).connect(this.ctx.destination);
        this.noise=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate);const n=this.noise.getChannelData(0);let seed=42;for(let i=0;i<n.length;i++){seed=(seed*1664525+1013904223)>>>0;n[i]=(seed/4294967296)*2-1;}
      }
      await this.ctx.resume();if(!this.timer){this.next=this.ctx.currentTime+.06;this.timer=setInterval(()=>this.schedule(),25);}return this.ctx.state==='running';
    }catch{return false;}
  }
  setScene(scene){this.scene=scene;this.step=0;if(this.ctx)this.next=this.ctx.currentTime+.09;}
  async toggle(){this.enabled=!this.enabled;if(this.ctx)this.master.gain.setTargetAtTime(this.enabled?.36:0,this.ctx.currentTime,.04);if(this.enabled)await this.unlock();return this.enabled;}
  note(midi,time,duration,volume=.08,type='triangle',destination=this.master){
    const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=440*Math.pow(2,(midi-69)/12);g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(volume,time+.008);g.gain.exponentialRampToValueAtTime(.0001,time+duration);o.connect(g).connect(destination);o.start(time);o.stop(time+duration+.02);o.onended=()=>{o.disconnect();g.disconnect()};
  }
  lead(midi,time,duration,volume=.045){
    // Two-operator FM bell/brass voice with a short percussive envelope.
    const c=this.ctx,f=440*Math.pow(2,(midi-69)/12),o=c.createOscillator(),mod=c.createOscillator(),mg=c.createGain(),g=c.createGain();o.frequency.value=f;mod.frequency.value=f*2;mg.gain.setValueAtTime(f*1.35,time);mg.gain.exponentialRampToValueAtTime(f*.06,time+duration);mod.connect(mg).connect(o.frequency);g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(volume,time+.009);g.gain.exponentialRampToValueAtTime(.0001,time+duration);o.connect(g).connect(this.master);o.start(time);mod.start(time);o.stop(time+duration+.02);mod.stop(time+duration+.02);o.onended=()=>{o.disconnect();mod.disconnect();g.disconnect();mg.disconnect()};
  }
  noiseHit(time,duration,volume,cutoff){const c=this.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noise;f.type='highpass';f.frequency.value=cutoff;g.gain.setValueAtTime(volume,time);g.gain.exponentialRampToValueAtTime(.0001,time+duration);s.connect(f).connect(g).connect(this.master);s.start(time);s.stop(time+duration);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect()};}
  kick(t){const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.frequency.setValueAtTime(145,t);o.frequency.exponentialRampToValueAtTime(42,t+.15);g.gain.setValueAtTime(.32,t);g.gain.exponentialRampToValueAtTime(.001,t+.2);o.connect(g).connect(this.master);o.start(t);o.stop(t+.21);o.onended=()=>{o.disconnect();g.disconnect()};}
  schedule(){if(!this.ctx||this.ctx.state!=='running'||!this.enabled||document.hidden||this.scene==='studio')return;if(this.next<this.ctx.currentTime-.2)this.next=this.ctx.currentTime+.03;const dt=60/(this.scene==='title'?124:136)/4;while(this.next<this.ctx.currentTime+.12){this.tick(this.step++,this.next,dt);this.next+=dt;this.stats.steps++;}}
  tick(step,t,d){
    const s=step%16,bar=Math.floor(step/16)%8,root=[45,45,41,43,45,48,41,43][bar];
    if(s===0||s===8||s===10)this.kick(t);
    if(s===4||s===12){this.noiseHit(t,.13,.19,1250);this.note(50,t,.095,.12,'triangle');}
    if(s%2===0)this.noiseHit(t,s===14?.13:.035,s%4===0?.055:.035,6500);
    if([0,3,6,8,11,14].includes(s))this.note(root+(s===6||s===14?12:0),t,d*1.4,.14,'triangle');
    if(s===2||s===10){[0,3,7,10].forEach((n,i)=>this.note(root+12+n,t+i*.004,d*1.6,.023,'sawtooth'));}
    const titleMelody=[[0,null,7,10,null,12,10,7],[3,null,7,5,3,null,2,0],[0,7,null,10,12,14,12,null],[7,5,3,null,2,0,null,null]];
    const selectMelody=[[12,7,10,null,12,15,14,10],[7,null,10,12,7,5,3,null],[12,10,7,null,5,7,10,7],[3,5,7,10,7,null,2,0]];
    if(s%2===0){const n=(this.scene==='title'?titleMelody:selectMelody)[bar%4][s/2];if(n!==null)this.lead(root+24+n,t,d*(s===14?2.7:1.6),.075);}
    if(this.scene!=='title'&&s%2===1)this.note(root+24+[0,7,12,7][Math.floor(s/2)%4],t,d*.65,.022,'square');
  }
  effect(kind){if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;this.stats.effects++;const t=this.ctx.currentTime+.015;const sequences={move:[81,88],back:[72,64],start:[57,64,69,76,81],confirm:[69,76,81,88],open:[64,71,76]};(sequences[kind]||sequences.move).forEach((n,i)=>this.note(n,t+i*.055,.11,kind==='move'?.055:.09,'square'));if(kind==='confirm'||kind==='start'){this.kick(t);this.noiseHit(t,.16,.07,3300);}}
  status(){return{enabled:this.enabled,context:this.ctx?.state||'locked',scene:this.scene,...this.stats};}
}
window.arcadeAudio=new ArcadeAudio();
document.addEventListener('visibilitychange',()=>{const a=window.arcadeAudio;if(!a.ctx)return;if(document.hidden)a.ctx.suspend();else if(a.enabled)a.ctx.resume().catch(()=>{});});
