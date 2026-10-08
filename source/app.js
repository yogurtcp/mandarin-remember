'use strict';
const E=CoachEngine,$=id=>document.getElementById(id),REGISTRY=JSON.parse($('courses-data').textContent),COURSES=REGISTRY.courses;
const ACTIVE_KEY='remember:active-course:v1';
function initialCourse(){let id=REGISTRY.defaultCourse;try{id=localStorage.getItem(ACTIVE_KEY)||id}catch(error){}return COURSES.find(c=>c.id===id)||COURSES.find(c=>c.id===REGISTRY.defaultCourse)}
let course=initialCourse(),DECK=course.cards,byId=new Map(DECK.map(c=>[c.id,c])),KEY=course.storageKey,importRevision=0;
let storageLocked=false,state=load(),session=null,current=null,revealed=false,graded=false,assisted=false,inputMode='spoken',heard=false,importCandidate=null,libraryLimit=30,lastCardId=null;
const voiceTimings=new Map();
let audioToken=0,activeAudio=null,activeUtterance=null,audioTimer=null;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=t=>new Date(t).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const normalize=s=>s.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/ـ/g,'');
function notice(text){$('notice').textContent=text}
function storageError(message){$('storageWarning').textContent=message;$('storageWarning').hidden=false}
function load(){try{const raw=localStorage.getItem(KEY);const loaded=raw?E.validate(JSON.parse(raw),DECK,course.progressId):E.empty(course.progressId);storageLocked=false;$('storageWarning').hidden=true;return loaded}catch(error){storageLocked=true;storageError('Saved progress could not be read. It has not been overwritten. You can practise in memory, export this session, or restore a valid backup.');return E.empty(course.progressId)}}
function save(){if(storageLocked)return false;try{localStorage.setItem(KEY,JSON.stringify(state));return true}catch(error){storageError('This browser could not save progress. Keep this tab open and export a backup before leaving.');return false}}
function show(page){stopAudio();$('audioFallback').hidden=true;$('copyFallback').hidden=true;$('appMenu').open=false;for(const id of ['home','practice','done','library','settings','guide','install'])$(id).hidden=id!==page;window.scrollTo({top:0,behavior:'instant'})}
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
 $('taskType').textContent=task.direction==='intro'?'NEW':task.practice?'EXTRA REVIEW':task.direction==='produce'?`SAY IT IN ${course.target.name.toUpperCase()}`:'WHAT DOES IT MEAN?';
 $('taskCategory').textContent=c.category;$('prompt').textContent=task.direction==='intro'?'New card':task.direction==='produce'?c.meaning:'What does it mean?';
 $('taskInstruction').textContent=task.direction==='intro'?'Listen, then say it once.':task.direction==='produce'?'Say it before revealing.':'Listen, then recall the meaning.';
 $('draft').value='';$('draftLabel').open=false;$('draftLabel').hidden=revealed;$('listenTools').hidden=task.direction!=='understand';$('readingPrompt').hidden=true;$('readingPrompt').textContent='';
 $('hint').hidden=true;$('hint').textContent='';$('helpTools').hidden=revealed;$('hintBtn').textContent=task.direction==='produce'?'Hint':course.pronunciationLabel+' hint';$('cueBtn').hidden=!state.items[c.id]?.note;$('hintBtn').hidden=!c.pronunciation;
 $('revealBtn').hidden=revealed;$('revealBtn').disabled=false;$('answer').hidden=!revealed;
 $('translateLink').href=translateURL(c.text);$('targetText').textContent=c.text;$('pronunciation').textContent=c.pronunciation;$('pronunciation').hidden=!c.pronunciation;$('meaning').textContent=c.meaning;$('memoryCue').value=state.items[c.id]?.note||'';
 $('usageDetails').hidden=!c.usage;$('usageDetails').open=false;$('usageContent').innerHTML=usageHTML(c);
 $('ratings').hidden=true;$('studiedBtn').hidden=!revealed;$('nextBtn').hidden=true;$('scheduledResult').textContent='';$('ratingHelp').textContent='';$('audioStatus').textContent='';$('suspendBtn').hidden=!state.items[c.id];
 if(revealed)$('ratingHelp').textContent='';
}
function renderWaiting(){if(!session||current)return;const next=Math.min(...session.queue.map(t=>t.readyAt));$('waitText').textContent=`Next review ${next<=Date.now()?'now':`in about ${Math.max(1,Math.ceil((next-Date.now())/60000))} minute(s)`}.`}
function readInstead(){if(!current||current.direction!=='understand'||revealed)return;inputMode='reading';$('readingPrompt').textContent=byId.get(current.id).text;$('readingPrompt').hidden=false;$('taskInstruction').textContent='Read and recall the meaning.'}
function reveal(){if(!current||revealed||graded)return;if(current.direction==='understand'&&!heard&&inputMode!=='reading'){audioStatus('Listen first, or tap “Read instead”.');return}
 revealed=true;$('answer').hidden=false;$('revealBtn').hidden=true;$('helpTools').hidden=true;$('ratings').hidden=false;
 $('ratingHelp').textContent=assisted?'Hint used → needed help.':'How did you do before revealing?';
 for(const b of document.querySelectorAll('[data-grade]'))b.disabled=assisted&&b.dataset.grade!=='0';
}
function help(kind){if(!current||revealed)return;assisted=true;const c=byId.get(current.id);$('hint').hidden=false;$('hint').textContent=kind==='cue'?state.items[current.id].note:current.direction==='produce'?firstSyllable(c.pronunciation):c.pronunciation;
}
function firstSyllable(p){if(course.hintMode!=='pinyin')return Array.from(p).slice(0,2).join('')+'…';const match=p.match(/^([bpmfdtnlgkhjqxrzcswy]*[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜaeiouü]+(?:ng|n|r)?)/i);return (match?match[1]:p.split(' ')[0])+'…'}
function studied(){if(!current||graded||current.direction!=='intro')return;graded=true;const now=Date.now();E.introduce(state,current.id,now);session.studied++;save();session.queue.push({id:current.id,direction:'produce',readyAt:now+E.MIN});$('studiedBtn').hidden=true;$('nextBtn').hidden=false;$('scheduledResult').textContent='Review in 1 minute; meaning tomorrow.';$('suspendBtn').hidden=false}
function rate(grade){if(!current||!revealed||graded||current.direction==='intro')return;graded=true;const now=Date.now();const event=E.review(state,current.id,current.direction,grade,now,{assisted,practice:!!current.practice,input:inputMode});session.attempts++;if(event.grade===0)session.missed++;
 $('ratings').hidden=true;$('nextBtn').hidden=false;save();
 const t=state.items[current.id][current.direction];$('scheduledResult').textContent=event.practice?'Extra review saved. Due date unchanged.':`Next ${current.direction==='produce'?course.target.name+' recall':'meaning recall'}: ${fmt(t.due)}.`;
 const retryKey=current.id+'/'+current.direction;const retries=session.retries[retryKey]||0;
 if(!event.practice&&t.due-now<=10*E.MIN&&retries<2){session.retries[retryKey]=retries+1;session.queue.push({id:current.id,direction:current.direction,readyAt:t.due})}
 if(t.lapses>=5)$('scheduledResult').textContent+=' Try a cue, or pause this card.';
}
function finish(){updateMoreButtons();if(!session){home();return}const info={...session};session=null;current=null;show('done');$('doneSummary').textContent=`${info.attempts} reviews · ${info.missed} missed · ${info.studied} new. ${storageLocked?'Export a backup to keep this session.':''}`;const next=nextDue();$('nextReviewText').textContent=next?`Next review ${next<=Date.now()?'is ready now':`is due ${fmt(next)}`}. `:'No scheduled reviews yet.'}
function pauseCurrent(){if(!current||!state.items[current.id])return;state.items[current.id].suspended=true;session.queue=session.queue.filter(t=>t.id!==current.id);save();advance()}
function saveCue(){if(!current)return;const item=state.items[current.id];if(!item){audioStatus('Study this card first, then save a cue.');return}item.note=$('memoryCue').value.slice(0,1000);save();audioStatus('Cue saved.')}
function translateURL(text){return 'https://translate.google.com/?sl='+encodeURIComponent(course.target.translateCode)+'&tl='+encodeURIComponent(course.source.translateCode)+'&text='+encodeURIComponent(text)+'&op=translate'}
async function copyTarget(card){if(!card)return;const startedIn=course.id;try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(card.text);if(course.id!==startedIn)return;$('copyFallback').hidden=true;notice(course.target.textLabel+' copied.')}catch(error){if(course.id!==startedIn)return;$('copyText').value=card.text;$('copyFallback').hidden=false;$('copyText').focus();$('copyText').select();$('copyFallback').scrollIntoView({block:'nearest'});}}
function usageHTML(card){if(!card.usage)return '';return `<p class="usageNote">${esc(card.usage)}</p>`+(card.examples||[]).map(example=>`<div class="usageExample"><div class="exampleText" lang="${esc(course.target.lang)}" dir="${course.target.dir}">${esc(example.text)}</div><div class="examplePronunciation" dir="ltr">${esc(example.pronunciation)}</div><div lang="${esc(course.source.lang)}" dir="${course.source.dir}">${esc(example.meaning)}</div><a class="referenceLink" data-translate href="${esc(translateURL(example.text))}" target="_blank" rel="noopener noreferrer">Google Translate ↗</a></div>`).join('')}
function renderLibrary(){const q=normalize($('search').value);const matches=DECK.filter(c=>!q||normalize([c.text,c.pronunciation,c.meaning,c.category,c.usage||'',...(c.examples||[]).flatMap(e=>[e.text,e.pronunciation,e.meaning])].join(' ')).includes(q));$('libraryCount').textContent=`${matches.length} items · showing ${Math.min(libraryLimit,matches.length)}`;$('moreBtn').hidden=libraryLimit>=matches.length;
 $('libraryList').innerHTML=matches.slice(0,libraryLimit).map(c=>{const item=state.items[c.id];return `<article class="phrase"><div class="small">${esc(c.category)}${item?.suspended?' · paused':''}</div><div class="targetText" lang="${esc(course.target.lang)}" dir="${course.target.dir}">${esc(c.text)}</div><div class="pronunciation">${esc(c.pronunciation)}</div><p lang="${esc(course.source.lang)}" dir="${course.source.dir}">${esc(c.meaning)}</p>${c.usage?`<details class="usageDetails"><summary>Usage & examples</summary>${usageHTML(c)}</details>`:''}<div class="row"><button class="secondary" data-play="${c.id}">Listen</button><button class="quiet" data-slow="${c.id}">Slow</button>${item?`<button class="quiet" data-toggle="${c.id}">${item.suspended?'Resume reviews':'Pause card'}</button>`:''}</div><div class="row referenceTools"><button class="quiet" data-copy="${c.id}">Copy ${esc(course.target.textLabel)}</button><a class="referenceLink" data-translate href="${esc(translateURL(c.text))}" target="_blank" rel="noopener noreferrer">Google Translate ↗</a></div></article>`}).join('');
 for(const b of document.querySelectorAll('[data-copy]'))b.onclick=()=>copyTarget(byId.get(b.dataset.copy));for(const a of document.querySelectorAll('[data-translate]'))a.onclick=stopAudio;
 for(const b of document.querySelectorAll('[data-play]'))b.onclick=()=>play(byId.get(b.dataset.play));for(const b of document.querySelectorAll('[data-slow]'))b.onclick=()=>play(byId.get(b.dataset.slow),true);
 for(const b of document.querySelectorAll('[data-toggle]'))b.onclick=()=>{const item=state.items[b.dataset.toggle];item.suspended=!item.suspended;save();renderLibrary()};
}
function audioStatus(text){$('audioStatus').textContent=text;$('settingsAudioStatus').textContent=text;notice($('practice').hidden&&$('settings').hidden?text:'')}
function stopAudio(){audioToken++;clearTimeout(audioTimer);if(activeAudio){activeAudio.pause();activeAudio.removeAttribute('src');activeAudio.load();activeAudio=null}if('speechSynthesis' in window)window.speechSynthesis.cancel();activeUtterance=null}
function voices(){if(!('speechSynthesis' in window))return [];const allowed=course.voiceLanguages.map(lang=>lang.toLowerCase());const list=window.speechSynthesis.getVoices().filter(v=>allowed.includes(v.lang.replaceAll('_','-').toLowerCase()));return course.preferVoiceOrder?list.sort((a,b)=>allowed.indexOf(a.lang.replaceAll('_','-').toLowerCase())-allowed.indexOf(b.lang.replaceAll('_','-').toLowerCase())):list}
function refreshVoices(){const list=voices();$('voiceSelect').innerHTML='<option value="">Choose automatically</option>'+list.map(v=>`<option value="${esc(v.name)}">${esc(v.name)} · ${esc(v.lang)}</option>`).join('');$('voiceSelect').value=state.settings.voice}
function speechFallback(card){$('audioFallback').href=translateURL(card.text);$('audioFallback').hidden=false}
function remoteAvailable(){return course.onlineSpeech?.provider==='google-translate'&&!!course.onlineSpeech.language}
function remoteSpeechURL(card){return 'https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl='+encodeURIComponent(course.onlineSpeech.language)+'&q='+encodeURIComponent(card.text)}
function play(card,slow=false,prompt=false,test=false,forceOnline=false){stopAudio();$('audioFallback').hidden=true;const token=audioToken;const markPlayed=()=>{if(token!==audioToken)return;if(prompt&&current?.id===card.id&&!revealed)heard=true;audioStatus(`${test?'Test sentence':'Playing'} · ${slow?'slow':'normal'}${useOnline?(helperAvailable()?' · online helper':' · Google'):''}`)};
 const mode=state.settings.audioMode,useOnline=forceOnline||mode==='online'||(mode==='auto'&&(helperAvailable()||(!voices().length&&remoteAvailable())));
 const deviceFailed=message=>{if(token!==audioToken)return;clearTimeout(audioTimer);if(mode==='auto'&&onlineAvailable()){play(card,slow,prompt,test,true);return}audioStatus(message);speechFallback(card)};
 if(useOnline){if(!onlineAvailable()){audioStatus('Online speech is not available for this course here. Choose a device voice.');return}audioStatus('Loading online audio…');
 const helper=helperAvailable();if(!helper&&card.text.length>200){audioStatus('This phrase is too long for online speech. Use the Google Translate link.');speechFallback(card);return}
 const audio=new Audio(helper?'/api/speech?course='+encodeURIComponent(course.id)+'&id='+encodeURIComponent(card.id)+'&slow='+(slow?'1':'0'):remoteSpeechURL(card));audio.defaultPlaybackRate=slow ? (helper ? 0.75 : 0.65) : 1;audio.playbackRate=audio.defaultPlaybackRate;audio.preservesPitch=true;activeAudio=audio;let failed=false,startedAt=null;
 const fail=(message='Online audio could not load. Retry, choose a device voice, or use the Google Translate link.')=>{if(token!==audioToken||failed)return;failed=true;clearTimeout(audioTimer);audio.pause();audio.removeAttribute('src');audio.load();activeAudio=null;audioStatus(message);speechFallback(card)};
 audio.onerror=()=>fail();audio.onplaying=()=>{if(token!==audioToken||failed)return;clearTimeout(audioTimer);if(startedAt===null)startedAt=Date.now();markPlayed()};
 audio.onended=()=>{if(token===audioToken&&!failed){clearTimeout(audioTimer);activeAudio=null;if(test){const seconds=startedAt===null?0:(Date.now()-startedAt)/1000;audioStatus(`Test finished · ${slow?'slow':'normal'} · ${helper?'online helper':'Google'}${seconds>.3?' · '+seconds.toFixed(1)+'s':''}`)}}};
 audioTimer=setTimeout(()=>fail('Online audio timed out. Check your connection and retry.'),15000);
 try{audio.play().catch(error=>{if(token!==audioToken)return;fail(error.name==='NotAllowedError'?'Sound was blocked. Tap Listen or Test again to allow playback.':undefined)})}catch(error){fail()}return;
 }

 let tries=0;const attempt=()=>{if(token!==audioToken)return;const list=voices();const voice=list.find(v=>v.name===state.settings.voice)||list.find(v=>v.lang.replaceAll('_','-').toLowerCase()===course.target.lang.toLowerCase())||(course.preferVoiceOrder?list[0]:list.find(v=>v.default))||list[0];if(!voice){if(tries++<6){audioTimer=setTimeout(attempt,250);return}deviceFailed('No '+course.target.name+' voice found. Select Automatic or Online voice in Audio & backup.');return}
 const u=new SpeechSynthesisUtterance(card.text);activeUtterance=u;u.lang=voice.lang;u.voice=voice;u.rate=slow?.4:1;let startedAt=null;
 u.onstart=()=>{if(token!==audioToken)return;clearTimeout(audioTimer);startedAt=Date.now();markPlayed()};u.onend=()=>{if(token===audioToken){clearTimeout(audioTimer);activeUtterance=null;if(test){const seconds=startedAt===null?0:(Date.now()-startedAt)/1000;const timings=voiceTimings.get(voice.name)||{};if(seconds>.3){timings[slow?'slow':'normal']=seconds;voiceTimings.set(voice.name,timings)}const unchanged=timings.normal&&timings.slow&&timings.slow<timings.normal*1.25;audioStatus(unchanged?'This voice may ignore speed changes. Try another '+course.target.name+' voice.':`Test finished · ${slow?'slow':'normal'}${seconds>.3?' · '+seconds.toFixed(1)+'s':''}`)}}};
 u.onerror=e=>{if(token===audioToken&&!['canceled','interrupted'].includes(e.error)){clearTimeout(audioTimer);deviceFailed('Speech error: '+e.error+'. Choose Automatic or Online voice, or read instead.')}};
 audioStatus('Starting '+voice.name+'…');audioTimer=setTimeout(()=>{if(token===audioToken)deviceFailed('Speech did not start. Choose Automatic or Online voice, or read instead.')},8000);
 try{window.speechSynthesis.resume();window.speechSynthesis.speak(u)}catch(error){clearTimeout(audioTimer);deviceFailed('Could not start the device voice. Choose Automatic or Online voice.')}
 };attempt();
}
function helperAvailable(){return course.localSpeechHelper===true&&(Array.isArray(window.ONLINE_VOICE_COURSES)?window.ONLINE_VOICE_COURSES.includes(course.id):course.id==='en-zh'&&window.ONLINE_VOICE_ENABLED===true)}
function onlineAvailable(){return helperAvailable()||remoteAvailable()}
function audioSettings(){show('settings');$('audioMode').value=state.settings.audioMode;refreshVoices();$('audioExplanation').textContent=helperAvailable()?'Online helper. Played phrases are sent to the speech service.':remoteAvailable()?'Automatic uses a device voice, with Google speech as fallback. Online sends only the phrase you play to Google.':'Uses your device’s '+course.target.name+' voice. Compare normal and slow below.';if(course.audioNote)$('audioExplanation').textContent+=' '+course.audioNote}
function exportBackup(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`remember-${course.id}-${E.localDay(Date.now())}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice(course.label+' backup downloaded.')}
async function readImport(file){const revision=++importRevision,startedIn=course.id;importCandidate=null;$('importPreview').hidden=true;if(!file)return;try{if(file.size>4000000)throw Error('Backup is too large');const text=await file.text();if(revision!==importRevision||course.id!==startedIn)return;importCandidate=E.validate(JSON.parse(text),DECK,course.progressId);$('importInfo').textContent=`${course.label} · ${Object.keys(importCandidate.items).length} cards · ${importCandidate.logs.length} attempts. Replaces this course’s progress only. Export a backup first to keep it.`;$('importPreview').hidden=false}catch(error){if(revision===importRevision&&course.id===startedIn)notice('Backup was not imported: '+error.message)}}
function confirmImport(){if(!importCandidate)return;let candidate;try{candidate=E.validate(importCandidate,DECK,course.progressId)}catch(error){notice('Backup does not match this course.');return}try{localStorage.setItem(KEY+':before-import',JSON.stringify(state));localStorage.setItem(KEY,JSON.stringify(candidate))}catch(error){notice('Import cancelled: the browser could not save it. Existing progress is unchanged.');return}state=candidate;importCandidate=null;storageLocked=false;$('storageWarning').hidden=true;$('importPreview').hidden=true;notice('Backup restored.');home()}
function bind(id,fn){$(id).addEventListener('click',fn)}
bind('audioFallback',stopAudio);bind('learnMoreBtn',startExtra);bind('doneMoreBtn',startExtra);bind('startBtn',()=>start());bind('weakBtn',()=>start(true));bind('brand',e=>{e.preventDefault();home()});bind('homeBtn',home);bind('guideBtn',()=>show('guide'));bind('guideBack',home);bind('settingsBtn',audioSettings);bind('settingsBack',home);bind('libraryBtn',()=>{show('library');renderLibrary()});bind('libraryBack',home);bind('moreBtn',()=>{libraryLimit+=30;renderLibrary()});$('search').addEventListener('input',()=>{libraryLimit=30;renderLibrary()});
bind('endBtn',finish);bind('continueBtn',advance);bind('nextBtn',advance);bind('studiedBtn',studied);bind('revealBtn',reveal);bind('hintBtn',()=>help('pinyin'));bind('cueBtn',()=>help('cue'));bind('readingBtn',readInstead);bind('saveCue',saveCue);bind('suspendBtn',pauseCurrent);
bind('copyTarget',()=>current&&revealed&&copyTarget(byId.get(current.id)));bind('copyDone',()=>{$('copyFallback').hidden=true});bind('translateLink',stopAudio);bind('usageDetails',event=>{if(event.target?.closest('[data-translate]'))stopAudio()});
bind('promptAudio',()=>current&&play(byId.get(current.id),false,true));bind('promptSlow',()=>current&&play(byId.get(current.id),true,true));bind('answerAudio',()=>current&&play(byId.get(current.id)));bind('answerSlow',()=>current&&play(byId.get(current.id),true));
for(const b of document.querySelectorAll('[data-grade]'))b.addEventListener('click',()=>rate(Number(b.dataset.grade)));
for(const key of ['newLimit','reviewLimit'])$(key).addEventListener('change',()=>{state.settings[key]=Number($(key).value);save();renderHome()});
$('category').addEventListener('change',updateMoreButtons);
$('audioMode').addEventListener('change',()=>{stopAudio();state.settings.audioMode=$('audioMode').value;save()});$('voiceSelect').addEventListener('change',()=>{state.settings.voice=$('voiceSelect').value;save()});
bind('testAudio',()=>play({id:'test',text:course.testText},false,false,true));bind('testSlow',()=>play({id:'test',text:course.testText},true,false,true));bind('exportBtn',exportBackup);$('importFile').addEventListener('change',e=>readImport(e.target.files[0]));bind('confirmImport',confirmImport);bind('cancelImport',()=>{importRevision++;importCandidate=null;$('importPreview').hidden=true});
function configureCourse(){
 $('courseSelect').innerHTML=COURSES.map(c=>`<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('');$('courseSelect').value=course.id;
 $('brandMark').textContent=course.mark||'↻';$('brandLanguage').textContent=course.target.name;$('practiceHeading').textContent='Practise '+course.target.name;document.title=course.target.name+' · Remember';
 $('appVersion').textContent=`${DECK.length} cards · ${course.label} · v1.6.1`;$('voiceLabel').textContent=course.target.name+' voice';$('copyTarget').textContent='Copy '+course.target.textLabel;
 $('pronunciationHelp').textContent=course.pronunciationHelp||'Listen to whole phrases. The app does not grade your pronunciation.';$('search').placeholder=course.searchPlaceholder||'Search words and meanings…';
 for(const id of ['targetText','readingPrompt','copyText']){$(id).lang=course.target.lang;$(id).dir=course.target.dir}
 for(const id of ['meaning','prompt']){$(id).lang=course.source.lang;$(id).dir=course.source.dir}
 for(const id of ['courseAudioNote','libraryAudioNote']){$(id).textContent=course.audioNote||'';$(id).hidden=!course.audioNote}
 $('pronunciation').dir='ltr';$('category').innerHTML='<option value="">All topics</option>'+[...new Set(DECK.map(c=>c.category))].map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');$('category').value='';refreshVoices();
}
function switchCourse(id){const next=COURSES.find(c=>c.id===id);if(!next||next.id===course.id){$('courseSelect').value=course.id;return false}
 if(!save()){$('courseSelect').value=course.id;notice('Progress could not be saved. Export a backup before leaving this course.');return false}
 stopAudio();session=null;current=null;importRevision++;importCandidate=null;$('importPreview').hidden=true;$('importFile').value='';$('search').value='';$('audioStatus').textContent='';$('settingsAudioStatus').textContent='';libraryLimit=30;lastCardId=null;
 course=next;DECK=course.cards;byId=new Map(DECK.map(c=>[c.id,c]));KEY=course.storageKey;state=load();configureCourse();notice('');home();
 try{localStorage.setItem(ACTIVE_KEY,course.id)}catch(error){notice('Course opened. This browser could not remember the selection.')}return true;
}
$('courseSelect').addEventListener('change',()=>switchCourse($('courseSelect').value));
configureCourse();
if('speechSynthesis' in window)window.speechSynthesis.addEventListener('voiceschanged',refreshVoices);
window.addEventListener('storage',e=>{if(e.key===KEY||e.key===null){importRevision++;importCandidate=null;$('importPreview').hidden=true;state=load();notice('Progress changed in another tab. This session was stopped to avoid overwriting it.');home()}});
setInterval(()=>{if(session&&!current)renderWaiting();if(!$('home').hidden)renderHome()},15000);
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('sw.js').catch(()=>{});
renderHome();

let deferredInstall=null,installed=false;
function renderInstall(){const standalone=installed||window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;$('requestInstall').hidden=standalone||!deferredInstall;$('installSteps').hidden=standalone;$('installStatus').textContent=standalone?'Already running as an app.':deferredInstall?'Add this app to your home screen.':'Add a shortcut using your browser menu:'}
bind('installBtn',()=>{show('install');renderInstall()});bind('installBack',home);
bind('requestInstall',async()=>{const prompt=deferredInstall;if(!prompt)return;deferredInstall=null;renderInstall();try{await prompt.prompt();const choice=await prompt.userChoice;$('installStatus').textContent=choice.outcome==='accepted'?'Installation requested.':'You can install later from your browser menu.'}catch(error){$('installStatus').textContent='Use the browser menu below to install.'}});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstall=event;if(!$('install').hidden)renderInstall()});
window.addEventListener('appinstalled',()=>{installed=true;deferredInstall=null;if(!$('install').hidden)renderInstall()});
