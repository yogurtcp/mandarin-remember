"""Embed registered courses and the shared app in a standalone index.html."""
from pathlib import Path
import json
import re
source = Path(__file__).resolve().parent
root = source.parent


def load_courses(root):
    registry = json.loads((root / 'courses.json').read_text(encoding='utf-8'))
    courses = []
    ids, progress_ids, storage_keys = set(), set(), set()
    for entry in registry['courses']:
        course = dict(entry)
        course_id = course['id']
        assert re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', course_id), 'Invalid course ID'
        assert course_id not in ids, 'Duplicate course ID'
        ids.add(course_id)
        progress_id = course['progressId']
        storage_key = course.setdefault('storageKey', f'remember:progress:{course_id}:v1')
        assert isinstance(progress_id, str) and progress_id and progress_id not in progress_ids, 'Duplicate/empty progress ID'
        assert storage_key.startswith(('remember:progress:', 'mandarin-remember:reviewed:')), 'Invalid progress storage key'
        assert not {storage_key, storage_key + ':before-import'} & storage_keys, 'Courses must not share progress storage'
        progress_ids.add(progress_id)
        storage_keys.update((storage_key, storage_key + ':before-import'))
        sentence_ids = course.pop('sentenceCardIds', [])
        featured_ids = course.pop('featuredCardIds', [])
        assert isinstance(sentence_ids, list) and isinstance(featured_ids, list) and all(isinstance(card_id, str) and card_id for card_id in [*sentence_ids, *featured_ids]), 'Invalid card ID list'
        featured_priority = {card_id: index for index, card_id in enumerate(featured_ids)}
        for side in ('source', 'target'):
            language = course[side]
            language.setdefault('textLabel', language['name'])
            assert language['dir'] in ('ltr', 'rtl'), 'Invalid text direction'
            for key in ('name', 'lang', 'translateCode'):
                assert isinstance(language[key], str) and language[key], f'Missing {side} {key}'
        for key in ('label', 'testText', 'pronunciationLabel'):
            assert isinstance(course[key], str) and course[key], f'Missing {key}'
        assert course['voiceLanguages'] and all(isinstance(v, str) and v for v in course['voiceLanguages']), 'Missing voice languages'
        deck_files = [course.pop('deckFile'), *course.pop('supplementDeckFiles', [])]
        assert all(isinstance(path, str) and path for path in deck_files), 'Invalid supplemental deck path'
        raw_cards = []
        for deck_file in deck_files:
            deck_path = (root / deck_file).resolve()
            assert deck_path.is_relative_to(root.resolve()), 'Deck must be inside the project'
            raw_cards.extend(json.loads(deck_path.read_text(encoding='utf-8')))
        fields = course.pop('cardFields', {})

        def normalize_text(raw):
            text = raw[fields.get('text', 'text')]
            pronunciation = raw.get(fields.get('pronunciation', 'pronunciation'), '')
            meaning = raw['meaning']
            assert isinstance(text, str) and text.strip() and isinstance(meaning, str) and meaning.strip(), 'Empty card text/meaning'
            assert isinstance(pronunciation, str), 'Invalid pronunciation'
            card = dict(text=text, pronunciation=pronunciation, meaning=meaning)
            if 'speechText' in raw:
                speech_text = raw['speechText']
                assert isinstance(speech_text, str) and speech_text.strip() and len(speech_text) <= 200, 'Invalid speech text'
                card['speechText'] = speech_text
            if course['target']['lang'].startswith('ja'):
                assert not re.search(r'[\u3400-\u9fff]', card.get('speechText', text)), 'Japanese kanji needs an explicit kana speech reading'
            # Sentence forms map an inflected/template surface back to this
            # learned lexical card (for example, Japanese 飲みます → 飲む).
            forms = raw.get('forms', [])
            assert isinstance(forms, list), 'Invalid sentence forms'
            seen_forms = {text.strip()}
            normalized_forms = []
            for form in forms:
                if isinstance(form, str):
                    form = {'text': form}
                assert isinstance(form, dict), 'Invalid sentence form'
                surface, label, reading = form.get('text'), form.get('label', ''), form.get('pronunciation', '')
                assert isinstance(surface, str) and surface.strip() and surface.strip() not in seen_forms, 'Invalid/duplicate sentence form'
                assert isinstance(label, str) and isinstance(reading, str), 'Invalid sentence form detail'
                seen_forms.add(surface.strip())
                normalized_forms.append(dict(text=surface, label=label, pronunciation=reading))
            if normalized_forms:
                card['forms'] = normalized_forms
            return card

        cards, card_ids = [], set()
        for raw in raw_cards:
            assert raw['id'] not in ('__proto__', 'constructor', 'prototype') and re.fullmatch(r'[a-zA-Z0-9_-]+', raw['id']) and raw['id'] not in card_ids, 'Invalid/duplicate card ID'
            card_ids.add(raw['id'])
            assert isinstance(raw['category'], str) and raw['category'], 'Missing category'
            card = dict(id=raw['id'], **normalize_text(raw), category=raw['category'])
            if raw.get('sentence') or raw['id'] in sentence_ids:
                card['sentence'] = True
            if raw.get('featured') or raw['id'] in featured_ids:
                card['featured'] = featured_priority.get(raw['id'], len(featured_priority))
            if course.get('studyMode') == 'reading':
                card['readingOnly'] = True
                assert raw.get('kind') in ('character', 'compound'), 'Invalid reading card kind'
                card['kind'] = raw['kind']
                requirements = raw.get('requires', [])
                assert isinstance(requirements, list) and all(isinstance(item, str) for item in requirements), 'Invalid character prerequisites'
                if requirements:
                    card['requires'] = requirements
                if raw.get('audioContext'):
                    assert isinstance(raw['audioContext'], str), 'Invalid audio context'
                    card['audioContext'] = raw['audioContext']
            if raw.get('usage'):
                assert isinstance(raw['usage'], str), 'Invalid usage note'
                card['usage'] = raw['usage']
            if raw.get('examples'):
                assert 1 <= len(raw['examples']) <= 2, 'Use one or two examples'
                card['examples'] = [normalize_text(e) for e in raw['examples']]
            cards.append(card)
        assert cards, 'Empty course'
        if course.get('studyMode') == 'reading':
            by_id = {card['id']: card for card in cards}
            for card in cards:
                if card['kind'] == 'character':
                    assert len(card['text']) == 1 and not card.get('requires'), 'Base characters must be independent'
                else:
                    requirements = card.get('requires', [])
                    assert requirements and all(item in by_id and by_id[item]['kind'] == 'character' for item in requirements), 'Compound must reference base characters'
                    assert {by_id[item]['text'] for item in requirements} == set(card['text']), 'Compound must cover every character'
        assert set(sentence_ids).issubset(card_ids) and set(featured_ids).issubset(card_ids), 'Unknown sentence/featured card ID'
        course['cards'] = cards
        courses.append(course)
    assert registry['defaultCourse'] in ids, 'Unknown default course'
    for course in courses:
        assert course.get('studyMode') in (None, 'reading'), 'Unknown study mode'
        assert not course.get('characterCourse') or course['characterCourse'] in ids, 'Unknown linked reading course'
    return dict(defaultCourse=registry['defaultCourse'], courses=courses)


def build():
    registry = load_courses(root)
    default = next(c for c in registry['courses'] if c['id'] == registry['defaultCourse'])
    page = (source / 'template.html').read_text(encoding='utf-8')
    parts = {'CARD_COUNT': str(len(default['cards'])),
             'STYLE': (source / 'style.css').read_text(encoding='utf-8'),
             'COURSES': json.dumps(registry, ensure_ascii=False).replace('</', '<\\/'),
             'ENGINE': (source / 'engine.js').read_text(encoding='utf-8'),
             'APP': (source / 'app.js').read_text(encoding='utf-8')}
    for key, text in parts.items():
        page = page.replace('/*' + key + '*/', text)
    (root / 'index.html').write_text(page, encoding='utf-8')
    print(f'Built {len(registry["courses"])} course(s), {sum(len(c["cards"]) for c in registry["courses"])} cards')


if __name__ == '__main__':
    build()
