// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { expect, type Locator } from '@playwright/test';

/** Fixed uint32 PRNG: a reported seed and command prefix replay identically on every runner. */
export function randomSource(seed: number) {
  let state = seed >>> 0 || 1;
  return (limit: number): number => {
    if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Positive choice count required');
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) % limit;
  };
}

/** Unlike selectOption, this catches overlays and keyboard interception. No force clicks. */
export async function chooseNative(select: Locator, value: string) {
  const options = await select.locator('option').evaluateAll(nodes => nodes
    .filter(n => !(n as HTMLOptionElement).disabled && !(n.parentElement instanceof HTMLOptGroupElement && n.parentElement.disabled))
    .map(n => (n as HTMLOptionElement).value));
  const target = options.indexOf(value);
  expect(target, `Enabled option ${JSON.stringify(value)}`).toBeGreaterThanOrEqual(0);
  await select.click();
  const fromEnd = target > options.length / 2;
  await select.press(fromEnd ? 'End' : 'Home');
  for (let i = 0; i < (fromEnd ? options.length - 1 - target : target); ++i) await select.press(fromEnd ? 'ArrowUp' : 'ArrowDown');
  await select.press('Enter');
  await expect(select).toHaveValue(value);
}
