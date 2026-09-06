/**
 * Live-Import aus jeder MediaWiki-Instanz — Fandom, Wikipedia, eigene Server.
 *
 * Läuft vollständig im Browser: MediaWiki-APIs erlauben anonyme Anfragen mit
 * `origin=*` und antworten mit `Access-Control-Allow-Origin: *`, also braucht
 * es keinen Proxy. Verifiziert gegen eron.fandom.com (siehe 07 §11.3).
 *
 * Was dieser Importer bewusst NICHT tut, steht in §11.3 und wird auf der
 * Oberfläche genannt, nicht versteckt: keine Bilder (fremde Rechte), keine
 * Vorlagenausführung (wir holen Parameter, nicht Logik), kein Rückschreiben.
 */

export interface WikiProbe {
  endpoint: string;
  siteName: string;
  language: string;
  base: string;
  articles: number;
  images: number;
  license: { text: string; url: string } | null;
}

export interface ImportedPage {
  title: string;
  wikitext: string;
  revision: number | null;
  timestamp: string;
}

export interface ImportProgress {
  fetched: number;
  total: number;
  batch: number;
}

/** Fehler mit einer Ursache, die man dem Nutzer zeigen kann. */
export class ImportError extends Error {
  constructor(message: string, readonly hint?: string) {
    super(message);
    this.name = "ImportError";
  }
}

/**
 * Aus einer beliebigen Wiki-URL die api.php ableiten.
 * Nutzer fügen die Adresse ein, die sie im Browser sehen — nicht den Endpunkt.
 */
export function endpointCandidates(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return [];
  }

  if (url.pathname.endsWith("/api.php")) return [url.origin + url.pathname];

  /* Pfad bis vor /wiki/… behalten: Fandom nutzt Sprachpräfixe wie /de/wiki/X. */
  const path = url.pathname.replace(/\/(wiki|index\.php)\/.*$/i, "").replace(/\/+$/, "");

  const candidates = [
    `${url.origin}${path}/api.php`,
    `${url.origin}${path}/w/api.php`,
    `${url.origin}/w/api.php`,
    `${url.origin}/api.php`,
  ];
  return [...new Set(candidates)];
}

async function apiGet(
  endpoint: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const query = new URLSearchParams({
    format: "json",
    formatversion: "2",
    origin: "*",
    ...params,
  });
  const response = await fetch(`${endpoint}?${query}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new ImportError(
      `Der Server antwortete mit ${response.status}.`,
      "Prüf die Adresse, oder ob das Wiki öffentlich lesbar ist.",
    );
  }
  return (await response.json()) as Record<string, unknown>;
}

/** Findet den Endpunkt und liest, was dort steht — bevor irgendetwas importiert wird. */
export async function probeWiki(
  input: string,
  signal?: AbortSignal,
): Promise<WikiProbe> {
  const candidates = endpointCandidates(input);
  if (!candidates.length) {
    throw new ImportError(
      "Das sieht nicht nach einer Wiki-Adresse aus.",
      "Beispiel: https://eron.fandom.com/de",
    );
  }

  let lastError: unknown = null;
  for (const endpoint of candidates) {
    try {
      const data = (await apiGet(
        endpoint,
        {
          action: "query",
          meta: "siteinfo",
          siprop: "general|statistics|rightsinfo",
        },
        signal,
      )) as {
        query?: {
          general?: { sitename?: string; lang?: string; base?: string };
          statistics?: { articles?: number; images?: number };
          rightsinfo?: { text?: string; url?: string };
        };
      };

      const general = data.query?.general;
      if (!general?.sitename) throw new ImportError("Keine Wiki-Antwort.");

      return {
        endpoint,
        siteName: general.sitename,
        language: general.lang ?? "",
        base: general.base ?? "",
        articles: data.query?.statistics?.articles ?? 0,
        images: data.query?.statistics?.images ?? 0,
        license: data.query?.rightsinfo?.text
          ? {
              text: data.query.rightsinfo.text,
              url: data.query.rightsinfo.url ?? "",
            }
          : null,
      };
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
    }
  }

  throw new ImportError(
    "Unter dieser Adresse antwortet keine MediaWiki-API.",
    lastError instanceof Error && lastError.name === "TypeError"
      ? "Möglich: Das Wiki erlaubt keine Anfragen aus dem Browser (CORS)."
      : "Geprüft wurden: " + candidates.join(", "),
  );
}

/** Holt alle Artikel des Hauptnamensraums, seitenweise. */
export async function importWiki(
  probe: WikiProbe,
  onProgress: (progress: ImportProgress) => void,
  signal?: AbortSignal,
): Promise<ImportedPage[]> {
  const pages: ImportedPage[] = [];
  let cont: Record<string, string> | null = null;
  let batch = 0;

  do {
    const data = (await apiGet(
      probe.endpoint,
      {
        action: "query",
        generator: "allpages",
        gaplimit: "50",
        gapnamespace: "0",
        gapfilterredir: "nonredirects",
        prop: "revisions",
        rvprop: "content|timestamp|ids",
        rvslots: "main",
        ...(cont ?? {}),
      },
      signal,
    )) as {
      continue?: Record<string, string>;
      query?: {
        pages?: {
          title: string;
          revisions?: {
            revid?: number;
            timestamp?: string;
            slots?: { main?: { content?: string } };
          }[];
        }[];
      };
    };

    batch += 1;
    for (const page of data.query?.pages ?? []) {
      const revision = page.revisions?.[0];
      const content = revision?.slots?.main?.content;
      if (typeof content !== "string") continue;
      pages.push({
        title: page.title,
        wikitext: content,
        revision: revision?.revid ?? null,
        timestamp: (revision?.timestamp ?? "").slice(0, 10),
      });
    }

    onProgress({ fetched: pages.length, total: probe.articles, batch });
    cont = data.continue ?? null;
  } while (cont && !signal?.aborted);

  if (signal?.aborted) {
    throw new ImportError("Import abgebrochen.", `${pages.length} Artikel waren geladen.`);
  }
  if (!pages.length) {
    throw new ImportError(
      "Das Wiki antwortet, liefert aber keine Artikel.",
      "Möglicherweise ist der Hauptnamensraum leer oder geschützt.",
    );
  }
  return pages;
}

/** Grober Speicherbedarf — localStorage endet je nach Browser bei etwa 5 MB. */
export const estimateBytes = (pages: ImportedPage[]): number =>
  pages.reduce((sum, page) => sum + page.wikitext.length + page.title.length + 80, 0);
