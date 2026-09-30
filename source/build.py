"""Rebuild index.html after editing source files or ../deck.json."""
from pathlib import Path
import json
source = Path(__file__).resolve().parent
root = source.parent
deck = json.loads((root / 'deck.json').read_text(encoding='utf-8'))
assert len({card['id'] for card in deck}) == len(deck), 'Duplicate card IDs'
page = (source / 'template.html').read_text(encoding='utf-8')
parts = {'STYLE': (source / 'style.css').read_text(encoding='utf-8'),
         'DECK': json.dumps(deck, ensure_ascii=False).replace('</', '<\\/'),
         'ENGINE': (source / 'engine.js').read_text(encoding='utf-8'),
         'APP': (source / 'app.js').read_text(encoding='utf-8')}
for key, text in parts.items():
    page = page.replace('/*' + key + '*/', text)
(root / 'index.html').write_text(page, encoding='utf-8')
print(f'Built {len(deck)} cards into index.html')
