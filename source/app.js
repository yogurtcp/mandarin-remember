'use strict';
const E=CoachEngine,DECK=JSON.parse(document.getElementById('deck-data').textContent),byId=new Map(DECK.map(c=>[c.id,c]));
const KEY='mandarin-remember:reviewed:v1',$=id=>document.getElementById(id);
let storageLocked=false,state=load(),session=null,current=null,revealed=false,graded=false,assisted=false,inputMode='spoken',heard=false,importCandidate=null,libraryLimit=30,lastCardId=null;
const voiceTimings=new Map();
let audioToken=0,activeAudio=null,activeUtterance=null,audioTimer=null;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=t=>new Date(t).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const normalize=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function notice(text){$('notice').textContent=text}
function storageError(message){$('storageWarning').textContent=message;$('storageWarning').hidden=false}
function load(){try{const raw=localStorage.getItem(KEY);const loaded=raw?E.validate(JSON.parse(raw),DECK):E.empty();storageLocked=false;$('storageWarning').hidden=true;return loaded}catch(error){storageLocked=true;storageError('Saved progress could not be read. It has not been overwritten. You can practise in memory, export this session, or restore a valid backup.');return E.empty()}}
function save(){if(storageLocked)return false;try{localStorage.setItem(KEY,JSON.stringify(state));return true}catch(error){storageError('This browser could not save progress. Keep this tab open and export a backup before leaving.');return false}}
function show(page){stopAudio();$('copyFallback').hidden=true;$('appMenu').open=false;for(const id of ['home','practice','done','library','settings','guide','install'])$(id).hidden=id!==page;window.scrollTo({top:0,behavior:'instant'})}
function home(){session=null;current=null;show('home');renderHome()}
function renderHome(){const now=Date.now(),due=E.dueTasks(state,now,null,DECK),n=E.newAllowance(state,now,DECK),r=E.retention(state,now);
 $('dueCount').textContent=due.length;$('startedCount').textContent=Object.keys(state.items).length;$('holdingCount').textContent=Object.values(state.items).filter(E.holding).length;
 $('retention').textContent=r.total?`${r.passed} / ${r.total} recalled`:'No delayed reviews yet';
 $('dailyText').textContent=`${n.used} new today. ${n.reason?'Reviews first in the daily plan.':n.count+' left in your daily plan.'}`;
 const next=nextDue();$('planText').textContent=due.length?`Up to ${state.settings.reviewLimit} reviews${n.count?` + ${n.count} new`:''}.`:n.count?`${n.count} new cards in today’s plan.`:next?`Next review: ${fmt(next)}.`:'Start with a new batch.';
 updateMoreButtons();
 $('newLimit').value=String(state.settings.newLimit);$('reviewLimit').value=String(state.settings.reviewLimit);
}
function updateMoreButtons(){const count=E.extraPlan(state,Date.now(),DECK,$('category').value).length;for(const id of ['learnMoreBtn','doneMoreBtn']){$(id).disabled=!count;$(id).textContent=count?`Learn ${count} more`:'All cards started'}}
function nextDue(){const times=Object.values(state.items).filter(i=>!i.suspended).flatMap(i=>E.directions.map(d=>i[d].due));return times.length?Math.min(...times):null}
function startExtra(){if(session)return;const tasks=E.extraPlan(state,Date.now(),DECK,$('category').value);if(!tasks.length){notice('No new cards left in this topic.');return}beginSession(tasks,false)}
function start(practice=false){const tasks=E.plan(state,Date.now(),DECK,$('category').value,practice);
 if(!tasks.length){notice(practice?'Learn some cards first.':'Nothing due in this topic. Try “Learn 5 more”.');renderHome();return}
 beginSession(tasks,practice);
}
function beginSession(tasks,practice){
 session={queue:tasks,attempts:0,studied:0,missed:0,retries:{},started:Date.now(),practice};lastCardId=null;notice('');show('practice');advance();
}
function advance(){stopAudio();if(!session)return;session.queue=session.queue.filter(t=>!state.items[t.id]?.suspended);const now=Date.now();
 // Due learning steps take priority over introducing another item. Avoid immediate sibling cues when possible.
 let ready=session.queue.filter(t=>t.readyAt<=now&&(!state.items[t.id]||!state.items[t.id].suspended));
 const retrieval=ready.filter(t=>t.direction!=='intro');if(retrieval.length)ready=retrieval;
 const task=ready.find(t=>t.id!==lastCardId)||ready[0];
 if(!task){if(!session.queue.length){finish();return}current=null;$('flashcard').hidden=true;$('waiting').hidden=false;renderWaiting();return}
 session.queue.splice(session.queue.indexOf(task),1);
 if(task.direction==='intro'&&(state.items[task.id]||(!task.extra&&E.newAllowance(state,now,DECK).count===0))){advance();return}
 current=task;lastCardId=task.id;revealed=task.direction==='intro';graded=false;assisted=false;heard=false;inputMode=task.direction==='understand'?'listening':'spoken';
 const c=byId.get(task.id);$('waiting').hidden=true;$('flashcard').hidden=false;$('sessionProgress').textContent=`${session.attempts} reviews · ${session.studied} new`;
 $('taskType').textContent=task.direction==='intro'?'NEW':task.practice?'EXTRA REVIEW':task.direction==='produce'?'SAY IT IN MANDARIN':'WHAT DOES IT MEAN?';
 $('taskCategory').textContent=c.category;$('prompt').textContent=task.direction==='intro'?'New card':task.direction==='produce'?c.meaning:'What does it mean?';
 $('taskInstruction').textContent=task.direction==='intro'?'Listen, then say it once.':task.direction==='produce'?'Say it before revealing.':'Listen, then recall the meaning.';
 $('draft').value='';$('draftLabel').open=false;$('draftLabel').hidden=revealed;$('listenTools').hidden=task.direction!=='understand';$('readingPrompt').hidden=true;$('readingPrompt').textContent='';
 $('hint').hidden=true;$('hint').textContent='';$('helpTools').hidden=revealed;$('hintBtn').textContent=task.direction==='produce'?'Hint':'Pinyin hint';$('cueBtn').hidden=!state.items[c.id]?.note;
 $('revealBtn').hidden=revealed;$('revealBtn').disabled=false;$('answer').hidden=!revealed;
 $('translateLink').href=translateURL(c.zh);$('hanzi').textContent=c.zh;$('pinyin').textContent=c.pinyin;$('meaning').textContent=c.meaning;$('memoryCue').value=state.items[c.id]?.note||'';
 $('usageDetails').hidden=!c.usage;$('usageDetails').open=false;$('usageContent').innerHTML=usageHTML(c);
 $('ratings').hidden=true;$('studiedBtn').hidden=!revealed;$('nextBtn').hidden=true;$('scheduledResult').textContent='';$('ratingHelp').textContent='';$('audioStatus').textContent='';$('suspendBtn').hidden=!state.items[c.id];
 if(revealed)$('ratingHelp').textContent='';
}
function renderWaiting(){if(!session||current)return;const next=Math.min(...session.queue.map(t=>t.readyAt));$('waitText').textContent=`Next review ${next<=Date.now()?'now':`in about ${Math.max(1,Math.ceil((next-Date.now())/60000))} minute(s)`}.`}
function readInstead(){if(!current||current.direction!=='understand'||revealed)return;inputMode='reading';$('readingPrompt').textContent=byId.get(current.id).zh;$('readingPrompt').hidden=false;$('taskInstruction').textContent='Read and recall the meaning.'}
function reveal(){if(!current||revealed||graded)return;if(current.direction==='understand'&&!heard&&inputMode!=='reading'){audioStatus('Listen first, or tap “Read instead”.');return}
 revealed=true;$('answer').hidden=false;$('revealBtn').hidden=true;$('helpTools').hidden=true;$('ratings').hidden=false;
 $('ratingHelp').textContent=assisted?'Hint used → needed help.':'How did you do before revealing?';
 for(const b of document.querySelectorAll('[data-grade]'))b.disabled=assisted&&b.dataset.grade!=='0';
}
function help(kind){if(!current||revealed)return;assisted=true;const c=byId.get(current.id);$('hint').hidden=false;$('hint').textContent=kind==='cue'?state.items[current.id].note:current.direction==='produce'?firstSyllable(c.pinyin):c.pinyin;
}
function firstSyllable(p){const match=p.match(/^([bpmfdtnlgkhjqxrzcswy]*[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜaeiouü]+(?:ng|n|r)?)/i);return (match?match[1]:p.split(' ')[0])+'…'}
function studied(){if(!current||graded||current.direction!=='intro')return;graded=true;const now=Date.now();E.introduce(state,current.id,now);session.studied++;save();session.queue.push({id:current.id,direction:'produce',readyAt:now+E.MIN});$('studiedBtn').hidden=true;$('nextBtn').hidden=false;$('scheduledResult').textContent='Review in 1 minute; meaning tomorrow.';$('suspendBtn').hidden=false}
function rate(grade){if(!current||!revealed||graded||current.direction==='intro')return;graded=true;const now=Date.now();const event=E.review(state,current.id,current.direction,grade,now,{assisted,practice:!!current.practice,input:inputMode});session.attempts++;if(event.grade===0)session.missed++;
 $('ratings').hidden=true;$('nextBtn').hidden=false;save();
 const t=state.items[current.id][current.direction];$('scheduledResult').textContent=event.practice?'Extra review saved. Due date unchanged.':`Next ${current.direction==='produce'?'Mandarin recall':'meaning recall'}: ${fmt(t.due)}.`;
 const retryKey=current.id+'/'+current.direction;const retries=session.retries[retryKey]||0;
 if(!event.practice&&t.due-now<=10*E.MIN&&retries<2){session.retries[retryKey]=retries+1;session.queue.push({id:current.id,direction:current.direction,readyAt:t.due})}
 if(t.lapses>=5)$('scheduledResult').textContent+=' Try a cue, or pause this card.';
}
function finish(){updateMoreButtons();if(!session){home();return}const info={...session};session=null;current=null;show('done');$('doneSummary').textContent=`${info.attempts} reviews · ${info.missed} missed · ${info.studied} new. ${storageLocked?'Export a backup to keep this session.':''}`;const next=nextDue();$('nextReviewText').textContent=next?`Next review ${next<=Date.now()?'is ready now':`is due ${fmt(next)}`}. `:'No scheduled reviews yet.'}
function pauseCurrent(){if(!current||!state.items[current.id])return;state.items[current.id].suspended=true;session.queue=session.queue.filter(t=>t.id!==current.id);save();advance()}
function saveCue(){if(!current)return;const item=state.items[current.id];if(!item){audioStatus('Study this card first, then save a cue.');return}item.note=$('memoryCue').value.slice(0,1000);save();audioStatus('Cue saved.')}
function translateURL(text){return 'https://translate.google.com/?sl=zh-CN&tl=en&text='+encodeURIComponent(text)+'&op=translate'}
async function copyChinese(card){if(!card)return;try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(card.zh);$('copyFallback').hidden=true;notice('Chinese copied.')}catch(error){$('copyText').value=card.zh;$('copyFallback').hidden=false;$('copyText').focus();$('copyText').select();$('copyFallback').scrollIntoView({block:'nearest'});}}
function usageHTML(card){if(!card.usage)return '';return `<p class="usageNote">${esc(card.usage)}</p>`+(card.examples||[]).map(example=>`<div class="usageExample"><div class="exampleChinese" lang="zh-CN">${esc(example.zh)}</div><div class="examplePinyin" lang="zh-Latn">${esc(example.pinyin)}</div><div>${esc(example.meaning)}</div><a class="referenceLink" data-translate href="${esc(translateURL(example.zh))}" target="_blank" rel="noopener noreferrer">Google Translate ↗</a></div>`).join('')}
function renderLibrary(){const q=normalize($('search').value);const matches=DECK.filter(c=>!q||normalize([c.zh,c.pinyin,c.meaning,c.category,c.usage||'',...(c.examples||[]).flatMap(e=>[e.zh,e.pinyin,e.meaning])].join(' ')).includes(q));$('libraryCount').textContent=`${matches.length} items · showing ${Math.min(libraryLimit,matches.length)}`;$('moreBtn').hidden=libraryLimit>=matches.length;
 $('libraryList').innerHTML=matches.slice(0,libraryLimit).map(c=>{const item=state.items[c.id];return `<article class="phrase"><div class="small">${esc(c.category)}${item?.suspended?' · paused':''}</div><div class="hanzi" lang="zh-CN">${esc(c.zh)}</div><div class="pinyin">${esc(c.pinyin)}</div><p>${esc(c.meaning)}</p>${c.usage?`<details class="usageDetails"><summary>Usage & examples</summary>${usageHTML(c)}</details>`:''}<div class="row"><button class="secondary" data-play="${c.id}">Listen</button><button class="quiet" data-slow="${c.id}">Slow</button>${item?`<button class="quiet" data-toggle="${c.id}">${item.suspended?'Resume reviews':'Pause card'}</button>`:''}</div><div class="row referenceTools"><button class="quiet" data-copy="${c.id}">Copy Chinese</button><a class="referenceLink" data-translate href="${esc(translateURL(c.zh))}" target="_blank" rel="noopener noreferrer">Google Translate ↗</a></div></article>`}).join('');
 for(const b of document.querySelectorAll('[data-copy]'))b.onclick=()=>copyChinese(byId.get(b.dataset.copy));for(const a of document.querySelectorAll('[data-translate]'))a.onclick=stopAudio;
 for(const b of document.querySelectorAll('[data-play]'))b.onclick=()=>play(byId.get(b.dataset.play));for(const b of document.querySelectorAll('[data-slow]'))b.onclick=()=>play(byId.get(b.dataset.slow),true);
 for(const b of document.querySelectorAll('[data-toggle]'))b.onclick=()=>{const item=state.items[b.dataset.toggle];item.suspended=!item.suspended;save();renderLibrary()};
}
function audioStatus(text){$('audioStatus').textContent=text;$('settingsAudioStatus').textContent=text;notice($('practice').hidden&&$('settings').hidden?text:'')}
function stopAudio(){audioToken++;clearTimeout(audioTimer);if(activeAudio){activeAudio.pause();activeAudio.removeAttribute('src');activeAudio.load();activeAudio=null}if('speechSynthesis' in window)window.speechSynthesis.cancel();activeUtterance=null}
function voices(){if(!('speechSynthesis' in window))return [];return window.speechSynthesis.getVoices().filter(v=>/^(zh-(cn|tw|sg)|cmn)(-|$)/i.test(v.lang.replaceAll('_','-'))||v.lang==='zh')}
function refreshVoices(){const list=voices();$('voiceSelect').innerHTML='<option value="">Choose automatically</option>'+list.map(v=>`<option value="${esc(v.name)}">${esc(v.name)} · ${esc(v.lang)}</option>`).join('');$('voiceSelect').value=state.settings.voice}
function play(card,slow=false,prompt=false,test=false){stopAudio();const token=audioToken;const markPlayed=()=>{if(token!==audioToken)return;if(prompt&&current?.id===card.id&&!revealed)heard=true;audioStatus(`${test?'Test sentence':'Playing'} · ${slow?'slow':'normal'}${useOnline?' · online':''}`)};
 const mode=state.settings.audioMode,useOnline=mode==='online'||(mode==='auto'&&window.ONLINE_VOICE_ENABLED===true);
 if(useOnline){if(!window.ONLINE_VOICE_ENABLED){audioStatus('Online speech needs the local helper. Run start-online.sh and open its address, or choose a device voice.');return}audioStatus('Loading online audio…');
 const audio=new Audio('/api/speech?id='+encodeURIComponent(card.id)+'&slow='+(slow?'1':'0'));audio.defaultPlaybackRate=slow?.75:1;audio.playbackRate=slow?.75:1;audio.preservesPitch=true;activeAudio=audio;let failed=false;
 const fail=()=>{if(token!==audioToken||failed)return;failed=true;activeAudio=null;audioStatus('Online audio could not load. Retry or select a device voice.')};audio.onerror=fail;audio.onplaying=markPlayed;audio.onended=()=>{if(token===audioToken){activeAudio=null;if(test)audioStatus('Test finished · online.')}};
 try{audio.play().catch(error=>{if(token!==audioToken)return;if(error.name==='NotAllowedError'){failed=true;audioStatus('Allow sound for this page, then press Play again.')}else fail()})}catch(error){fail()}return;
 }
 let tries=0;const attempt=()=>{if(token!==audioToken)return;const list=voices();const voice=list.find(v=>v.name===state.settings.voice)||list.find(v=>/^zh[-_]CN$/i.test(v.lang))||list.find(v=>v.default)||list[0];if(!voice){if(tries++<6){audioTimer=setTimeout(attempt,250);return}audioStatus('No Mandarin voice found. Install one in your device’s speech settings, then reload.');return}
 const u=new SpeechSynthesisUtterance(card.zh);activeUtterance=u;u.lang=voice.lang;u.voice=voice;u.rate=slow?.4:1;let startedAt=null;
 u.onstart=()=>{if(token!==audioToken)return;clearTimeout(audioTimer);startedAt=Date.now();markPlayed()};u.onend=()=>{if(token===audioToken){clearTimeout(audioTimer);activeUtterance=null;if(test){const seconds=startedAt===null?0:(Date.now()-startedAt)/1000;const timings=voiceTimings.get(voice.name)||{};if(seconds>.3){timings[slow?'slow':'normal']=seconds;voiceTimings.set(voice.name,timings)}const unchanged=timings.normal&&timings.slow&&timings.slow<timings.normal*1.25;audioStatus(unchanged?'This voice may ignore speed changes. Try another Mandarin voice.':`Test finished · ${slow?'slow':'normal'}${seconds>.3?' · '+seconds.toFixed(1)+'s':''}`)}}};
 u.onerror=e=>{if(token===audioToken&&!['canceled','interrupted'].includes(e.error)){clearTimeout(audioTimer);audioStatus('Speech error: '+e.error+'. Try a different Mandarin voice, or use the reading prompt.')}};
 audioStatus('Starting '+voice.name+'…');audioTimer=setTimeout(()=>{if(token===audioToken)audioStatus('Speech did not start. Try another voice or read instead.')},8000);
 try{window.speechSynthesis.resume();window.speechSynthesis.speak(u)}catch(error){clearTimeout(audioTimer);audioStatus('Could not start the device voice. Choose another audio source.')}
 };attempt();
}
function audioSettings(){show('settings');$('audioMode').value=state.settings.audioMode;refreshVoices();$('audioExplanation').textContent=window.ONLINE_VOICE_ENABLED?'Xiaoxiao online. Played phrases are sent to the speech service.':'Uses your device’s Mandarin voice. Compare normal and slow below.'}
function exportBackup(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`mandarin-remember-${E.localDay(Date.now())}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('Backup downloaded.')}
async function readImport(file){if(!file)return;importCandidate=null;$('importPreview').hidden=true;try{if(file.size>4000000)throw Error('Backup is too large');importCandidate=E.validate(JSON.parse(await file.text()),DECK);$('importInfo').textContent=`${Object.keys(importCandidate.items).length} cards · ${importCandidate.logs.length} attempts. This replaces current progress. Export a backup first to keep it.`;$('importPreview').hidden=false}catch(error){notice('Backup was not imported: '+error.message)}}
function confirmImport(){if(!importCandidate)return;const candidate=importCandidate;try{localStorage.setItem(KEY+':before-import',JSON.stringify(state));localStorage.setItem(KEY,JSON.stringify(candidate))}catch(error){notice('Import cancelled: the browser could not save it. Existing progress is unchanged.');return}state=candidate;importCandidate=null;storageLocked=false;$('storageWarning').hidden=true;$('importPreview').hidden=true;notice('Backup restored.');home()}
function bind(id,fn){$(id).addEventListener('click',fn)}
bind('learnMoreBtn',startExtra);bind('doneMoreBtn',startExtra);bind('startBtn',()=>start());bind('weakBtn',()=>start(true));bind('brand',e=>{e.preventDefault();home()});bind('homeBtn',home);bind('guideBtn',()=>show('guide'));bind('guideBack',home);bind('settingsBtn',audioSettings);bind('settingsBack',home);bind('libraryBtn',()=>{show('library');renderLibrary()});bind('libraryBack',home);bind('moreBtn',()=>{libraryLimit+=30;renderLibrary()});$('search').addEventListener('input',()=>{libraryLimit=30;renderLibrary()});
bind('endBtn',finish);bind('continueBtn',advance);bind('nextBtn',advance);bind('studiedBtn',studied);bind('revealBtn',reveal);bind('hintBtn',()=>help('pinyin'));bind('cueBtn',()=>help('cue'));bind('readingBtn',readInstead);bind('saveCue',saveCue);bind('suspendBtn',pauseCurrent);
bind('copyChinese',()=>current&&revealed&&copyChinese(byId.get(current.id)));bind('copyDone',()=>{$('copyFallback').hidden=true});bind('translateLink',stopAudio);bind('usageDetails',event=>{if(event.target?.closest('[data-translate]'))stopAudio()});
bind('promptAudio',()=>current&&play(byId.get(current.id),false,true));bind('promptSlow',()=>current&&play(byId.get(current.id),true,true));bind('answerAudio',()=>current&&play(byId.get(current.id)));bind('answerSlow',()=>current&&play(byId.get(current.id),true));
for(const b of document.querySelectorAll('[data-grade]'))b.addEventListener('click',()=>rate(Number(b.dataset.grade)));
for(const key of ['newLimit','reviewLimit'])$(key).addEventListener('change',()=>{state.settings[key]=Number($(key).value);save();renderHome()});
$('category').addEventListener('change',updateMoreButtons);
$('audioMode').addEventListener('change',()=>{stopAudio();state.settings.audioMode=$('audioMode').value;save()});$('voiceSelect').addEventListener('change',()=>{state.settings.voice=$('voiceSelect').value;save()});
bind('testAudio',()=>play({id:'test',zh:'你想喝水吗？'},false,false,true));bind('testSlow',()=>play({id:'test',zh:'你想喝水吗？'},true,false,true));bind('exportBtn',exportBackup);$('importFile').addEventListener('change',e=>readImport(e.target.files[0]));bind('confirmImport',confirmImport);bind('cancelImport',()=>{importCandidate=null;$('importPreview').hidden=true});
$('category').innerHTML='<option value="">All topics</option>'+[...new Set(DECK.map(c=>c.category))].map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
if('speechSynthesis' in window)window.speechSynthesis.addEventListener('voiceschanged',refreshVoices);
window.addEventListener('storage',e=>{if(e.key===KEY){state=load();notice('Progress changed in another tab. This session was stopped to avoid overwriting it.');home()}});
setInterval(()=>{if(session&&!current)renderWaiting();if(!$('home').hidden)renderHome()},15000);
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('sw.js').catch(()=>{});
renderHome();

let deferredInstall=null,installed=false;
function renderInstall(){const standalone=installed||window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;$('requestInstall').hidden=standalone||!deferredInstall;$('installSteps').hidden=standalone;$('installStatus').textContent=standalone?'Already running as an app.':deferredInstall?'Add this app to your home screen.':'Add a shortcut using your browser menu:'}
bind('installBtn',()=>{show('install');renderInstall()});bind('installBack',home);
bind('requestInstall',async()=>{const prompt=deferredInstall;if(!prompt)return;deferredInstall=null;renderInstall();try{await prompt.prompt();const choice=await prompt.userChoice;$('installStatus').textContent=choice.outcome==='accepted'?'Installation requested.':'You can install later from your browser menu.'}catch(error){$('installStatus').textContent='Use the browser menu below to install.'}});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstall=event;if(!$('install').hidden)renderInstall()});
window.addEventListener('appinstalled',()=>{installed=true;deferredInstall=null;if(!$('install').hidden)renderInstall()});
