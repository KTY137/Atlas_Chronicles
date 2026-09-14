// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(new URL(`../src/features/${file}`, import.meta.url), "utf8");

describe("Figurantrag und Figurenwerkbank — hostautoritative Regelbindung", () => {
  it("verwendet im produktiven Workbench nur die Host-Komponenten für Vorlagen und Instanziierung", () => {
    const workbench = source("ActorWorkbench.tsx");
    expect(workbench).toContain('ActorTemplates as HostActorTemplates');
    expect(workbench).toContain('InstantiateActor as HostInstantiateActor');
    expect(workbench).toContain('<HostActorTemplates');
    expect(workbench).toContain('<HostInstantiateActor');
    expect(workbench).not.toContain('const compatible = !rules');
    expect(workbench).not.toContain('Zum Erschaffen einer Figur müssen Vorlage und aktive Kampagnenregeln übereinstimmen');
  });

  it("beschriftet GM-Anträge mit dem Paket der beantragten Vorlagenrevision", () => {
    const workbench = source("ActorWorkbench.tsx");
    expect(workbench).toContain('const pin = antrag.package ?? rules.pin');
    expect(workbench).toContain('feldname(antrag, key)');
    expect(workbench).toContain('antrag.package.id');
    expect(workbench).toContain('antrag.package.version');
  });

  it("Vorlageneditor und Instanziierung beziehen Manifest und Werte vom Host statt vom Kampagnenstandard", () => {
    const templates = source("ActorTemplatesHost.tsx");
    const instantiate = source("InstantiateActorHost.tsx");
    expect(templates).toContain('useHostRules');
    expect(templates).toContain('<HostRuleFields');
    expect(templates).toContain('switchRuleDraft');
    expect(instantiate).toContain('useHostRules');
    expect(instantiate).toContain('template?.definition.package');
    expect(instantiate).toContain('runtime.canSave');
    expect(instantiate).toContain('Die Vorlage behält ihr eigenes Regelpaket');
  });

  it("der Spielerantrag folgt dem Paket der gewählten Vorlage", () => {
    const request = source("FigurAntrag.tsx");
    expect(request).toContain('vorlage?.package ?? rules.pin');
    expect(request).toContain('<HostRuleFields');
    expect(request).not.toContain('definition.package.id === rules.pin.id');
  });
});
