// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Fragment, type ReactNode } from "react";
import { Button } from "@chronicle/ui";
import type { Block, EntryDocument, Inline, Member } from "./api";
import { PassageProvenance } from "./features/PassageProvenance";
import { ArticleFigure } from "./features/ArticleFigure";

function Text({ parts, onEntry, onDoor }: { parts: readonly Inline[]; onEntry: (id: string) => void; onDoor?: (id: string) => void }) {
  return <>{parts.map((part, i) => {
    let node: ReactNode = part.text;
    for (const [j, mark] of part.marks.entries()) {
      if (mark.art === "strong") node = <strong key={j}>{node}</strong>;
      else if (mark.art === "em") node = <em key={j}>{node}</em>;
      else if (mark.art === "code") node = <code key={j}>{node}</code>;
      else if (mark.art === "link") node = mark.tuer && onDoor ? <button key={j} className="article-link article-door" title={`Vollmacht bis ${new Date(mark.tuer.verfallAt).toLocaleString("de-DE")}`} onClick={() => onDoor(mark.tuer!.vollmachtId)}>{node}<span aria-hidden="true"> ↗</span></button> : mark.zielEntryId ? <button key={j} className="article-link" onClick={() => onEntry(mark.zielEntryId!)}>{node}</button> : <span key={j} className="unresolved-link" title={`„${mark.zielSlug}“ führt für dich noch zu keinem Artikel`}>{node}</span>;
    }
    return <Fragment key={i}>{node}</Fragment>;
  })}</>;
}

export function BlockReader({ block, onEntry = () => {}, onDoor, campaignId }: { block: Block; onEntry?: (id: string) => void; onDoor?: (id: string) => void; campaignId?: string }) {
  switch (block.kind) {
    case "absatz": return <p><Text parts={block.inhalt} onEntry={onEntry} onDoor={onDoor} /></p>;
    case "zitat": return <blockquote><Text parts={block.inhalt} onEntry={onEntry} onDoor={onDoor} /></blockquote>;
    // Ein Bild ist eine Passage aus Bild UND Unterschrift; ein `figcaption` allein war eine
    // Unterschrift ohne Bild, also eine Aussage ohne ihren Gegenstand.
    case "bildunterschrift": return <ArticleFigure block={block} {...(campaignId ? { campaignId } : {})}>
      {block.inhalt.length ? <Text parts={block.inhalt} onEntry={onEntry} onDoor={onDoor} /> : null}
    </ArticleFigure>;
    case "feld": return <dl className="article-field"><dt>{block.label}</dt><dd>{block.werte.map((value, i) => <div key={i}><Text parts={value} onEntry={onEntry} onDoor={onDoor} /></div>)}</dd></dl>;
    case "liste": { const List = block.geordnet ? "ol" : "ul"; return <List>{block.punkte.map((point, i) => <li key={i}><Text parts={point} onEntry={onEntry} onDoor={onDoor} /></li>)}</List>; }
    case "rohblock": return <div className="raw-block"><span>Aus der Quelle übernommen · nicht umgewandelt</span><pre>{block.quelltext}</pre></div>;
  }
}

export function ArticleReader({ document, onEntry, members = [], onReveal, busy = false, campaignId, unreadIds, onSendPassage, onDoor }: {
  document: EntryDocument; onEntry: (id: string) => void; members?: readonly Member[];
  onReveal?: (pid: string, actorId: string) => void; busy?: boolean;
  campaignId?: string; unreadIds?: ReadonlySet<string>; onSendPassage?: (pid: string) => void; onDoor?: (id: string) => void;
}) {
  let previousPath = "";
  const gm = Boolean(onReveal);
  return <article className="article-body"><p className="eyebrow">Chronik · {document.slug}</p><h1>{document.titel}</h1>
    <p className="field-help">{gm ? "Du liest als Spielleitung — du siehst hier mehr, als deine Spieler in ihrer Chronik zu sehen bekommen." : "Du liest mit dem Wissen deiner Figur — sichtbar ist nur, was sie bereits weiß."}</p>
    {document.passagen.length === 0 ? <p className="muted">{gm ? "Dieser Artikel hat noch keinen Inhalt." : "Deine Chronik weiß darüber noch nichts."}</p> : null}
    {document.passagen.map((passage) => {
      const path = passage.pfad.join(" › "), changed = path !== previousPath; previousPath = path;
      return <section className={`passage${unreadIds?.has(passage.pid) ? " passage-unread" : ""}`} key={passage.pid} id={`passage-${passage.pid}`}>
        {unreadIds?.has(passage.pid) ? <span className="unread-label">Neu für dich</span> : null}
        {changed && path ? <h2 className="heading-path">{path}</h2> : null}<BlockReader block={passage.inhalt} onEntry={onEntry} onDoor={onDoor} {...(campaignId ? { campaignId } : {})} />
        {onReveal ? <form className="reveal-control" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const actor = data.get("actor"); if (typeof actor === "string" && actor) onReveal(passage.pid, actor); }}>
          <label className="sr-only" htmlFor={`reveal-${passage.pid}`}>Diese Passage für eine Figur freigeben</label>
          <select id={`reveal-${passage.pid}`} name="actor" required defaultValue="" disabled={busy || members.filter((m) => m.actorId).length === 0}><option value="" disabled>Für eine Figur freigeben …</option>{members.filter((m) => m.actorId).map((m) => <option value={m.actorId!} key={m.userId}>{m.displayName}</option>)}</select>
          <Button type="submit" disabled={busy || !members.some((m) => m.actorId)}>Freigeben</Button>
        </form> : null}
        {onSendPassage ? <Button variant="quiet" className="passage-letter" onClick={() => onSendPassage(passage.pid)}>In einem Brief weitergeben</Button> : null}
        {campaignId ? <PassageProvenance campaignId={campaignId} passageId={passage.pid} /> : null}
      </section>;
    })}
  </article>;
}
