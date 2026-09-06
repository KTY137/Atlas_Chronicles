import { Fragment, type ReactNode } from "react";
import { Button } from "@chronicle/ui";
import type { Block, EntryDocument, Inline, Member } from "./api";
import { PassageProvenance } from "./features/PassageProvenance";

function Text({ parts, onEntry }: { parts: readonly Inline[]; onEntry: (id: string) => void }) {
  return <>{parts.map((part, i) => {
    let node: ReactNode = part.text;
    for (const [j, mark] of part.marks.entries()) {
      if (mark.art === "strong") node = <strong key={j}>{node}</strong>;
      else if (mark.art === "em") node = <em key={j}>{node}</em>;
      else if (mark.art === "code") node = <code key={j}>{node}</code>;
      else if (mark.art === "link") node = mark.zielEntryId ? <button key={j} className="article-link" onClick={() => onEntry(mark.zielEntryId!)}>{node}</button> : <span key={j} className="unresolved-link" title={mark.zielSlug}>{node}</span>;
    }
    return <Fragment key={i}>{node}</Fragment>;
  })}</>;
}

export function BlockReader({ block, onEntry = () => {} }: { block: Block; onEntry?: (id: string) => void }) {
  switch (block.kind) {
    case "absatz": return <p><Text parts={block.inhalt} onEntry={onEntry} /></p>;
    case "zitat": return <blockquote><Text parts={block.inhalt} onEntry={onEntry} /></blockquote>;
    case "bildunterschrift": return <figcaption><Text parts={block.inhalt} onEntry={onEntry} /></figcaption>;
    case "feld": return <dl className="article-field"><dt>{block.label}</dt><dd>{block.werte.map((value, i) => <div key={i}><Text parts={value} onEntry={onEntry} /></div>)}</dd></dl>;
    case "liste": { const List = block.geordnet ? "ol" : "ul"; return <List>{block.punkte.map((point, i) => <li key={i}><Text parts={point} onEntry={onEntry} /></li>)}</List>; }
    case "rohblock": return <div className="raw-block"><span>Aus der Quelle übernommen · nicht umgewandelt</span><pre>{block.quelltext}</pre></div>;
  }
}

export function ArticleReader({ document, onEntry, members = [], onReveal, busy = false, campaignId }: {
  document: EntryDocument; onEntry: (id: string) => void; members?: readonly Member[];
  onReveal?: (pid: string, actorId: string) => void; busy?: boolean;
  campaignId?: string;
}) {
  let previousPath = "";
  return <article className="article-body"><p className="eyebrow">Chronik · {document.slug}</p><h1>{document.titel}</h1>
    {document.passagen.length === 0 ? <p className="muted">Dieser Artikel hat noch keinen Inhalt.</p> : null}
    {document.passagen.map((passage) => {
      const path = passage.pfad.join(" › "), changed = path !== previousPath; previousPath = path;
      return <section className="passage" key={passage.pid} id={`passage-${passage.pid}`}>
        {changed && path ? <h2 className="heading-path">{path}</h2> : null}<BlockReader block={passage.inhalt} onEntry={onEntry} />
        {onReveal ? <form className="reveal-control" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const actor = data.get("actor"); if (typeof actor === "string" && actor) onReveal(passage.pid, actor); }}>
          <label className="sr-only" htmlFor={`reveal-${passage.pid}`}>Diese Passage für eine Figur freigeben</label>
          <select id={`reveal-${passage.pid}`} name="actor" required defaultValue="" disabled={busy || members.filter((m) => m.actorId).length === 0}><option value="" disabled>Für eine Figur freigeben …</option>{members.filter((m) => m.actorId).map((m) => <option value={m.actorId!} key={m.userId}>{m.displayName}</option>)}</select>
          <Button type="submit" disabled={busy || !members.some((m) => m.actorId)}>Freigeben</Button>
        </form> : null}
        {campaignId ? <PassageProvenance campaignId={campaignId} passageId={passage.pid} /> : null}
      </section>;
    })}
  </article>;
}
