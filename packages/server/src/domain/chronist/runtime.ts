// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { ChronistCallPermit, ChronistModelUnit, ChronistProviderPort } from "@chronicle/chronist";
import type { ChronistLocalScanReport, ChronistProviderDescription } from "@chronicle/protocol";
export interface ChronistProviderBinding {
  readonly description: ChronistProviderDescription;
  readonly fingerprint: string;
  readonly profileId: string;
  readonly prepare: ChronistProviderPort["prepare"];
  /** Bind the server's one-use dispatch CAS. The transport must consume immediately before I/O. */
  readonly bind: (consumePermit:(permit:ChronistCallPermit,unit:ChronistModelUnit)=>Promise<boolean>,
    checkDispatch?:(permit:ChronistCallPermit,unit:ChronistModelUnit)=>Promise<boolean>)=>ChronistProviderPort["invoke"];
}
export interface ChronistRuntimeConfig {
  readonly providers: readonly ChronistProviderDescription[];
  readonly resolveProvider: (id:string,model:string)=>ChronistProviderBinding|undefined;
  readonly globalConcurrency?: number;
  readonly close?:()=>Promise<void>;
  /**
   * Sucht erneut nach einem lokal laufenden Modelldienst und uebernimmt das Ergebnis.
   *
   * Optional, weil ein Prueftisch eine feste Laufzeit stellt und dort nichts zu suchen ist.
   * Fehlt sie, meldet die Oberflaeche das als „auf diesem Server nicht moeglich" — statt einen
   * Knopf anzubieten, der nichts tut. Nur der Suchlauf ist neu: Fremdanbieter, Schluessel und
   * aktivierte Befehlszeilen-Bruecken bleiben unangetastet.
   */
  readonly rescanLocal?:()=>Promise<ChronistLocalScanReport>;
}
export interface ChronistServiceConfig {readonly now?:()=>number;readonly chronist?:ChronistRuntimeConfig}
