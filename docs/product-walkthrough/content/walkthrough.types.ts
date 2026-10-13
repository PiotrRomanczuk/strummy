/**
 * Content model for the product walkthrough document.
 *
 * One `Chapter` per file under `content/`; `index.ts` orders them. The build
 * (`scripts/docs/walkthrough/build.ts`) turns this into one self-contained
 * HTML file and an A4 PDF. Prose fields accept a little inline HTML
 * (`<b>`, `<i>`, `<br>`) — nothing else.
 */

export interface Screen {
  /** Card heading, e.g. "Dom · rano". */
  title: string;
  /** Shot id from tests/e2e/manual/product-walkthrough.shots.ts (file in shots/). */
  shot: string;
  /** CO WIDAĆ — what is literally on the screen. */
  see: string;
  /** PO CO — why the screen exists / the design decision. */
  why: string;
  /** DLA SPRZEDAŻY — the one argument to say on a demo. */
  pitch?: string;
  /** UWAGA — an honest gap visible on this shot. */
  note?: string;
}

export type Block =
  | { kind: 'screens'; items: Screen[] }
  | { kind: 'wide'; items: Screen[] }
  | { kind: 'text'; html: string }
  | { kind: 'callout'; html: string }
  | { kind: 'list'; title?: string; items: string[] }
  | { kind: 'table'; head: string[]; rows: string[][]; widths?: string[] };

export interface Chapter {
  title: string;
  lead: string;
  blocks: Block[];
}

export interface Doc {
  kicker: string;
  product: string;
  productSuffix: string;
  title: string;
  intro: string;
  status: { label: string; html: string };
  demoNote: string;
  chapters: Chapter[];
  footer: string;
}
