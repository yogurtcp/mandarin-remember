# Arabic letters and vowel marks

Open **Learn Arabic letters & vowel marks** on the Palestinian Arabic home screen,
or select **English → Arabic letters & vowel marks**. The guide is embedded for
offline use and keeps its own progress, separate from vocabulary and Chinese reading.
Tap **Letter guide** to browse letters, marks, connected shapes, and exercises
without starting a study session.

The 64 items cover the 28 alphabet letters, six extra forms (ء ة ى أ إ آ), six
pronunciation marks, six practice syllables, and 18 familiar Palestinian words.
The extra forms are not presented as six additional alphabet letters.

## Learning sequence

The first batch introduces ب, fatḥa ◌َ, ا, ت, and kasra ◌ِ. After successful
reading recalls, practice such as بَ (ba), بِ (bi), بَا (bā), and بَاب (door)
unlocks. Every letter and written vowel mark in a practice item must have been
recalled successfully; introduction alone is insufficient. Unlocked practice
has priority in the next learning batch. Paused prerequisites remain locked.

Reviews show the Arabic letter, mark, syllable, or word. The name, sound,
Latin reading, meaning, connected forms, and explanations stay behind Reveal.
A reading hint counts as assistance. The guide asks for recognition, not
writing, typing, or a listening test. Optional audio for a letter or mark
reads its **name**; it does not claim to pronounce an isolated consonant.

Letter cards show isolated, initial, medial, and final shapes. Connecting
strokes illustrate the join; they are not extra letters. The six common
non-joiners ا د ذ ر ز و can attach to the preceding letter but do not join the
following one. Word-final ة and ى are taught separately. Ordinary Unicode
Arabic letters are used so the device font performs joining naturally.

## Vowel marks and Palestinian reading

The six mark cards teach fatḥa (short a), kasra (i/e), ḍamma (u/o), sukūn
(no vowel), shadda (double consonant), and fatḥatān/tanwīn -an in expressions
such as شُكْرًا. The dotted circle is a placeholder, not an Arabic character to learn.
Long ā/ī/ū use vowel letters. In local speech ـَيْ and ـَو can be ē and ō;
the Latin reading resolves the distinction. Final ة can be a/e or t in a
combination. Urban ق is often ʾ; other Palestinian varieties differ.

The vocabulary course now includes marks on its 350 cards and their examples.
These are learner annotations for the existing readings, preserving the
original base letters and IDs. Ordinary spelling is not a narrow phonetic
transcription: for example, written أولاد has a local wlād reading. Notes and
Latin readings remain necessary. Formal case endings are not added to everyday
speech. No native-speaker sign-off or dialect-verified recording set is claimed.

## Sources and validation

The explanations and exercises are authored for this app. References for
joining, marks, and local reading conventions include [Unicode Arabic](https://www.unicode.org/versions/Unicode16.0.0/core-spec/chapter-9/),
[Mamoun Sakkal’s alphabet chart](https://www.sakkal.com/articles/sakkal_arabic_alphabet.pdf),
and [Lingualism’s Levantine pronunciation guide](https://resources.lingualism.com/levantine-arabic/levantine-arabic-pronunciation/).
Selected lexical vocalizations, including قَهْوِة and جِبْنِة, were cross-checked
against the local [Maknuune](https://www.palestine-lexicon.org/) reference.
Reference artwork and dictionary examples were not imported.

`verify-arabic.cjs` exercises the bundled UI, answer hiding, RTL metadata,
successful-recall gates, optional name audio, marked/unmarked search, original
vocabulary progress, and separate guide backup/import/restart. Build checks
reject missing vowel prerequisites, cycles, invalid mark displays, and
incomplete letter-shape tables. Tests do not certify phone font rendering or
synthetic pronunciation quality.
