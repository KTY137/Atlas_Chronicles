// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useRef, useState } from "react";
import type { TacticalAck, TacticalImportInput } from "@chronicle/protocol";
import type { TacticalMapDocumentV1 } from "@chronicle/szene";
import type { FidelityReport } from "@chronicle/forge";
import { Button, Notice } from "@chronicle/ui";
import { api, apiPath } from "../api";
import { useTask } from "../hooks";
import { useCommand } from "./game-api";

type Preview = { document: TacticalMapDocumentV1; fidelity: FidelityReport; image: unknown; sourceHash: string };
export function TacticalImport({ campaignId, onChanged, onDirty }: { campaignId: string; onChanged: () => void; onDirty: (value: boolean) => void }) {
  const [file, setFile] = useState<File | null>(null), [image, setImage] = useState<File | null>(null), [name, setName] = useState("");
  const [creator, setCreator] = useState(""), [license, setLicense] = useState(""), [url, setUrl] = useState(""), [licenseUrl, setLicenseUrl] = useState("");
  const [format, setFormat] = useState<"uvtt" | "native">("uvtt"), [preview, setPreview] = useState<Preview | null>(null), [prepared, setPrepared] = useState<Omit<TacticalImportInput, "commandId"> | null>(null), [saved, setSaved] = useState("");
  const task = useTask(), command = useCommand(), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; onDirty(false); }; }, [onDirty]);
  const invalidate = () => { setPreview(null); setPrepared(null); setSaved(""); onDirty(true); };
  return <form className="panel tactical-import" onChange={invalidate} onSubmit={e => { e.preventDefault(); if (!file) return; void task.run(async () => {
    if (file.size > 64 * 1024 * 1024 || (image && image.size > 16 * 1024 * 1024)) throw new Error("Die Quelldatei darf höchstens64MiB, das separate Kartenbild16MiB groß sein.");
    let imageBase64: string | null = null;
    if (image && format === "native") {
      const bytes = new Uint8Array(await image.arrayBuffer()); let binary = "";
      for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      imageBase64 = btoa(binary);
    }
    const input: Omit<TacticalImportInput, "commandId"> = { name, format, sourceText: await file.text(), imageBase64,
      provenance: { name: file.name, creator, license, sourceUrl: url.trim() || null, licenseUrl: licenseUrl.trim() || null, retrievedAt: null, generator: null, generatorVersion: null } };
    const result = await api<Preview>(apiPath(campaignId, "/tactical/maps/import-preview"), { method: "POST", body: { ...input, commandId: crypto.randomUUID() } });
    if (mounted.current) { setPrepared(input); setPreview(result); }
  }); }}>
    <fieldset className="tactical-command-fields" disabled={task.busy}><h2>Eine Szenenkarte übernehmen</h2><p className="field-help">UVTT aus Dungeondraft oder ein natives Kartendokument. Original und Herkunft bleiben erhalten. Wissensregionen und Wiki-Verknüpfungen legst du anschließend ausdrücklich an.</p>
      <label>Name der Karte<input required maxLength={160} value={name} onChange={e => setName(e.target.value)} /></label>
      <label>Kartenformat<select value={format} onChange={e => { setFormat(e.target.value as typeof format); setFile(null); setImage(null); }}><option value="uvtt">Universal VTT (.dd2vtt, .uvtt)</option><option value="native">Natives TacticalMapDocument v1 (.json)</option></select></label>
      <label>Quelldatei<input key={format} required type="file" accept={format === "uvtt" ? ".dd2vtt,.df2vtt,.uvtt,.json" : ".json"} onChange={e => setFile(e.target.files?.[0] ?? null)} /></label>
      {format === "native" ? <label>Zum Dokument gehörendes Bild (falls referenziert)<input type="file" accept="image/png,image/webp" onChange={e => setImage(e.target.files?.[0] ?? null)} /></label> : null}
      <div className="rule-fields"><label>Urheber<input required maxLength={2048} value={creator} onChange={e => setCreator(e.target.value)} /></label><label>Lizenz oder eigene Nutzungsrechte<input required maxLength={2048} value={license} onChange={e => setLicense(e.target.value)} /></label></div>
      <label>Quellseite (optional)<input type="url" value={url} onChange={e => setUrl(e.target.value)} /></label><label>Lizenznachweis (optional)<input type="url" value={licenseUrl} onChange={e => setLicenseUrl(e.target.value)} /></label>
      <Button type="submit" variant="primary" disabled={!file}>Import prüfen</Button>
      {preview ? <section className="tactical-import-report"><h3>Importvorschau</h3><p>{preview.document.geometry.size[0]} × {preview.document.geometry.size[1]} Pixel · {preview.document.walls.length} Wände/Blocker · {preview.document.portals.length} Portale · {preview.document.lights.length} Lichter</p>
        <ul>{preview.fidelity.issues.map((issue, i) => <li key={i}>{issue.message}</li>)}</ul><p>Die Karte bleibt bis zur Verknüpfung von Wissensregionen privat.</p>
        <Button variant="primary" disabled={!!saved} onClick={() => { if (prepared) void task.run(async () => { const result = await command<TacticalAck>(apiPath(campaignId, "/tactical/maps"), prepared); if (mounted.current) { setSaved(result.subjectId); onDirty(false); onChanged(); } }); }}>Karte in die Kampagne übernehmen</Button>
      </section> : null}
    </fieldset>{task.error ? <Notice error>{task.error}</Notice> : null}{saved ? <Notice>Die Karte ist gespeichert. Unter „Karte & Vorbereitung“ kannst du Regionen verknüpfen und Figuren für eine Szene platzieren.</Notice> : null}
  </form>;
}
