# Adding a language course

`courses.json` is the registry. A course is an explicit source/target pair, for example English → Mandarin or Russian → Hebrew. Register only pairs with reviewed learning content; no combinations are generated automatically.

## Course record

Add a record to `courses`, with these fields:

- `id`: a stable lowercase slug such as `ru-he`. Also appears in exported filenames.
- `label`: the human-readable source → target label.
- `deckFile`: a JSON path within this repository.
- `progressId`: a permanent, unique backup identity. Never change it for routine vocabulary additions or corrections.
- `source` and `target`: objects with `name`, BCP 47 `lang`, `dir` (`ltr` or `rtl`), and Google Translate `translateCode`. `target.textLabel` optionally controls the Copy button's label; otherwise it defaults to the target name.
- `voiceLanguages`: exact accepted speech-voice language tags, matched case-insensitively with `_` normalized to `-`. Put all dialects the course intentionally supports here. The target's `lang` is preferred when available. Set `preferVoiceOrder: true` to prefer the order of this list over the device’s default voice (after an explicitly saved choice). This is locale selection, not a dialect-quality guarantee.
- `testText`: a natural target-language sentence for the audio test.
- `pronunciationLabel`: for example `Pinyin` or `Transliteration`.
- Optional `pronunciationHelp`, `searchPlaceholder`, and `mark` (a short header symbol).
- Optional `audioNote`, shown in practice, phrasebook and audio settings for course-specific limitations.
- Optional `hintMode`: `pinyin` uses the Mandarin syllable hint; other values/default use the first two pronunciation characters. A card without pronunciation has no pronunciation hint.

The storage key defaults to `remember:progress:<id>:v1`. The Mandarin record deliberately overrides it with `mandarin-remember:reviewed:v1`, preserving all existing users' progress. Never reuse a storage key or `progressId` for another course. The build also checks for collisions with pre-import backup keys.

`localSpeechHelper: true` opts a course into the optional helper protocol. Also register a provider voice in `voice_server.py`’s explicit `VOICES` map. The helper loads text and test sentences from the course registry and advertises supported IDs in `ONLINE_VOICE_COURSES`. Requests include `course`, `id` and `slow`; unknown combinations are rejected. An old helper with only `ONLINE_VOICE_ENABLED` remains Mandarin-only. Do not claim a dialect based on a provider locale tag. The static GitHub Pages app still uses device voices.

Keep `defaultCourse` set to the intended fallback. An unrecognized remembered course falls back to that record; removing a course does not delete its saved data.

## Card format

New decks use language-neutral fields:

```json
[
  {
    "id": "stable-card-id",
    "text": "Target-language word or sentence",
    "pronunciation": "Optional reading or transliteration",
    "meaning": "Meaning in the course's source language",
    "category": "Topic",
    "usage": "Optional usage note",
    "examples": [
      {
        "text": "Target-language example",
        "pronunciation": "Optional reading",
        "meaning": "Source-language translation"
      }
    ]
  }
]
```

`pronunciation` may be omitted or empty. `usage` and `examples` are optional; examples appear in the usage disclosure, so include a usage note with them. Use one or two examples. IDs must be unique **within a course**; different courses may share a card ID without sharing progress. Preserve IDs when editing meanings, spelling, categories or order.

The existing Mandarin source deck retains its `zh` / `pinyin` fields for compatibility with the optional voice helper and prior content tools. Its registry record has `cardFields: {"text": "zh", "pronunciation": "pinyin"}`. The build normalizes these fields, including examples, into the shared runtime format. New decks do not need this adapter.

## Build and verify

```sh
python3 source/build.py
node verify.cjs
node verify-pwa.cjs
node verify-courses.cjs
python3 verify-build.py
python3 verify-voice.py
```

The build embeds all registered courses in `index.html`, retaining standalone-file and offline behavior without runtime requests for deck JSON. It rejects duplicate course identities, conflicting storage keys, duplicate card IDs, empty decks and paths outside the project. Bump the cache version in `sw.js` and the visible version in the template/app on release.

`verify-courses.cjs` exercises both published courses and an additional test-only fixture. It verifies legacy Mandarin progress, colliding card IDs, isolated settings/stats/notes, RTL display attributes, voice filtering, translation links, export/import boundaries, in-flight imports during switching, persistence failures and cross-tab updates. This is software validation, not review or certification of a new language curriculum or a physical device's speech.

The scheduler is shared and language-neutral: call `empty(progressId)` and `validate(backup, cards, progressId)` with the selected course identity. Backups remain schema 1 for compatibility; export/import handles the selected course, not every course in one file. UI controls remain in English independently of the source language of card meanings.
