# Mandarin Remember

A small mobile learning app for everyday Mandarin, with 788 cards, English prompts, pinyin, spoken recall, listening/reading practice, and spaced reviews.

## Open on your phone

Visit **https://yogurtcp.github.io/mandarin-remember/** in Chrome on Android. Tap **Install** in the app for a direct install prompt when available, or instructions showing where Chrome’s **⋮ → Add to Home screen** menu is. You can share the same URL with anyone; no account is needed to study.

Use **Audio & backup → Play a test sentence**. This hosted version uses your phone/browser’s Mandarin speech voice. If none is available, select or install Mandarin in the phone’s text-to-speech settings, reopen the app, and test again. Voice availability and quality vary by device. This static site does not run a cloud speech service or the separate Linux speech helper.

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
```

Preserve card IDs when correcting wording. Bump the service-worker cache version when changing cached assets. Publish GitHub Pages from the root of the `main` branch. No build service, API key or backend is needed.

## September 2026 update

422 new cards cover breakfast, fruit and vegetables, cooking, relatives, friends, coworkers, professions, errands, eating out, transport, health, useful verbs and descriptions. Existing card IDs and saved progress remain compatible. New lexical pronunciations were cross-checked with [CC-CEDICT](https://cc-cedict.org/wiki/); phrases were reviewed separately. Colloquial neutral tones are retained, and 一/不 use spoken tone changes.

Normal device speech now requests rate 1.0 and Slow requests 0.4. Audio settings provide both test buttons; actual speed depends on the device voice. Online helper playback also applies pitch-preserving slowdown.

## Compare pronunciations

Revealed cards and phrasebook entries offer **Copy Chinese** and **Google Translate**. The link opens the Chinese text in Google Translate; tap the speaker beside the Chinese text to hear it. Only clicking the link sends that card text to Google. Copy also provides a selectable-text fallback when clipboard permission is unavailable. Google speech is a useful comparison, but ambiguous characters can still need context.
