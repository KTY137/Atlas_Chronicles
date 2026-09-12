// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { parseRulePackage } from "@chronicle/rules";
import { TABLE_DICE_ACTION_ID, TABLE_DICE_PACKAGE_ID, validTableDice, type TableDiceInput } from "@chronicle/protocol";
import { Gone } from "./errors.ts";

/** Immutable receipts use the existing rules engine, including its deterministic replay.
 * One package version per count/face combination; range offsets are ordinary inputs.
 * These internal receipt packages are never a campaign's rules or an actor's sheet schema. */
export function tableDicePackage(spec: TableDiceInput) {
  if (!validTableDice(spec)) throw new Gone("table-dice-input");
  const sides = spec.maximum - spec.minimum + 1;
  return parseRulePackage({
    schemaVersion: 1, id: TABLE_DICE_PACKAGE_ID, name: "Freie Tischwürfel",
    version: `1.${spec.count}.${sides}`, engineVersion: "1.0.0", license: "BUSL-1.1", authors: ["Atlas Chronicles"],
    fields: {}, layout: { sections: [] }, migrations: [],
    actions: [{ id: TABLE_DICE_ACTION_ID, name: "Freier Wurf", version: "1.0.0",
      inputs: { minimum: { type: "integer", label: "Kleinster Würfelwert", minimum: -1_000_000, maximum: 1_000_000, default: 1 } },
      expression: `${spec.count}d${sides} + ${spec.count} * (input.minimum - 1)`,
      disclosure: "Jeder Würfel liefert einen ganzzahligen Wert im gewählten Bereich. Die Summe hat keine automatische Regelwirkung.", requiresConfirmation: true,
    }],
  });
}
