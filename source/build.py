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
        for side in ('source', 'target'):
            language = course[side]
            language.setdefault('textLabel', language['name'])
            assert language['dir'] in ('ltr', 'rtl'), 'Invalid text direction'
            for key in ('name', 'lang', 'translateCode'):
                assert isinstance(language[key], str) and language[key], f'Missing {side} {key}'
        for key in ('label', 'testText', 'pronunciationLabel'):
            assert isinstance(course[key], str) and course[key], f'Missing {key}'
        assert course['voiceLanguages'] and all(isinstance(v, str) and v for v in course['voiceLanguages']), 'Missing voice languages'
        deck_path = (root / course.pop('deckFile')).resolve()
        assert deck_path.is_relative_to(root.resolve()), 'Deck must be inside the project'
        raw_cards = json.loads(deck_path.read_text(encoding='utf-8'))
        fields = course.pop('cardFields', {})

        def normalize_text(raw):
            text = raw[fields.get('text', 'text')]
            pronunciation = raw.get(fields.get('pronunciation', 'pronunciation'), '')
            meaning = raw['meaning']
            assert isinstance(text, str) and text.strip() and isinstance(meaning, str) and meaning.strip(), 'Empty card text/meaning'
            assert isinstance(pronunciation, str), 'Invalid pronunciation'
            return dict(text=text, pronunciation=pronunciation, meaning=meaning)

        cards, card_ids = [], set()
        for raw in raw_cards:
            assert raw['id'] not in ('__proto__', 'constructor', 'prototype') and re.fullmatch(r'[a-zA-Z0-9_-]+', raw['id']) and raw['id'] not in card_ids, 'Invalid/duplicate card ID'
            card_ids.add(raw['id'])
            assert isinstance(raw['category'], str) and raw['category'], 'Missing category'
            card = dict(id=raw['id'], **normalize_text(raw), category=raw['category'])
            if raw.get('usage'):
                assert isinstance(raw['usage'], str), 'Invalid usage note'
                card['usage'] = raw['usage']
            if raw.get('examples'):
                assert 1 <= len(raw['examples']) <= 2, 'Use one or two examples'
                card['examples'] = [normalize_text(e) for e in raw['examples']]
            cards.append(card)
        assert cards, 'Empty course'
        course['cards'] = cards
        courses.append(course)
    assert registry['defaultCourse'] in ids, 'Unknown default course'
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
