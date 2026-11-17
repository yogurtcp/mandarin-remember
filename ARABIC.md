# Spoken Palestinian Arabic

Restored in v1.6.14: 350 cards in 16 topics. Original card IDs, storage key `remember:progress:en-ar-palestinian:v1`, and backup identity `spoken-palestinian-arabic-1` are preserved. Progress saved in this browser before the course was hidden loads again. Phone and desktop storage remain separate.

## Pronunciation issue

The course teaches Palestinian everyday speech with an urban-leaning transliteration. Arabic text is partly unvoweled. Device voices and the static app’s Google fallback receive that text and choose their own vowels and pronunciation; a generic Arabic voice can read it as formal Arabic. The optional local helper uses Jordanian `ar-JO-SanaNeural`, which is also not a verified Palestinian model. Locale preference is not a pronunciation guarantee.

Meaning reviews now show Arabic and the Latin reading instead of requiring unverified listening. Comparison audio remains available on demand, with a visible limitation in practice, the phrasebook, and audio settings. Comparisons are logged as reading rather than listening practice. Production reviews, due dates, and saved settings remain unchanged. This does not correct the audio or independently validate every transliteration.

## Reliable audio path

Use recordings of each word and phrase by a Palestinian speaker, following the intended local variety, then have another speaker check each recording against its meaning, transliteration, and gender labels. Record complete phrases as complete phrases. Enable listening practice only for reviewed recordings. Diacritized `speechText` can help a synthetic voice choose vowels, but cannot guarantee dialect, consonants, stress, or intonation. No native recordings are bundled yet.

Microsoft’s [text-to-speech voice table](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts) lists Jordanian, Lebanese and Syrian voices; Palestinian support elsewhere on that page includes speech recognition and must not be mistaken for a Palestinian TTS voice. Google Cloud explicitly describes its [Arabic `ar-XA` voices](https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types) as Modern Standard Arabic; this is a separate product from the app’s best-effort Google Translate fallback.

## Content references and checks

Original deck references: [Maknuune Palestinian Arabic Lexicon](https://www.palestine-lexicon.org/), [Dibas et al. (2022)](https://aclanthology.org/2022.wanlp-1.13/), and [Lingualism pronunciation guide](https://resources.lingualism.com/levantine-arabic/levantine-arabic-pronunciation/). These references are not a native-speaker sign-off on all app content.

Course tests cover original progress restoration, Arabic RTL configuration, preferred Levantine voice routing, reading-mode meaning review, optional comparison audio, switching back to listening courses, backups, and helper isolation. Mock playback verifies routing, not accent quality on a physical phone.
