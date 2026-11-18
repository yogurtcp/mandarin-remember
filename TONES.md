# Mandarin pinyin tone questions

In regular **English → Mandarin**, **Start practice** mixes tone questions
with word and sentence recall. **Practise tones** on the home screen starts
a focused batch for learned words in the selected topic. All 826 vocabulary
entries are covered. Sentences and the separate character-reading course do
not become tone cards.

## What a question tests

The prompt shows the Chinese word and its meaning. Four pinyin choices have
the same syllables and differ only in tone marks. Choice order is shuffled.
Syllables are spaced for clarity: for example, mā ma matches the card māma.
Neutral syllables have no mark; ü, capitalization, and 儿 suffixes are preserved.
In T恤, the fixed letter T does not acquire a Mandarin tone.

Before choosing, the answer, hints, personal cue, and audio controls are hidden.
There is no self-rating or premature Show answer for a tone question. Choosing
automatically records correct or missed, shows the correct reading and tone
pattern, then makes normal/slow audio available with the answer. This tests
knowledge of tones, not the pitch of recorded speech.

Questions match the course’s authored pinyin. Third-tone spellings retain
underlying third tones even when connected speech changes the pitch. For a
two-syllable 3 + 3 pattern, feedback explains that the first is usually spoken
with a rising tone. 一/不 retain the readings already authored on each card;
the feature does not silently rewrite them into another notation convention.

## Recall and progress

Tone checks have an independent schedule in optional `toneProgress` data.
Speaking and meaning schedules, personal cues, existing card IDs, and the
course identity are preserved. Tapping Correct/Easy on speaking cannot erase
a failed tone check. The home screen reports checked words, due tone questions,
and recent automatic correctness separately from word retention.

Previously learned words become eligible automatically. No new-card introduction
is required, and new-word counts do not increase. Newly introduced words first
become due for a tone check after ten minutes, rather than immediately after
their pinyin was displayed. Learn 5 more remains introductions and their ordinary
short recall steps.

When ordinary reviews are due, roughly a third of the review slots can be tone
checks; if only tones are due they can fill the batch. A mixed plan avoids
quizzing both the tones and ordinary recall of the same word in that batch.
Sentence selection avoids words with an upcoming tone question so its revealed
answer does not give away the quiz. Due failed tones get priority over the
untested backlog. Topic filters and paused words apply to tone checks too.

Missed tones return after a gap with at most two retries in a session. Finishing
early does not discard the saved due date. Correct tone answers use the existing
normal spacing heuristic, without an Easy override. Early focused practice and
Extra review do not postpone an existing scheduled tone review.

Old backups without `toneProgress` still import. New backups preserve tone
schedules and automatically scored history alongside the original word progress.
The quiz generator and syllable data are embedded for offline use; no server,
microphone, or pronunciation-grading service is used.

## Content and validation

`decks/en-zh-tone-readings.json` records syllable boundaries for each stable word
ID. Boundaries were cross-checked against the local [CC-CEDICT](https://cc-cedict.org/wiki/)
reference; every reading exactly preserves its existing card pinyin. The build
requires complete vocabulary coverage and rejects sentence IDs, missing words,
invalid syllables, or changed readings. No runtime segmentation guessing occurs.

Pinyin tone conventions and speech changes were checked against
[Oxford CTCFL pinyin notes](https://www.ctcfl.ox.ac.uk/materials_pinyin-notes/)
and the [Routledge course’s pinyin lesson](https://routledgetextbooks.com/textbooks/9781138101111/lesson1.php).

`verify-tones.cjs` generates multiple quizzes for all 826 words and checks four
distinct tone-only choices with exactly one correct answer. It also exercises
the bundled UI click handler, hidden clues, automatic grades, bounded retries,
independent schedules, old-progress hydration, backups/import/restart, category
and pause filters, mixed recall, and isolation from the other courses.
