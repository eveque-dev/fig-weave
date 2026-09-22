// Original deterministic interface sounds only: no speech, samples, or music.
import {writeFileSync,mkdirSync} from 'node:fs';
const rate=48000, duration=32, pcm=new Float64Array(rate*duration);
let seed=1427;
const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
function sound(at,kind){const length=kind==='whoosh'?0.35:kind==='ding'?0.55:0.09;for(let n=0;n<length*rate;n++){const t=n/rate;const envelope=kind==='whoosh'?Math.sin(Math.PI*t/length)**2:Math.exp(-t/(kind==='ding'?0.12:0.016));const signal=kind==='whoosh'?noise()*0.095:kind==='ding'?(Math.sin(2*Math.PI*880*t)+0.35*Math.sin(2*Math.PI*1320*t))*0.16:(Math.sin(2*Math.PI*1100*t)*0.18+noise()*0.055);pcm[Math.floor(at*rate)+n]+=signal*envelope;}}
[[0.6,'click'],[1.57,'click'],[2.53,'click'],[5.1,'whoosh'],[9.2,'click'],[10.94,'click'],[12.73,'whoosh'],[13.47,'ding'],[17.3,'whoosh'],[18.1,'click'],[24.4,'whoosh'],[28.5,'whoosh'],[29.6,'ding']].forEach(([at,kind])=>sound(at,kind));
const peak=Math.max(...Array.from({length:320},(_,i)=>Math.max(...pcm.slice(i*4800,(i+1)*4800).map(Math.abs))));
if(peak>=1)throw Error('Audio clipping');
const wav=Buffer.alloc(44+pcm.length*4);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(pcm.length*4,40);pcm.forEach((value,i)=>{const v=Math.round(value*32767);wav.writeInt16LE(v,44+i*4);wav.writeInt16LE(v,46+i*4);});mkdirSync('public',{recursive:true});writeFileSync('public/sfx.wav',wav);console.log(`32s original SFX; peak ${peak.toFixed(3)}; no clipping`);
