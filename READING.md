# Chinese character reading

Open **Learn Chinese characters & compounds** from the Mandarin home screen,
or choose **English → Chinese character reading** in the course selector.

This is a reading starter curriculum: 94 characters and 90 words/compounds.
It teaches recognition and meaning, not stroke order, handwriting, or typing.
It does not claim that every character is a standalone word or that every
compound has a literal character-by-character meaning.

## Learning sequence

The first batch introduces 人, 口, 大, 小 and 多. After a character has a
successful reading recall, it counts toward compound prerequisites.
For example, 人 + 口 unlocks 人口 (population), and 大 + 人 unlocks 大人
(adult). The application prioritizes unlocked compounds in the next new batch
instead of requiring all 94 base characters to be learned first.

Review prompts show Chinese text without pinyin or meaning. Reveal shows the
reading and meaning; compound answers also show their constituent characters.
Using a pinyin hint counts as assistance. Audio is optional and appears with
the answer. Some ambiguous characters use a clearly labeled audio example:
校 is heard in 学校, 子 in 子女, 少 in 多少, 中 in 中国, and 分 in 分钟.
The whole word can use a different reading or a neutral tone; follow its pinyin.

## Shape, meaning, and memory notes (v1.6.17)

Every one of the 94 characters and 90 compounds now has an individual memory
explanation. It appears on the introduction and revealed answer, and directly
in the phrasebook. The entire explanation is inside the hidden answer during
recall; it does not supply an advance clue. Phrasebook search includes the notes.

Character notes distinguish three kinds of explanation:

- **Shape & meaning · historical explanation** summarizes an earlier form and
  its relationship to the meaning, with a character-reference link. For example,
  木 retains a tree image, while 生 relates to a sprout emerging from the ground.
- **Meaning & sound clues** explains how components function. 女 contributes
  meaning in 妈, while 马 supplies a sound clue. Sound relationships can be
  historical and need not match modern Mandarin exactly.
- **Memory aid · modern story** deliberately uses today's visible shape as a
  memory device. The hand-over-eye story for 看 and sun-plus-moon story for 明
  are labeled as modern mnemonics rather than presented as historical origins.

Every compound has **How this word fits together**, explaining each constituent
in that particular word. Examples include 电脑 (electricity + brain → computer),
门口 (door + opening → doorway), and 大小 (big/small → size). Notes also explain
figurative senses, respectful 老 in 老师, neutral-toned endings such as 子, and
directional 来/去. This replaces the previous identical generic compound note.

All explanations are embedded for offline use. Reference links need a connection
only when opened. Existing card IDs, readings, meanings, prerequisites, schedules,
and personal memory cues are preserved; previously learned cards gain the notes
without having to be learned again.

The reading course schedules only recognition reviews. The unused speaking
track remains in the backup structure for schema compatibility but is never
scheduled and is not required for the reading retention metric.

## Progress and upgrades

Reading has its own permanent progress ID and browser storage key. Existing
Mandarin vocabulary progress and Japanese progress are not reset or copied.
Knowing an entire word in the vocabulary course is not treated as proof that
its individual characters can be read independently.
Export/import identifies this reading course separately, as with other courses.
The full reading curriculum is embedded for offline use.

## Content review

Entries and selected everyday senses were authored for this curriculum.
Character/compound readings were cross-checked against the local CC-CEDICT
snapshot dated 2026-09-29, published by MDBG. The remaining ordinary-language
choices include 小门 (small door, a transparent noun phrase) and colloquial
neutral-tone readings for 来/去 directional complements and 面 position words.
These are reading selections, not exhaustive character dictionaries.

Shape and component explanations were authored and cross-checked against the
[Dong Chinese Character Wiki](https://www.dong-chinese.com/wiki), including its
earlier-form analyses and simplified-character notes. Each character explanation
links to its own reference entry. Modern mnemonic stories and compound explanations
are authored learning aids, not quotations from a dictionary or claims that every
modern shape transparently records a word's history. The distinction between
meaning, sound, and visual form is also discussed by
[Outlier Linguistics](https://www.outlier-linguistics.com/post/three-attributes-three-functions).

`verify-reading.cjs` checks coverage of all 184 explanations, type labels,
compound constituents, answer-only display, phrasebook search, safe rendering,
and the existing reading progression and progress restoration. The build rejects
missing required explanations, unsupported types, and missing/unsafe references.

Reference: [CC-CEDICT](https://cc-cedict.org/wiki/) and
[MDBG distribution](https://www.mdbg.net/chinese/dictionary?page=cc-cedict).
The local reference snapshot declares CC BY-SA 4.0. Definitions here are
short authored learning glosses, not copied dictionary entries.
