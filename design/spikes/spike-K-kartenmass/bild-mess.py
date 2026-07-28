# Hephaistos — Messung am echten Bild. Belegt RB-20b §4.
# Lauf aus design/fixtures/eron/media/ oder passe PFAD an.
from PIL import Image
import numpy as np, time, io, sys, os

Image.MAX_IMAGE_PIXELS = None
PFAD = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    os.path.dirname(__file__), '..', '..', 'fixtures', 'eron', 'media', 'Andaria_03.02.2024.webp')

t0 = time.time()
im = Image.open(PFAD)
print('format', im.format, 'size', im.size, 'mode', im.mode)
im = im.convert('RGB')
print('decode+convert s', round(time.time() - t0, 2))

a = np.asarray(im)
print('naive RGB array MB', round(a.nbytes / 1048576, 1),
      '| RGBA backing store MB', round(a.shape[0] * a.shape[1] * 4 / 1048576, 1))

# Widerlegung der Raster->SVG-These: Farbzahl im Vollbild.
t1 = time.time()
flat = a.reshape(-1, 3).astype(np.uint32)
key = (flat[:, 0] << 16) | (flat[:, 1] << 8) | flat[:, 2]
u, c = np.unique(key, return_counts=True)
print('distinct colours FULL:', len(u), 'in', round(time.time() - t1, 1), 's')
order = np.argsort(-c)[:12]
print('top12:', [(hex(int(u[i])), int(c[i])) for i in order])

sm = np.asarray(im.resize((260, 166)))
f2 = sm.reshape(-1, 3).astype(np.uint32)
k2 = (f2[:, 0] << 16) | (f2[:, 1] << 8) | f2[:, 2]
print('distinct colours 260x166:', len(np.unique(k2)))

# Export: der Flaschenhals ist der Encoder, nicht der Compositor.
W = im.size[0]
print('\n-- Export-Kachelkodierung (CPU-Proxy fuer browser toBlob) --')
for tile in (2048, 4096):
    crop = im.crop((0, 0, tile, tile))
    n = (W // tile) ** 2
    for fmt, kw in (('PNG', {'compress_level': 6}), ('WEBP', {'quality': 90}), ('JPEG', {'quality': 92})):
        t = time.time(); b = io.BytesIO(); crop.save(b, fmt, **kw); dt = time.time() - t
        print(f'{tile}px {fmt}: {dt*1000:.0f} ms/tile, {b.tell()/1048576:.2f} MB/tile '
              f'-> {n} tiles = {dt*n:.1f} s, {b.tell()*n/1048576:.0f} MB total')
