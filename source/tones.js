/* Local, deterministic-with-an-injected-RNG pinyin tone choices. */
(function(root){
'use strict';
const marks=['','\u0304','\u0301','\u030c','\u0300'];
function withoutTone(text){return text.normalize('NFD').replace(/[\u0304\u0301\u030c\u0300]/g,'').normalize('NFC')}
function toneOf(syllable){const mark=[...syllable.normalize('NFD')].find(c=>marks.slice(1).includes(c));return mark?marks.indexOf(mark):/[aeiouü]/i.test(syllable)?0:null}
function mark(syllable,tone){
 const plain=withoutTone(syllable);if(tone===0)return plain;
 if(!Number.isInteger(tone)||tone<1||tone>4)throw Error('Invalid pinyin tone');
 const chars=[...plain],lower=plain.toLowerCase();let index=lower.indexOf('a');
 if(index<0)index=lower.indexOf('e');
 if(index<0&&lower.includes('ou'))index=lower.indexOf('o');
 if(index<0)for(let i=chars.length-1;i>=0;i--)if(/[iouü]/i.test(chars[i])){index=i;break}
 if(index<0)return plain; // A fixed Latin letter, as in T恤, has no Mandarin tone.
 chars[index]=(chars[index].normalize('NFD')+marks[tone]).normalize('NFC');return chars.join('');
}
function shuffled(items,random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function quiz(syllables,random=Math.random){
 if(!Array.isArray(syllables)||!syllables.length)return null;
 const tones=syllables.map(toneOf),indices=tones.map((t,i)=>t===null?-1:i).filter(i=>i>=0);
 if(!indices.length)return null;
 const answer=syllables.join(' '),correct={text:answer,tones},singles=[];
 for(const i of indices)for(let tone=0;tone<=4;tone++)if(tone!==tones[i]){
  const parts=[...syllables],changed=[...tones];parts[i]=mark(parts[i],tone);changed[i]=tone;singles.push({text:parts.join(' '),tones:changed,index:i});
 }
 const wrong=[],used=new Set([answer]);const add=c=>{if(c&&!used.has(c.text)){used.add(c.text);wrong.push(c)}};
 const order=shuffled(indices,random);
 for(const i of order.slice(0,2))add(shuffled(singles.filter(c=>c.index===i),random)[0]);
 if(indices.length>1){const shift=1+Math.floor(random()*4),parts=syllables.map((s,i)=>tones[i]===null?s:mark(s,(tones[i]+shift)%5));add({text:parts.join(' '),tones:parts.map(toneOf)})}
 for(const c of shuffled(singles,random)){if(wrong.length>=3)break;add(c)}
 const choices=shuffled([correct,...wrong.slice(0,3)],random).map(({text,tones})=>({text,tones}));
 return {answer,tones,choices};
}
function describe(tones){const names=['neutral (light)','1st (high)','2nd (rising)','3rd (low/dipping)','4th (falling)'];return tones.filter(t=>t!==null).map(t=>names[t]).join(' + ')}
const api={withoutTone,toneOf,mark,quiz,describe};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CoachTones=api;
})(typeof window!=='undefined'?window:globalThis);
