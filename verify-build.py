"""Check actual course packaging and reject progress namespace collisions."""
from pathlib import Path
from tempfile import TemporaryDirectory
import copy
import importlib.util
import json

root = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('course_build', root / 'source/build.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
registry = json.loads((root / 'courses.json').read_text())
with TemporaryDirectory() as directory:
    folder = Path(directory)
    (folder / 'deck.json').write_bytes((root / 'deck.json').read_bytes())
    second = copy.deepcopy(registry['courses'][0])
    second.update(id='ru-he-test', progressId='test-ru-he', deckFile='second.json', label='Russian → Hebrew')
    second.pop('storageKey')
    second.pop('cardFields')
    second.pop('localSpeechHelper')
    second.update(source=dict(name='Russian', lang='ru', dir='ltr', translateCode='ru'),
                  target=dict(name='Hebrew', lang='he-IL', dir='rtl', translateCode='iw'),
                  voiceLanguages=['he-IL'], testText='שלום')
    cards = [dict(id='same-id', text='שלום', meaning='привет', category='Test', usage='Test note',
                  examples=[dict(text='שלום', meaning='привет')])]
    (folder / 'second.json').write_text(json.dumps(cards))
    test = copy.deepcopy(registry)
    test['courses'].append(second)

    def load(value):
        (folder / 'courses.json').write_text(json.dumps(value))
        return builder.load_courses(folder)

    built = load(test)
    assert len(built['courses']) == 2
    assert built['courses'][0]['cards'][0]['text'] == '妈妈'
    assert 'zh' not in built['courses'][0]['cards'][0]
    assert built['courses'][1]['storageKey'] == 'remember:progress:ru-he-test:v1'
    assert built['courses'][1]['cards'][0]['pronunciation'] == ''
    assert built['courses'][1]['cards'][0]['examples'][0]['pronunciation'] == ''
    assert built['courses'][1]['target']['dir'] == 'rtl'
    for key, value in [('id', test['courses'][0]['id']),
                       ('progressId', test['courses'][0]['progressId']),
                       ('storageKey', test['courses'][0]['storageKey']),
                       ('storageKey', test['courses'][0]['storageKey'] + ':before-import'),
                       ('deckFile', '../outside.json')]:
        bad = copy.deepcopy(test)
        bad['courses'][1][key] = value
        try:
            load(bad)
        except AssertionError:
            pass
        else:
            raise AssertionError(f'Build accepted invalid {key}')
print('PASS build: multiple courses, legacy field normalization, optional readings, RTL metadata, and identity/storage/path validation.')
