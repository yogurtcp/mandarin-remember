# Remember Languages

A mobile learning app with English → Mandarin (1,121 cards), English → Japanese (60 starter cards), and Chinese character reading (94 characters and 90 compounds). Select your course on the home screen.

## Open on your phone

Visit **https://yogurtcp.github.io/mandarin-remember/** in Chrome on Android. Tap **Install** in the app for a direct install prompt when available, or instructions showing where Chrome’s **⋮ → Add to Home screen** menu is. You can share the same URL with anyone; no account is needed to study.

Use **Menu → Audio & backup → Test normal / Test slow**. Automatic uses your device voice when available and Google speech when a voice is missing or fails. You can also select Online voice explicitly. Only the phrase you play is sent to Google; there is no bulk audio download. Device voice stays available for offline use when installed. The separate Linux helper is optional.

After an initial successful online load and service-worker installation, lessons are available offline. Speech may still need internet or an installed voice. There are no prerecorded audio files.

## Daily routine

- Spend around 10 minutes most days, starting with due cards.
- Attempt the target language aloud, or recall the meaning of what you hear, **before revealing**.
- Rate the original attempt. Using a hint counts as assistance.
- Use the daily plan, or tap Learn 5 more for another batch whenever you want.
- Use one phrase in real life; get feedback from a speaker of the language on your pronunciation.
- Export a progress backup weekly.

These are practical defaults. The scheduler is a transparent heuristic, not a guarantee of memory. The app does not record or automatically grade your pronunciation.

## Your progress

Progress and notes stay in your browser. Sharing the website does not share your progress. Different people and devices keep separate records. To move progress from the local desktop version, export a backup there, then import it here through Audio & backup. There is no automatic synchronization. Clearing browser data can erase progress, so keep backups.

The site is public; the hosting provider and your device’s speech provider may process ordinary connection/speech requests. This app includes no analytics or account system.

## Evidence

The design centers on retrieval practice and distributed practice: [Karpicke & Roediger (2008)](https://learninglab.psych.purdue.edu/downloads/2008/2008_Karpicke_Roediger_Science.pdf), [Dunlosky et al. (2013)](https://www.psychologicalscience.org/publications/journals/pspi/learning-techniques.html), and [Cepeda et al. (2008)](https://digitalcommons.usf.edu/psy_facpub/1766/). Exact intervals and workload limits are design choices, not experimentally optimal values.

## Maintain

`index.html` embeds the whole deck, CSS and JavaScript. Edit the files in `source/` or `deck.json`, then run:

```sh
python3 source/build.py
node verify.cjs
node verify-pwa.cjs
node verify-courses.cjs
node verify-recall.cjs
node verify-reading.cjs
python3 verify-build.py
python3 verify-voice.py
```

Preserve card IDs when correcting wording. Bump the service-worker cache version when changing cached assets. Publish GitHub Pages from the root of the `main` branch. No build service, API key or backend is needed.

## Reading and sentence practice (v1.6.13)

The Mandarin home screen now has **Learn Chinese characters & compounds**.
It opens a reading-only course: recognize 94 base characters, then unlock 90
words/compounds using familiar characters. A successful character recall—not
just its introduction—unlocks its compounds, which are prioritized in the next
learning batch. Reviews show Chinese first and reveal pinyin and meaning.
No handwriting, typing, or listening gate is required. Reading progress is
separate from existing vocabulary progress. See [READING.md](READING.md).

Seventy existing reviewed examples are now also available as full sentence
recalls, expanding the composable Mandarin bank from 142 to 212 sentences and
the vocabulary covered by those sentences from 109 to 185 entries.
They still appear only during recall using learned words.
Missed or hinted sentences return after a short gap and other recalls where
available, with at most two retries. A retry is practice-only and does not
change word schedules a second time. Saved IDs and existing progress remain
compatible.

## September 2026 update

422 new cards cover breakfast, fruit and vegetables, cooking, relatives, friends, coworkers, professions, errands, eating out, transport, health, useful verbs and descriptions. Existing card IDs and saved progress remain compatible. New lexical pronunciations were cross-checked with [CC-CEDICT](https://cc-cedict.org/wiki/); phrases were reviewed separately. Colloquial neutral tones are retained, and 一/不 use spoken tone changes.

Normal device speech now requests rate 1.0 and Slow requests 0.4. Audio settings provide both test buttons; actual speed depends on the device voice. Online helper playback also applies pitch-preserving slowdown.

## Japanese starter course and sentence templates (v1.6.7)

### Japanese speech reading correction (v1.6.11)

All 60 Japanese cards were checked against their displayed readings. Cards containing kanji now have explicit kana speech text: for example, 私 → わたし (watashi), 家 → いえ (ie), 明日 → あした (ashita), 今日 → きょう (kyō), and 来る → くる (kuru). Full sentences and the audio test also supply the intended reading. This prevents a speech engine from selecting an alternative kanji reading while leaving the original writing, romaji, card IDs and saved progress intact. Normal and slow device speech, Google speech, and automatic error fallback use the same reading. Tests verify speech inputs and routing; the voice provider still determines accent and sound quality.

Choose **English → Japanese** on the home screen for 45 foundational words and 15 fully validated everyday sentences. Japanese sentences use the same word-based review system as Mandarin, but their polite surface forms are explicit templates: for example, **飲みます** is shown as the polite non-past form of the scored base word **飲む**. The sentence breakdown displays both forms and explains particles such as は and を without scheduling those connectors as cards.

Chinese sentence cards were also revalidated. A sentence only enters practice when its entire composition resolves to known cards plus documented connectors; 212 of the current 295 Chinese sentence cards meet that standard. The remainder stay safely out of the sentence queue until their missing vocabulary or an explicit form template is added—there is no partial credit or guessed mapping.

## Common Mandarin interactions (v1.6.10)

The Mandarin course now includes a checked **Common interactions** set: polite requests for water, a receipt, or an indicated item; asking for a phone charger; greeting and “I’m well, thanks. And you?” exchanges; meeting/parting language; and “How have you been lately?” The shared sentence system tests that each of these is scheduled only after all of its component cards are learned. The request pattern appears in several real variants—`请给我一杯水。`, `请给我小票。`, and `请给我这个。`—rather than as an unspoken blank placeholder. These interaction foundations are prioritized in the next new-card batches, and existing unpunctuated utterances such as `你好吗` and `我很好` are explicitly treated as sentences rather than vocabulary words.

## More varied sentences (v1.6.6)

### Recall-time selection (v1.6.12)

Sentences now replace individual recall tasks at display time instead of being appended when a session starts. Each replacement includes the word being reviewed, keeps its speaking/understanding direction, and uses only learned, unpaused vocabulary plus explained connectors. Roughly every other recall uses a sentence when a matching one is available; even a one-task review can use a sentence. Selection follows the reviewed word's topic and rotates through the authored sentence bank without repeating a sentence within that session. Eligibility is checked again as the session progresses and includes vocabulary learned before this update.

**Learn 5 more and other sessions containing only new-card introductions stay word-only**, including their one-minute recall steps. Mixed daily sessions introduce new vocabulary as individual words and use sentences only for recall tasks. Sentence grades still credit the constituent word schedules once per direction per session; Extra review remains practice-only. Saved card identities, schedules and Japanese speech readings remain compatible. The earlier release descriptions below document the previous session-start insertion behavior.

Sentence cards are no longer learned or reviewed as words: new-card plans, due reviews, extra review and word progress count only vocabulary words, and a sentence card left in older saved progress is simply never scheduled again — it can only appear through this sentence system. Sentences now appear about one task in three. Selection rotates by least-recently-shown (using a practice-only exposure log, still no sentence card or schedule) and picks different sentence frames — the pattern with its scored words blanked, e.g. `___在哪里` — before reusing a frame, so the same sentence should not keep coming back while other known-word sentences wait. The revealed answer adds **How this sentence is built**: each scored word with its reading and meaning, the frame, and any connecting words (pronouns, question/aspect particles and similar glue) with a short explanation. Connecting words are explained, not scored.

## Phrasebook by topic (v1.6.5)

The Phrasebook (Menu → Phrasebook) now groups the full dictionary under topic headings in deck order, each with a shown/total count, plus a tappable topic index at the top that jumps to a topic (loading more if needed). Search still searches everything and keeps the grouping.

## Sentences alongside words (v1.6.4)

About one task in five is a full sentence, in parallel with vocabulary: **Say the sentence** (produce it from the meaning) or **What does the sentence mean?** (listen/read and recall). A sentence appears only when every word in it has already been learned — sentences are never introduced or tracked as cards. Your sentence grade is credited to every word in the sentence, updating each word's review date through the normal scheduler; a word already practised in the same session is not rescheduled twice. Sentences whose words are not all in the deck stay hidden, and the selection follows the selected Topic.

## Compare pronunciations

Revealed cards and phrasebook entries offer **Copy Chinese** and **Google Translate**. The link opens the Chinese text in Google Translate; tap the speaker beside the Chinese text to hear it. Only clicking the link sends that card text to Google. Copy also provides a selectable-text fallback when clipboard permission is unavailable. Google speech is a useful comparison, but ambiguous characters can still need context.

## Meanings in context (v1.3)

102 cards now include short sense or usage notes and 138 original example sentences, each with pinyin and English. Expand **Usage & examples** after revealing an answer or in the phrasebook. The examples also link to Google Translate with the full sentence, useful when an isolated character has multiple readings. Phrasebook search includes this context. English prompts were clarified where a bare gloss could mislead; IDs and review history are unchanged.

For example, 起床 means getting out of bed and can be used both in a statement and in a wake-up call. Other notes distinguish borrowing/lending, listening/hearing/understanding, physical and figurative English meanings, polite requests, and context-dependent pronunciations. Read the examples when a sense is unclear; on reviews, attempt the card before opening its answer. These are selected everyday senses, not exhaustive dictionary entries or a native-speaker/audio certification.

Lexical reference: [CC-CEDICT](https://cc-cedict.org/wiki/). The borrow/lend distinction was also checked against the [Ministry of Education's entry for 借](https://dict.mini.moe.edu.tw/SearchIndex/word_detail?breadcrumbs=Search_%E5%80%9F_one&dictSearchField=%E5%80%9F&wordID=D0003074). Examples are authored for this app.

## Related vocabulary (v1.4)

Added 246 words and short phrases across 23 existing topics, bringing the deck to 1,034 cards. Both sets of grandparents are now introduced together; the maternal terms 外婆 / 外公 already existed, and their notes now include the common alternatives 姥姥 / 姥爷. See [the content review](CONTENT-UPDATE.md) for counts, examples and pronunciation checks.

Selected new sentences follow their base word, such as 起床 → 我起床了 → 该起床了. Seventeen existing sentences were moved beside their related word instead of adding duplicates. New introductions follow deck order within the selected topic; later reviews retain their individual due dates. All 788 existing card IDs are preserved. Search the phrasebook for English meanings, Chinese, pinyin, or names appearing in usage notes.

## Language-course foundation (v1.5)

The home screen now has a **Course** selector. This release introduced the course registry; additional reviewed decks can be registered without rewriting the study flow. Each source/target course keeps separate progress, daily limits, statistics, notes, paused cards and voice settings. Switching ends the current session; graded work is already saved. Backups identify their course and cannot overwrite another course.

Existing Mandarin progress uses exactly the same storage key and backup identity as before. It is not copied, reset or moved. Course selection is remembered, and all registered decks are embedded for offline use. The shared interface remains English; card meanings can be in another source language and target text can run right to left. No account synchronization or automatic cross-language translation is added.

See [COURSES.md](COURSES.md) for adding a course. The two-course automated tests use a private fixture only; they do not publish an unfinished Hebrew deck.

## Optional Linux online speech

Run `./start-online.sh`, then open the localhost address it prints. First run installs the pinned speech client. Only phrases you play are sent to the service. The optional helper uses Mandarin Xiaoxiao and has a bounded cache (128 files / 8 MB). Japanese uses device speech or the app’s Google fallback. No audio deck is bundled.

The helper binds to the laptop’s loopback interface and is separate from GitHub Pages. Installing the website on a phone uses that phone’s voices; it does not connect to the laptop helper. Core practice and saved progress work without the helper.

## Missing-voice audio fallback (v1.6.1)

The published app has on-demand Google speech for Mandarin and Japanese. Automatic falls back when there is no suitable device voice or device playback fails. Online voice selects online playback directly; Device voice keeps playback device-only. Slow applies pitch-preserving playback at 0.65× for Google audio. The existing local helper retains its own synthesis rate and playback settings.

Google’s Translate speech endpoint is undocumented and may change or throttle requests; it is not a guaranteed Google Cloud API. Failure or timeout shows a direct Google Translate link. No API keys, backend deployment, audio bundle or account is required. A no-referrer policy avoids sending this app’s page URL with audio requests. No phrase is requested until you press a playback control.

Regression tests cover **zero installed voices**, errors, timeouts and source preferences. This verifies playback, not accent accuracy or every Android device.
