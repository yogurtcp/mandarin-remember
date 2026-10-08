# Spoken Palestinian Arabic · v1.6

The English → Spoken Palestinian Arabic course has **350 cards in 16 topics**. It targets everyday conversation for a beginner living in Israel, with an urban-leaning Palestinian reading. It is not a Modern Standard Arabic reading course and does not represent every local community’s accent.

## Content

Cards combine useful words with selected short sentences. Speaker gender, addressee gender and grammatical gender are labeled where they change the form. Verbs are taught as actual spoken forms, not Arabic past-tense dictionary forms mislabeled as English infinitives.

115 cards include usage notes; examples are attached where context clarifies the sense. Repeated notes on paired masculine/feminine cards are intentional. For example:

- صحيت · ṣḥīt — I woke up.
- قمت · ʾumt — I got up / stood up.
- قمت من التخت · ʾumt min it-takht — I got out of bed.
- قوم! / قومي! · ʾūm! / ʾūmi! — Get up! / Stand up! (to a man / woman).

Family cards distinguish paternal and maternal uncles/aunts. Grandfather and grandmother terms themselves do not encode the side. Other notes distinguish spicy/temperature-hot, free/empty, expensive/dear, and knowing/understanding.

| Topic | Cards |
|---|---:|
| Greetings & courtesy | 20 |
| People & introductions | 21 |
| Questions & understanding | 21 |
| Requests & useful replies | 24 |
| Family | 24 |
| Food & drink | 34 |
| Eating out | 18 |
| Shopping & money | 16 |
| Places & directions | 25 |
| Home & daily routine | 22 |
| Time & plans | 19 |
| Work & social life | 22 |
| Useful actions | 20 |
| Feelings & health | 25 |
| Useful descriptions | 22 |
| Numbers & quantities | 17 |

## Readings and audio

Arabic spelling is partly unvoweled; the Latin reading records the intended spoken form. Long vowels use ā ī ū ē ō. ʿ represents ع, ʾ a glottal stop, ḥ the breathy pharyngeal consonant, and ṣ ḍ ṭ ẓ emphatic consonants. Doubled letters represent longer consonants. Initial glottal stops are generally omitted from the learner reading. These are learner transliterations, not narrow phonetic transcriptions or a full stress notation.

The course usually transcribes ق as ʾ, common in urban speech. Other local q/g/k pronunciations, short vowels, and realizations of ج vary. Regional differences are not automatically errors. An Arabic keyboard can search without vowel marks or tatweel; the cards themselves retain distinctions such as كيفَك / كيفِك.

**Synthetic audio is not a verified Palestinian pronunciation model.** The app displays this on Arabic practice cards, in the phrasebook and in audio settings. Device voices are filtered to Arabic; the automatic choice prefers Palestinian/local or nearby Levantine locale tags before other Arabic voices. A locale tag alone does not establish dialect quality. Google Translate is a comparison tool and may also use formal Arabic.

On GitHub Pages, both courses use a device voice when available, with on-demand Google speech if no voice is available or device playback fails (v1.6.1). Online voice can also be selected explicitly. The played text is sent to Google; audio is not prefetched. Google audio uses pitch-preserving slowdown. Device rate support varies. “Read instead” remains available when offline or when speech fails.

The optional Linux helper uses ar-JO-SanaNeural (Jordanian locale) for Arabic and zh-CN-XiaoxiaoNeural for Mandarin. The Jordanian voice is a fallback, not a claim of Palestinian pronunciation. Requests, test sentences and cache keys identify the course. Audio is generated on demand; no recording collection is bundled.

## Review and references

The deck was authored and reviewed for this app, with selected lexical spellings/readings cross-checked against [Maknuune, the Open Palestinian Arabic Lexicon](https://www.palestine-lexicon.org/) ([Dibas et al., 2022](https://aclanthology.org/2022.wanlp-1.13/)). Checks corrected draft mismatches such as foot/leg spelling إجر for ijir, spoken chicken جاج for jāj, and برتقان for the spoken orange form. The lexicon’s sentence examples were not imported.

Additional reference: [Lingualism’s Levantine pronunciation guide](https://resources.lingualism.com/levantine-arabic/levantine-arabic-pronunciation/). Provider locale names were checked against [Microsoft’s voice list](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support).

This is not an independent native-speaker sign-off or an end-to-end audit of each phone’s audio. Local-speaker feedback and human recordings remain useful next quality improvements.

## Shared functionality and progress

Both courses use the same scheduler and UI: introductions, speaking recall, listening/reading recall, hints, memory cues, due reviews, extra/weak review, pause/resume, daily limits, Learn 5 more, statistics, usage/examples, search, normal/slow speech, copy/translation links, install/offline, and export/import.

Arabic storage: `remember:progress:en-ar-palestinian:v1`; backup identity: `spoken-palestinian-arabic-1`. Mandarin’s existing storage and identity remain unchanged. Backups are for one selected course. No account sync or cross-language progress transfer is implied.

## Validation

`verify-courses.cjs` runs the published feature paths for both courses and a separate collision fixture. `verify-voice.py` tests the helper with mocked speech, including identical test IDs in both courses, rate separation and cache isolation. Existing Mandarin, scheduler, PWA and build checks also run. Real Chrome was checked at a mobile viewport for Arabic layout, study, switching, search, examples and reload persistence. These tests do not certify physical Android speech quality.
