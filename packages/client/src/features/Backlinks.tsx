import { Button, Notice } from "@chronicle/ui";
import { apiPath } from "../api";
import { useResource } from "../hooks";

interface Backlink { entryId: string; title: string; slug: string; passageId: string; excerpt: string }

export function Backlinks({ campaignId, entryId, revision, onEntry }: {
  campaignId: string; entryId: string; revision: number; onEntry: (id: string) => void;
}) {
  const links = useResource<Backlink[]>(apiPath(campaignId, `/entries/${encodeURIComponent(entryId)}/backlinks`), revision);
  return <section className="article-body" aria-label="Verweise auf diesen Artikel">
    <h2>Hier führen die Spuren zusammen</h2>
    {links.loading ? <p role="status" className="muted">Verweise werden geladen …</p> : links.error ? <Notice error>{links.error}</Notice> : links.data?.length ? <ul>
      {links.data.map(link => <li key={link.passageId}><Button variant="quiet" onClick={() => onEntry(link.entryId)}>{link.title}</Button><p>{link.excerpt}</p></li>)}
    </ul> : <p className="muted">In deinem Wissen verweist noch kein Artikel hierher.</p>}
  </section>;
}
