# Remember Languages

A small mobile learning app for everyday Mandarin, with 1,034 cards, English prompts, pinyin, spoken recall, listening/reading practice, and spaced reviews.

## Open on your phone

Visit **https://yogurtcp.github.io/mandarin-remember/** in Chrome on Android. Tap **Install** in the app for a direct install prompt when available, or instructions showing where Chrome’s **⋮ → Add to Home screen** menu is. You can share the same URL with anyone; no account is needed to study.

Use **Menu → Audio & backup → Test normal / Test slow**. This hosted version uses your phone/browser’s Mandarin speech voice. If none is available, select or install Mandarin in the phone’s text-to-speech settings, reopen the app, and test again. Voice availability and quality vary by device. This static site does not run a cloud speech service or the separate Linux speech helper.

After an initial successful online load and service-worker installation, lessons are available offline. Speech may still need internet or an installed voice. There are no prerecorded audio files.

## Daily routine

- Spend around 10 minutes most days, starting with due cards.
- Attempt the Mandarin aloud, or recall the meaning of what you hear, **before revealing**.
- Rate the original attempt. Using a hint counts as assistance.
- Use the daily plan, or tap Learn 5 more for another batch whenever you want.
- Use one phrase in real life; get feedback from a Mandarin speaker on your tones.
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
python3 verify-build.py
```

Preserve card IDs when correcting wording. Bump the service-worker cache version when changing cached assets. Publish GitHub Pages from the root of the `main` branch. No build service, API key or backend is needed.

## September 2026 update

422 new cards cover breakfast, fruit and vegetables, cooking, relatives, friends, coworkers, professions, errands, eating out, transport, health, useful verbs and descriptions. Existing card IDs and saved progress remain compatible. New lexical pronunciations were cross-checked with [CC-CEDICT](https://cc-cedict.org/wiki/); phrases were reviewed separately. Colloquial neutral tones are retained, and 一/不 use spoken tone changes.

Normal device speech now requests rate 1.0 and Slow requests 0.4. Audio settings provide both test buttons; actual speed depends on the device voice. Online helper playback also applies pitch-preserving slowdown.

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

The home screen now has a **Course** selector. English → Mandarin remains the only published course; additional reviewed decks can be registered without rewriting the study flow. Each source/target course keeps separate progress, daily limits, statistics, notes, paused cards and voice settings. Switching ends the current session; graded work is already saved. Backups identify their course and cannot overwrite another course.

Existing Mandarin progress uses exactly the same storage key and backup identity as before. It is not copied, reset or moved. Course selection is remembered, and all registered decks are embedded for offline use. The shared interface remains English; card meanings can be in another source language and target text can run right to left. No account synchronization or automatic cross-language translation is added.

See [COURSES.md](COURSES.md) for adding a course. The two-course automated tests use a private fixture only; they do not publish an unfinished Hebrew deck.
