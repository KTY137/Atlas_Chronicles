// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { letteringPath, letteringWidth } from '../assets/loot-lettering.mjs';
import { zeichneKarte } from '../assets/erzeuge-lootkarten.mjs';
import { CHRONICLE_LOOT_DECK } from '../../packages/rules/src/templates/chronicle-heroes-loot.ts';

test('all 40 cards contain actual glyph paths and no system-font text nodes', () => {
  assert.equal(CHRONICLE_LOOT_DECK.length, 40);
  const signatures = new Set();
  for (const card of CHRONICLE_LOOT_DECK) {
    const image = zeichneKarte(card);
    assert.doesNotMatch(image, /<text\b|font-family|\.woff/i);
    assert.match(image, /<path d="[ML]/);
    signatures.add(createHash('sha256').update(image).digest('hex'));
  }
  assert.equal(signatures.size, 40);
});

test('lettering measures real advances, escapes through outlines and rejects missing glyphs', () => {
  assert.ok(letteringWidth('WWW',20)>letteringWidth('iii',20));
  assert.match(letteringPath(100,50,'ÄÖÜ ß <b>',{fett:700}),/^<path/);
  assert.doesNotMatch(letteringPath(100,50,'<b>'),/<b>/);
  assert.throws(()=>letteringPath(0,0,'\u{1f600}'),/lacks glyph/);
});

test('SVG generation is identical with system font discovery deliberately disabled', () => {
  const source = "import {zeichneKarte} from './tools/assets/erzeuge-lootkarten.mjs';import {CHRONICLE_LOOT_DECK as deck} from './packages/rules/src/templates/chronicle-heroes-loot.ts';import {createHash} from 'node:crypto';console.log(createHash('sha256').update(deck.map(zeichneKarte).join('')).digest('hex'));";
  const run=extra=>spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',source],{encoding:'utf8',env:{...process.env,...extra},timeout:30000});
  const normal=run({}),isolated=run({FONTCONFIG_FILE:'/nonexistent/atlas-no-system-fonts.conf',FONTCONFIG_PATH:'/nonexistent/atlas-no-system-fonts'});
  assert.equal(normal.status,0,normal.stderr);assert.equal(isolated.status,0,isolated.stderr);
  assert.equal(normal.stdout,isolated.stdout);
});
