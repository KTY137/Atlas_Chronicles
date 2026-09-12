// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useState } from "react";
import { GitBranch, Plus, Save, Play, Trash2, Flag, ArrowRight } from "lucide-react";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { validAdventureTree, type AdventureCard, type AdventureScene, type AdventureTree as AdventureDocument } from "@chronicle/protocol";
import { apiPath } from "../api";
import { useResource, useTask } from "../hooks";
import { locale, t } from "../i18n";
import { useCommand, type SceneCard } from "./game-api";
import { adventureColumns, removeAdventureNode } from "./tabletop-model";
import "./tabletop.css";

export function AdventureTree({ campaignId, scenes, revision, onChanged, onDirty }: { campaignId: string; scenes: SceneCard[]; revision: number; onChanged: () => void; onDirty: (dirty: boolean) => void }) {
  const resource = useResource<AdventureCard>(apiPath(campaignId, "/tabletop/adventure"), revision, 5000);
  if (resource.loading) return <Loading text={t("Abenteuerbaum wird geladen …")} />;
  return <>{resource.error ? <Notice error>{resource.error}</Notice> : null}{resource.data ? <AdventureEditor campaignId={campaignId} remote={resource.data} scenes={scenes} onChanged={onChanged} onDirty={onDirty} /> : null}</>;
}

function AdventureEditor({ campaignId, remote, scenes, onChanged, onDirty }: { campaignId: string; remote: AdventureCard; scenes: SceneCard[]; onChanged: () => void; onDirty: (dirty: boolean) => void }) {
  const [baseline, setBaseline] = useState(remote), [document, setDocument] = useState(remote.document), [selected, setSelected] = useState(remote.currentNodeId ?? remote.document.rootId ?? "");
  const task = useTask(), command = useCommand();
  const dirty = JSON.stringify(document) !== JSON.stringify(baseline.document), valid = validAdventureTree(document);
  const changedRemotely = remote.version > baseline.version, chosen = document.nodes.find(node => node.id === selected);
  const current = document.nodes.find(node => node.id === baseline.currentNodeId);
  const replace = (next: AdventureCard) => { setBaseline(next); setDocument(next.document); };
  useEffect(() => { if (!dirty && remote.version > baseline.version) { setBaseline(remote); setDocument(remote.document); } }, [remote, dirty, baseline.version]);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  useEffect(() => { if (!document.nodes.some(node => node.id === selected)) setSelected(document.rootId ?? ""); }, [document, selected]);
  const updateNode = (id: string, changes: Partial<AdventureScene>) => setDocument(before => ({ ...before, nodes: before.nodes.map(node => node.id === id ? { ...node, ...changes } : node) }));
  const addScene = (from?: AdventureScene) => {
    if (document.nodes.length >= 128 || (from && from.choices.length >= 32)) return;
    const id = crypto.randomUUID(), node: AdventureScene = { id, title: t("Neue Szene"), notes: "", sceneId: null, choices: [] };
    setDocument(before => ({ ...before, rootId: before.rootId ?? id, nodes: [...before.nodes.map(existing => existing.id === from?.id ? { ...existing, choices: [...existing.choices, { id: crypto.randomUUID(), label: t("Neue Entscheidung"), targetId: id }] } : existing), node] }));
    setSelected(id);
  };
  const advance = (node: AdventureScene) => {
    if (dirty || changedRemotely || task.busy) return;
    const linked = scenes.find(scene => scene.id === node.sceneId);
    if (node.sceneId && !linked) { task.setError(t("Die verknüpfte Spielszene ist nicht mehr verfügbar.")); return; }
    void task.run(async () => {
      const next = await command<AdventureCard>(apiPath(campaignId, "/tabletop/adventure/advance"), { expectedVersion: baseline.version, nodeId: node.id, ...(linked ? { expectedSceneVersion: linked.version } : {}) });
      replace(next); setSelected(node.id); onChanged();
    });
  };
  const save = () => task.run(async () => {
    const next = await command<AdventureCard>(apiPath(campaignId, "/tabletop/adventure"), { expectedVersion: baseline.version, document }, "PUT");
    replace(next); onChanged();
  });
  return <div className="adventure-workspace">
    <div className="adventure-intro"><div><p className="eyebrow">{t("Nur für die Spielleitung")}</p><h2><GitBranch size={22} /> {t("Abenteuerbaum")}</h2><p className="muted">{t("Plane Szenen und Entscheidungen. Folge am Spielabend dem Weg deiner Gruppe.")}</p></div>
      <div className="button-row"><Button disabled={task.busy || document.nodes.length >= 128} onClick={() => addScene()}><Plus size={16} /> {t("Szene hinzufügen")}</Button><Button variant="primary" disabled={task.busy || !dirty || !valid || changedRemotely} onClick={() => void save()}><Save size={16} /> {task.busy ? t("Wird gespeichert …") : t("Baum speichern")}</Button></div></div>
    {task.error ? <Notice error>{task.error}</Notice> : null}
    {changedRemotely || task.status === 409 ? <Notice>{t("Der Abenteuerbaum wurde inzwischen geändert. Dein Entwurf bleibt erhalten.")} <Button onClick={() => { if (!dirty || window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) { replace(remote); task.setError(""); onChanged(); } }}>{t("Aktuellen Baum laden")}</Button></Notice> : null}
    {dirty ? <p className="adventure-save-state" role="status">{t("Ungespeicherter Entwurf · Speichere vor dem Szenenwechsel.")}</p> : <p className="adventure-save-state" role="status">{baseline.updatedAt ? t("Gespeichert am {zeit}", { zeit: new Date(baseline.updatedAt).toLocaleString(locale()) }) : t("Dein erster Abenteuerbaum wartet.")}</p>}
    {!valid ? <Notice error>{t("Gib allen Szenen und Entscheidungen einen Namen und ein Ziel. Verbindungen dürfen keinen Kreis bilden.")}</Notice> : null}
    <label className="adventure-name">{t("Name des Abenteuers")}<input disabled={task.busy} value={document.name} maxLength={160} required onChange={event => setDocument(before => ({ ...before, name: event.target.value }))} /></label>
    {current ? <section className="adventure-current"><div><p className="eyebrow">{t("Aktuelle Szene im Abenteuer")}</p><h3>{current.title}</h3>{current.notes ? <p className="adventure-notes">{current.notes}</p> : null}</div>
      <div className="adventure-current-choices">{current.choices.map(choice => { const target = document.nodes.find(node => node.id === choice.targetId); return <Button key={choice.id} disabled={dirty || changedRemotely || task.busy || !target} onClick={() => target && advance(target)}>{choice.label} <ArrowRight size={15} /> {target?.title}</Button>; })}{!current.choices.length ? <p className="muted">{t("An dieser Szene endet dieser Weg.")}</p> : null}</div>
    </section> : document.nodes.length ? <Notice>{t("Wähle eine gespeicherte Szene und beginne dort dein Abenteuer.")}</Notice> : null}
    {!document.nodes.length ? <EmptyState title={t("Jedes Abenteuer beginnt mit einer Szene.")} action={<Button variant="primary" onClick={() => addScene()}><Plus size={16} /> {t("Erste Szene anlegen")}</Button>}>{t("Halte Orte, Begegnungen und mögliche Entscheidungen fest. Alles bleibt für die Spielleitung gespeichert.")}</EmptyState> : <div className="adventure-layout">
      <section className="adventure-graph" aria-label={t("Szenen und Verzweigungen")}><div className="adventure-columns">{adventureColumns(document).map((column, columnIndex) => <div className="adventure-column" key={columnIndex}>{column.map(node => <button key={node.id} type="button" className={`adventure-node${node.id === selected ? " selected" : ""}${node.id === baseline.currentNodeId ? " is-current" : ""}`} aria-pressed={node.id === selected} onClick={() => setSelected(node.id)}>
        <span className="adventure-node-status">{node.id === document.rootId ? <span><Flag size={12} /> {t("Start")}</span> : null}{node.id === baseline.currentNodeId ? <span><Play size={12} /> {t("Aktuell")}</span> : null}</span><strong>{node.title || t("Szene ohne Namen")}</strong>
        {node.sceneId ? <small>{scenes.find(scene => scene.id === node.sceneId)?.name ?? t("Verknüpfte Spielszene")}</small> : null}
        {node.choices.length ? <span className="adventure-node-branches">{node.choices.map(choice => <span key={choice.id}>{choice.label || t("Entscheidung ohne Namen")} <ArrowRight size={12} /> {document.nodes.find(target => target.id === choice.targetId)?.title}</span>)}</span> : <small>{t("Ende dieses Wegs")}</small>}
      </button>)}</div>)}</div></section>
      {chosen ? <section className="adventure-editor panel"><h3>{t("Szene bearbeiten")}</h3><fieldset disabled={task.busy}>
        <label>{t("Szenentitel")}<input value={chosen.title} required maxLength={160} onChange={event => updateNode(chosen.id, { title: event.target.value })} /></label>
        <label>{t("Notizen der Spielleitung")}<textarea value={chosen.notes} rows={6} maxLength={8000} onChange={event => updateNode(chosen.id, { notes: event.target.value })} placeholder={t("Was geschieht hier? Welche Hinweise und Begegnungen warten?")} /></label>
        <label>{t("Mit Spielszene verbinden")}<select value={chosen.sceneId ?? ""} onChange={event => updateNode(chosen.id, { sceneId: event.target.value || null })}><option value="">{t("Ohne verknüpfte Spielszene")}</option>{scenes.map(scene => <option key={scene.id} value={scene.id}>{scene.name}</option>)}</select></label>
        <p className="field-help">{t("Beim Beginnen wird eine verknüpfte Spielszene samt vorbereiteter Karte eröffnet. Die Baum-Notizen bleiben privat.")}</p>
        <div className="button-row"><Button disabled={dirty || changedRemotely || baseline.currentNodeId === chosen.id} onClick={() => advance(chosen)}><Play size={15} /> {t("Diese Szene beginnen")}</Button><Button disabled={document.rootId === chosen.id} onClick={() => setDocument(before => ({ ...before, rootId: chosen.id }))}><Flag size={15} /> {t("Als Start festlegen")}</Button></div>
        <h4>{t("Entscheidungen und nächste Szenen")}</h4><div className="adventure-choice-list">{chosen.choices.map(choice => <div className="adventure-choice" key={choice.id}>
          <label>{t("Entscheidung")}<input value={choice.label} required maxLength={160} onChange={event => updateNode(chosen.id, { choices: chosen.choices.map(old => old.id === choice.id ? { ...old, label: event.target.value } : old) })} /></label>
          <label>{t("Führt zu")}<select value={choice.targetId} onChange={event => updateNode(chosen.id, { choices: chosen.choices.map(old => old.id === choice.id ? { ...old, targetId: event.target.value } : old) })}>{document.nodes.filter(node => node.id !== chosen.id).map(node => <option key={node.id} value={node.id}>{node.title || t("Szene ohne Namen")}</option>)}</select></label>
          <Button aria-label={t("Entscheidung {name} entfernen", { name: choice.label })} onClick={() => updateNode(chosen.id, { choices: chosen.choices.filter(old => old.id !== choice.id) })}><Trash2 size={15} /></Button>
        </div>)}</div>
        <div className="button-row"><Button disabled={chosen.choices.length >= 32 || document.nodes.length >= 128} onClick={() => addScene(chosen)}><Plus size={15} /> {t("Abzweigung mit neuer Szene")}</Button><Button disabled={chosen.choices.length >= 32 || document.nodes.length < 2} onClick={() => updateNode(chosen.id, { choices: [...chosen.choices, { id: crypto.randomUUID(), label: t("Neue Entscheidung"), targetId: document.nodes.find(node => node.id !== chosen.id)!.id }] })}><GitBranch size={15} /> {t("Vorhandene Szene verbinden")}</Button></div>
        <Button className="adventure-remove" onClick={() => { if (window.confirm(t("Szene „{name}“ mit allen Verbindungen entfernen? Die verknüpfte Spielszene bleibt erhalten.", { name: chosen.title }))) setDocument(before => removeAdventureNode(before, chosen.id)); }}><Trash2 size={15} /> {t("Szene aus Baum entfernen")}</Button>
      </fieldset></section> : null}
    </div>}
  </div>;
}
