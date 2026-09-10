// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * **Fremde Regelwerke als Beispiel — bewusst nicht im Sammelexport.**
 *
 * `How to be a Hero` ist CC BY-NC-SA 4.0 lizenziert. Es bleibt im Repository, weil es zeigt,
 * wie eine fremde Vorlage sauber adaptiert und belegt wird — aber es darf in keinem
 * ausgelieferten Build landen. Der Sammelexport `@chronicle/rules` führt es deshalb nicht:
 * das Modul ruft auf oberster Ebene `createHowToBeAHeroPackage()` auf, ist also nicht
 * wegoptimierbar, und jeder Import aus dem Produktcode hätte es in das Bundle gezogen.
 *
 * Wer es braucht — Tests, Vergleiche, Werkzeuge — importiert `@chronicle/rules/examples`.
 * Produktcode tut das nie; `packages/rules/test/examples-boundary.test.ts` hält das fest.
 */
export * from "./templates/how-to-be-a-hero.ts";
