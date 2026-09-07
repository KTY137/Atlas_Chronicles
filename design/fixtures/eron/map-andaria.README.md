# Andaria interactive map fixture

`map-andaria.json` preserves the complete page content of
[Karte:Andaria](https://eron.fandom.com/de/wiki/Karte:Andaria), retrieved from the
public MediaWiki API on 2026-09-07. Only a final newline was added.

- Page ID: `280`; revision ID: `1149`; edited: `2025-12-07T12:25:25Z`.
- Request: `https://eron.fandom.com/de/api.php?action=query&prop=revisions&rvprop=ids%7Ctimestamp%7Ccontent&rvslots=main&format=json&titles=Karte%3AAndaria`.
- 190 markers with stable source IDs; 16 categories with their original colors,
  letter symbols and symbol colors.
- Bounds: `[[0,0],[8192,8192]]`; coordinate order: `xy`; origin: `bottom-left`.
  Top-left display coordinates are `[x, 8192-y]`.
- Matching local image: `media/Andaria_03.02.2024.webp`, 8192 × 8192.
- Text: Eron Wiki contributors, CC BY-SA 3.0. Original article references remain
  in each popup. The JSON is unmodified source, not generated content.
- Image permission/provenance: [media/LIESMICH.md](media/LIESMICH.md) and
  [media/manifest.json](media/manifest.json).

This closes the fixture gap in RB-12 §1.5. Category membership does not establish
spatial containment. Chronicle's child-generation seeds are derived separately
from stable source marker identity; the source does not supply generator seeds.
