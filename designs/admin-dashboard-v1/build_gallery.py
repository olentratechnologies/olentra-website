"""Build an offline review gallery from the generated design manifests."""
from pathlib import Path
import json
import struct
import zipfile

ROOT = Path(__file__).resolve().parent
entries = []
corrections = []
for manifest in sorted((ROOT / 'manifests').glob('*.json')):
    content = json.loads(manifest.read_text())
    entries.extend(content if isinstance(content, list) else content.get('screens', []))
    if isinstance(content, dict):
        corrections.extend(content.get('corrections', []))
for item in entries:
    item['id'] = int(item['id'])
entries.sort(key=lambda item: item['id'])
ids = [int(item['id']) for item in entries]
assert ids == list(range(1, 41)), f'Missing or duplicate designs: {ids}'
for item in entries:
    item['generation_tool'] = 'Built-in imagegen'
    item['style_reference'] = 'screens/02-website-controls.png'
    item['refinements'] = [change for change in corrections if int(change.get('id', change.get('screenId', -1))) == int(item['id'])]
    path = ROOT / item['file']
    data = path.read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', f'Invalid PNG: {path}'
    width, height = struct.unpack('>II', data[16:24])
    assert width >= 700 and height >= 700, f'Unexpected image size: {path}'
    item['width'], item['height'] = width, height
    item['orientation'] = 'mobile' if height > width else 'desktop'

template = (ROOT / 'gallery-template.html').read_text()
payload = json.dumps(entries, ensure_ascii=False).replace('</', '<\\/')
(ROOT / 'index.html').write_text(template.replace('__DESIGN_DATA__', payload))
(ROOT / 'screen-index.json').write_text(json.dumps(entries, indent=2, ensure_ascii=False) + '\n')
with zipfile.ZipFile(ROOT.parent / 'olentra-admin-dashboard-designs-v1.zip', 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(ROOT.rglob('*')):
        if path.is_file() and path.name not in {'gallery-template.html', 'build_gallery.py'}:
            archive.write(path, arcname='olentra-admin-dashboard-designs-v1/' + str(path.relative_to(ROOT)))
print(json.dumps({'screens': len(entries), 'gallery': str(ROOT / 'index.html'), 'archive': str(ROOT.parent / 'olentra-admin-dashboard-designs-v1.zip')}, indent=2))
