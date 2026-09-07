// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Gone } from "./errors.ts";

// Deliberately documented UTS-39 subset: common Latin/Cyrillic/Greek lookalikes.
// This is not a claim to implement the complete Unicode confusables data file.
const LOOKALIKES: Readonly<Record<string, string>> = {
  а: "a", α: "a", в: "b", β: "b", с: "c", ϲ: "c", е: "e", ε: "e",
  н: "h", η: "h", і: "i", ι: "i", ј: "j", к: "k", κ: "k", м: "m", μ: "m",
  о: "o", ο: "o", р: "p", ρ: "p", т: "t", τ: "t", х: "x", χ: "x", у: "y", υ: "y",
  ѕ: "s", ӏ: "l", ı: "i", "0": "o", "1": "l",
};
const segmenter = new Intl.Segmenter("und", { granularity: "grapheme" });
export function normalizeName(value: string): { displayName: string; skeleton: string } {
  // Reject before trimming/normalization too: invisible controls must never disappear silently.
  if (/[\p{Cc}\p{Cf}\p{Cs}]/u.test(value)) throw new Gone("invalid-name");
  const displayName = value.normalize("NFKC").trim().replace(/ +/g, " ");
  const count = [...segmenter.segment(displayName)].length;
  if (count < 1 || count > 40) throw new Gone("invalid-name");
  const skeleton = [...displayName.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")]
    .map((c) => LOOKALIKES[c] ?? c).join("");
  return { displayName, skeleton };
}
