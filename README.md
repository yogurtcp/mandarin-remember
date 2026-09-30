# Mandarin Remember

A small mobile learning app for everyday Mandarin, with 366 reviewed cards, English prompts, pinyin, spoken recall, listening/reading practice, and spaced reviews.

## Open on your phone

Visit **https://yogurtcp.github.io/mandarin-remember/** in Chrome on Android. In the browser menu choose **Add to Home screen** or **Install app**, when offered. You can share the same URL with anyone; no account is needed to study.

Use **Audio & backup → Play a test sentence**. This hosted version uses your phone/browser’s Mandarin speech voice. If none is available, select or install Mandarin in the phone’s text-to-speech settings, reopen the app, and test again. Voice availability and quality vary by device. This static site does not run a cloud speech service or the separate Linux speech helper.

After an initial successful online load and service-worker installation, lessons are available offline. Speech may still need internet or an installed voice. There are no prerecorded audio files.

## Daily routine

- Spend around 10 minutes most days, starting with due cards.
- Attempt the Mandarin aloud, or recall the meaning of what you hear, **before revealing**.
- Rate the original attempt honestly. Using a hint counts as assistance.
- Start with five new cards daily; lower the limit if reviews pile up.
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
