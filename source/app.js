'use strict';
const E=CoachEngine,DECK=JSON.parse(document.getElementById('deck-data').textContent),byId=new Map(DECK.map(c=>[c.id,c]));
const KEY='mandarin-remember:reviewed:v1',$=id=>document.getElementById(id);
let storageLocked=false,state=load(),session=null,current=null,revealed=false,graded=false,assisted=false,inputMode='spoken',heard=false,importCandidate=null,libraryLimit=30,lastCardId=null;
let audioToken=0,activeAudio=null,activeUtterance=null,audioTimer=null;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=t=>new Date(t).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const normalize=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function notice(text){$('notice').textContent=text}
function storageError(message){$('storageWarning').textContent=message;$('storageWarning').hidden=false}
function load(){try{const raw=localStorage.getItem(KEY);const loaded=raw?E.validate(JSON.parse(raw),DECK):E.empty();storageLocked=false;$('storageWarning').hidden=true;return loaded}catch(error){storageLocked=true;storageError('Saved progress could not be read. It has not been overwritten. You can practise in memory, export this session, or restore a valid backup.');return E.empty()}}
function save(){if(storageLocked)return false;try{localStorage.setItem(KEY,JSON.stringify(state));return true}catch(error){storageError('This browser could not save progress. Keep this tab open and export a backup before leaving.');return false}}
function show(page){stopAudio();for(const id of ['home','practice','done','library','settings','guide'])$(id).hidden=id!==page;window.scrollTo({top:0,behavior:'instant'})}
function home(){session=null;current=null;show('home');renderHome()}
function renderHome(){const now=Date.now(),due=E.dueTasks(state,now,null,DECK),n=E.newAllowance(state,now,DECK),r=E.retention(state,now);
 $('dueCount').textContent=due.length;$('startedCount').textContent=Object.keys(state.items).length;$('holdingCount').textContent=Object.values(state.items).filter(E.holding).length;
 $('retention').textContent=r.total?`${r.passed} / ${r.total} recalled`:'Not enough delayed reviews yet';
 $('dailyText').textContent=`New cards started today: ${n.used}. ${n.reason?n.reason+' — new cards paused.':n.count+' more available today.'}`;
 const next=nextDue();$('planText').textContent=due.length?`Start with up to ${state.settings.reviewLimit} due reviews. ${n.count?`Then up to ${n.count} new cards.`:'No new cards to add right now.'}`:n.count?`Up to ${n.count} new cards, then short retrieval steps.`:next?`Next scheduled review: ${fmt(next)}. Extra practice is optional.`:'Choose a small daily new-card limit to get started.';
 $('newLimit').value=String(state.settings.newLimit);$('reviewLimit').value=String(state.settings.reviewLimit);
}
function nextDue(){const times=Object.values(state.items).filter(i=>!i.suspended).flatMap(i=>E.directions.map(d=>i[d].due));return times.length?Math.min(...times):null}
function start(practice=false){const tasks=E.plan(state,Date.now(),DECK,$('category').value,practice);
 if(!tasks.length){notice(practice?'Start some cards first; then you can do extra recall practice.':'Nothing is ready in this selection. Choose all topics, return later, or use optional extra practice.');renderHome();return}
 session={queue:tasks,attempts:0,studied:0,missed:0,retries:{},started:Date.now(),practice};lastCardId=null;notice('');show('practice');advance();
}
function advance(){stopAudio();if(!session)return;session.queue=session.queue.filter(t=>!state.items[t.id]?.suspended);const now=Date.now();
 // Due learning steps take priority over introducing another item. Avoid immediate sibling cues when possible.
 let ready=session.queue.filter(t=>t.readyAt<=now&&(!state.items[t.id]||!state.items[t.id].suspended));
 const retrieval=ready.filter(t=>t.direction!=='intro');if(retrieval.length)ready=retrieval;
 const task=ready.find(t=>t.id!==lastCardId)||ready[0];
 if(!task){if(!session.queue.length){finish();return}current=null;$('flashcard').hidden=true;$('waiting').hidden=false;renderWaiting();return}
 session.queue.splice(session.queue.indexOf(task),1);
 if(task.direction==='intro'&&(state.items[task.id]||E.newAllowance(state,now,DECK).count===0)){advance();return}
 current=task;lastCardId=task.id;revealed=task.direction==='intro';graded=false;assisted=false;heard=false;inputMode=task.direction==='understand'?'listening':'spoken';
 const c=byId.get(task.id);$('waiting').hidden=true;$('flashcard').hidden=false;$('sessionProgress').textContent=`Recall attempts: ${session.attempts} · New cards studied: ${session.studied}`;
 $('taskType').textContent=task.direction==='intro'?'STUDY A NEW ITEM':task.practice?'OPTIONAL EARLY RECALL':task.direction==='produce'?'RECALL · SAY IT IN MANDARIN':'RECALL · UNDERSTAND MANDARIN';
 $('taskCategory').textContent=c.category;$('prompt').textContent=task.direction==='intro'?'Meet this item.':task.direction==='produce'?c.meaning:'What does it mean?';
 $('taskInstruction').textContent=task.direction==='intro'?'Read, listen and say it once. Studying is the first step; a later retrieval checks what you remember.':task.direction==='produce'?'Say the Mandarin before revealing it. Aim for the meaning and tones; familiar-looking answers are not the same as recall.':'Listen without looking at the pinyin. Recall the meaning before revealing it. If audio is unavailable, choose the reading prompt.';
 $('draft').value='';$('draftLabel').hidden=revealed;$('listenTools').hidden=task.direction!=='understand';$('readingPrompt').hidden=true;$('readingPrompt').textContent='';
 $('hint').hidden=true;$('hint').textContent='';$('helpTools').hidden=revealed;$('hintBtn').textContent=task.direction==='produce'?'First syllable (help)':'Show pinyin (help)';$('cueBtn').hidden=!state.items[c.id]?.note;
 $('revealBtn').hidden=revealed;$('revealBtn').disabled=false;$('answer').hidden=!revealed;
 $('hanzi').textContent=c.zh;$('pinyin').textContent=c.pinyin;$('meaning').textContent=c.meaning;$('memoryCue').value=state.items[c.id]?.note||'';
 $('ratings').hidden=true;$('studiedBtn').hidden=!revealed;$('nextBtn').hidden=true;$('scheduledResult').textContent='';$('ratingHelp').textContent='';$('audioStatus').textContent='';$('suspendBtn').hidden=!state.items[c.id];
 if(revealed)$('ratingHelp').textContent='No memory score for studying. The app will ask you to produce it after a short gap and revisit its meaning tomorrow.';
}
function renderWaiting(){if(!session||current)return;const next=Math.min(...session.queue.map(t=>t.readyAt));$('waitText').textContent=`Your next retrieval step is ready ${next<=Date.now()?'now':`in about ${Math.max(1,Math.ceil((next-Date.now())/60000))} minute(s)`}.`}
function readInstead(){if(!current||current.direction!=='understand'||revealed)return;inputMode='reading';$('readingPrompt').textContent=byId.get(current.id).zh;$('readingPrompt').hidden=false;$('taskInstruction').textContent='Read the characters and recall the meaning. This attempt is recorded as reading, not listening.'}
function reveal(){if(!current||revealed||graded)return;if(current.direction==='understand'&&!heard&&inputMode!=='reading'){audioStatus('Play the phrase first, or choose “Read characters instead.”');return}
 revealed=true;$('answer').hidden=false;$('revealBtn').hidden=true;$('helpTools').hidden=true;$('ratings').hidden=false;
 $('ratingHelp').textContent=assisted?'You used help. This is practice, not unaided recall; choose “Missed / needed help.”':'Judge the attempt you made BEFORE revealing. If you were blank or needed a key word/tone supplied, choose “Missed / needed help.”';
 for(const b of document.querySelectorAll('[data-grade]'))b.disabled=assisted&&b.dataset.grade!=='0';
}
function help(kind){if(!current||revealed)return;assisted=true;const c=byId.get(current.id);$('hint').hidden=false;$('hint').textContent=kind==='cue'?state.items[current.id].note:current.direction==='produce'?firstSyllable(c.pinyin):c.pinyin;
}
function firstSyllable(p){const match=p.match(/^([bpmfdtnlgkhjqxrzcswy]*[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜaeiouü]+(?:ng|n|r)?)/i);return (match?match[1]:p.split(' ')[0])+'…'}
function studied(){if(!current||graded||current.direction!=='intro')return;graded=true;const now=Date.now();E.introduce(state,current.id,now);session.studied++;save();session.queue.push({id:current.id,direction:'produce',readyAt:now+E.MIN});$('studiedBtn').hidden=true;$('nextBtn').hidden=false;$('scheduledResult').textContent='First retrieval in about 1 minute. Meaning review tomorrow.';$('suspendBtn').hidden=false}
function rate(grade){if(!current||!revealed||graded||current.direction==='intro')return;graded=true;const now=Date.now();const event=E.review(state,current.id,current.direction,grade,now,{assisted,practice:!!current.practice,input:inputMode});session.attempts++;if(event.grade===0)session.missed++;
 $('ratings').hidden=true;$('nextBtn').hidden=false;save();
 const t=state.items[current.id][current.direction];$('scheduledResult').textContent=event.practice?'Extra practice recorded. Your scheduled due date is unchanged.':`Next ${current.direction==='produce'?'Mandarin recall':'meaning recall'}: ${fmt(t.due)}.`;
 const retryKey=current.id+'/'+current.direction;const retries=session.retries[retryKey]||0;
 if(!event.practice&&t.due-now<=10*E.MIN&&retries<2){session.retries[retryKey]=retries+1;session.queue.push({id:current.id,direction:current.direction,readyAt:t.due})}
 if(t.lapses>=5)$('scheduledResult').textContent+=' This item needs attention: add a cue or pause it and ask for help with the phrase.';
}
function finish(){if(!session){home();return}const info={...session};session=null;current=null;show('done');$('doneSummary').textContent=`Recall attempts: ${info.attempts}; ${info.missed} needed another try. New cards studied: ${info.studied}. ${storageLocked?'Export a backup to keep this session.':'Progress is saved after each answer when browser storage is available.'}`;const next=nextDue();$('nextReviewText').textContent=next?`Next review ${next<=Date.now()?'is ready now':`is due ${fmt(next)}`}. You can finish for today even if reviews remain.`:'No scheduled reviews yet.'}
function pauseCurrent(){if(!current||!state.items[current.id])return;state.items[current.id].suspended=true;session.queue=session.queue.filter(t=>t.id!==current.id);save();advance()}
function saveCue(){if(!current)return;const item=state.items[current.id];if(!item){audioStatus('Choose “I’ve studied it” first, then save your cue.');return}item.note=$('memoryCue').value.slice(0,1000);save();audioStatus('Memory cue saved locally.')}
function renderLibrary(){const q=normalize($('search').value);const matches=DECK.filter(c=>!q||normalize([c.zh,c.pinyin,c.meaning,c.category].join(' ')).includes(q));$('libraryCount').textContent=`${matches.length} items · showing ${Math.min(libraryLimit,matches.length)}`;$('moreBtn').hidden=libraryLimit>=matches.length;
 $('libraryList').innerHTML=matches.slice(0,libraryLimit).map(c=>{const item=state.items[c.id];return `<article class="phrase"><div class="small">${esc(c.category)}${item?.suspended?' · paused':''}</div><div class="hanzi" lang="zh-CN">${esc(c.zh)}</div><div class="pinyin">${esc(c.pinyin)}</div><p>${esc(c.meaning)}</p><div class="row"><button class="secondary" data-play="${c.id}">Listen</button><button class="quiet" data-slow="${c.id}">Slow</button>${item?`<button class="quiet" data-toggle="${c.id}">${item.suspended?'Resume reviews':'Pause card'}</button>`:''}</div></article>`}).join('');
 for(const b of document.querySelectorAll('[data-play]'))b.onclick=()=>play(byId.get(b.dataset.play));for(const b of document.querySelectorAll('[data-slow]'))b.onclick=()=>play(byId.get(b.dataset.slow),true);
 for(const b of document.querySelectorAll('[data-toggle]'))b.onclick=()=>{const item=state.items[b.dataset.toggle];item.suspended=!item.suspended;save();renderLibrary()};
}
function audioStatus(text){$('audioStatus').textContent=text;$('settingsAudioStatus').textContent=text;notice(text)}
function stopAudio(){audioToken++;clearTimeout(audioTimer);if(activeAudio){activeAudio.pause();activeAudio.removeAttribute('src');activeAudio.load();activeAudio=null}if('speechSynthesis' in window)window.speechSynthesis.cancel();activeUtterance=null}
function voices(){if(!('speechSynthesis' in window))return [];return window.speechSynthesis.getVoices().filter(v=>/^(zh-(cn|tw|sg)|cmn)(-|$)/i.test(v.lang.replaceAll('_','-'))||v.lang==='zh')}
function refreshVoices(){const list=voices();$('voiceSelect').innerHTML='<option value="">Choose automatically</option>'+list.map(v=>`<option value="${esc(v.name)}">${esc(v.name)} · ${esc(v.lang)}</option>`).join('');$('voiceSelect').value=state.settings.voice}
function play(card,slow=false,prompt=false,test=false){stopAudio();const token=audioToken;const markPlayed=()=>{if(token!==audioToken)return;if(prompt&&current?.id===card.id&&!revealed)heard=true;audioStatus(test?'Test sentence: “Would you like some water?” · '+(useOnline?'Xiaoxiao · online':'device Mandarin voice'):useOnline?'Playing Mandarin · Xiaoxiao online':'Playing Mandarin · device voice')};
 const mode=state.settings.audioMode,useOnline=mode==='online'||(mode==='auto'&&window.ONLINE_VOICE_ENABLED===true);
 if(useOnline){if(!window.ONLINE_VOICE_ENABLED){audioStatus('Online speech needs the local helper. Run start-online.sh and open its address, or choose a device voice.');return}audioStatus('Preparing Mandarin audio… The selected Chinese phrase is sent to the speech service.');
 const audio=new Audio('/api/speech?id='+encodeURIComponent(card.id)+'&slow='+(slow?'1':'0'));activeAudio=audio;let failed=false;
 const fail=()=>{if(token!==audioToken||failed)return;failed=true;activeAudio=null;audioStatus('Online audio could not load. Check the internet/helper and retry, or choose a device voice. You can also use the reading prompt.')};audio.onerror=fail;audio.onplaying=markPlayed;audio.onended=()=>{if(token===audioToken){activeAudio=null;if(test)audioStatus('Test finished · Xiaoxiao online. This confirms playback, not pronunciation accuracy.')}};
 try{audio.play().catch(error=>{if(token!==audioToken)return;if(error.name==='NotAllowedError'){failed=true;audioStatus('Allow sound for this page, then press Play again.')}else fail()})}catch(error){fail()}return;
 }
 let tries=0;const attempt=()=>{if(token!==audioToken)return;const list=voices();const voice=list.find(v=>v.name===state.settings.voice)||list.find(v=>/^zh[-_]CN$/i.test(v.lang))||list.find(v=>v.default)||list[0];if(!voice){if(tries++<6){audioTimer=setTimeout(attempt,250);return}audioStatus('No Mandarin voice is available in this browser. Choose the online helper or install/select Mandarin in your device’s text-to-speech settings. Reading practice is still available.');return}
 const u=new SpeechSynthesisUtterance(card.zh);activeUtterance=u;u.lang=voice.lang;u.voice=voice;u.rate=slow?.65:.9;
 u.onstart=()=>{if(token!==audioToken)return;clearTimeout(audioTimer);markPlayed()};u.onend=()=>{if(token===audioToken){clearTimeout(audioTimer);activeUtterance=null;if(test)audioStatus('Test finished · '+voice.name+'. Judge the sound you hear; this app cannot verify your speaker output.')}};
 u.onerror=e=>{if(token===audioToken&&!['canceled','interrupted'].includes(e.error)){clearTimeout(audioTimer);audioStatus('Speech error: '+e.error+'. Try a different Mandarin voice, or use the reading prompt.')}};
 audioStatus('Starting '+voice.name+'…');audioTimer=setTimeout(()=>{if(token===audioToken)audioStatus('The voice did not confirm playback. Try the audio test in Audio & backup, or choose reading practice.')},8000);
 try{window.speechSynthesis.resume();window.speechSynthesis.speak(u)}catch(error){clearTimeout(audioTimer);audioStatus('Could not start the device voice. Choose another audio source.')}
 };attempt();
}
function audioSettings(){show('settings');$('audioMode').value=state.settings.audioMode;refreshVoices();$('audioExplanation').textContent=window.ONLINE_VOICE_ENABLED?'Online voice available: Xiaoxiao (Mandarin). Only phrases you play are sent to the speech service; a small local cache avoids repeat requests.':'This website uses your device’s Mandarin voice. On Android, select or install a Mandarin voice in your phone’s text-to-speech settings, then reload and play the test sentence. The laptop’s online speech helper does not run on this website.'}
function exportBackup(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`mandarin-remember-${E.localDay(Date.now())}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('Backup download requested. Keep it somewhere you can find again.')}
async function readImport(file){if(!file)return;importCandidate=null;$('importPreview').hidden=true;try{if(file.size>4000000)throw Error('Backup is too large');importCandidate=E.validate(JSON.parse(await file.text()),DECK);$('importInfo').textContent=`This backup contains ${Object.keys(importCandidate.items).length} started cards and ${importCandidate.logs.length} attempts. Import replaces this browser’s current progress. Export your current backup first if you want to keep it.`;$('importPreview').hidden=false}catch(error){notice('Backup was not imported: '+error.message)}}
function confirmImport(){if(!importCandidate)return;const candidate=importCandidate;try{localStorage.setItem(KEY+':before-import',JSON.stringify(state));localStorage.setItem(KEY,JSON.stringify(candidate))}catch(error){notice('Import cancelled: the browser could not save it. Existing progress is unchanged.');return}state=candidate;importCandidate=null;storageLocked=false;$('storageWarning').hidden=true;$('importPreview').hidden=true;notice('Backup restored.');home()}
function bind(id,fn){$(id).addEventListener('click',fn)}
bind('startBtn',()=>start());bind('weakBtn',()=>start(true));bind('brand',e=>{e.preventDefault();home()});bind('homeBtn',home);bind('guideBtn',()=>show('guide'));bind('guideBack',home);bind('settingsBtn',audioSettings);bind('settingsBack',home);bind('libraryBtn',()=>{show('library');renderLibrary()});bind('libraryBack',home);bind('moreBtn',()=>{libraryLimit+=30;renderLibrary()});$('search').addEventListener('input',()=>{libraryLimit=30;renderLibrary()});
bind('endBtn',finish);bind('continueBtn',advance);bind('nextBtn',advance);bind('studiedBtn',studied);bind('revealBtn',reveal);bind('hintBtn',()=>help('pinyin'));bind('cueBtn',()=>help('cue'));bind('readingBtn',readInstead);bind('saveCue',saveCue);bind('suspendBtn',pauseCurrent);
bind('promptAudio',()=>current&&play(byId.get(current.id),false,true));bind('promptSlow',()=>current&&play(byId.get(current.id),true,true));bind('answerAudio',()=>current&&play(byId.get(current.id)));bind('answerSlow',()=>current&&play(byId.get(current.id),true));
for(const b of document.querySelectorAll('[data-grade]'))b.addEventListener('click',()=>rate(Number(b.dataset.grade)));
for(const key of ['newLimit','reviewLimit'])$(key).addEventListener('change',()=>{state.settings[key]=Number($(key).value);save();renderHome()});
$('audioMode').addEventListener('change',()=>{stopAudio();state.settings.audioMode=$('audioMode').value;save()});$('voiceSelect').addEventListener('change',()=>{state.settings.voice=$('voiceSelect').value;save()});
bind('testAudio',()=>play({id:'test',zh:'你想喝水吗？'},false,false,true));bind('exportBtn',exportBackup);$('importFile').addEventListener('change',e=>readImport(e.target.files[0]));bind('confirmImport',confirmImport);bind('cancelImport',()=>{importCandidate=null;$('importPreview').hidden=true});
$('category').innerHTML='<option value="">All topics · recommended</option>'+[...new Set(DECK.map(c=>c.category))].map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
if('speechSynthesis' in window)window.speechSynthesis.addEventListener('voiceschanged',refreshVoices);
window.addEventListener('storage',e=>{if(e.key===KEY){state=load();notice('Progress changed in another tab. This session was stopped to avoid overwriting it.');home()}});
setInterval(()=>{if(session&&!current)renderWaiting();if(!$('home').hidden)renderHome()},15000);
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('sw.js').catch(()=>{});
renderHome();
