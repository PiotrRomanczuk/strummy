import type {
  Block,
  Chapter,
  Doc,
  Screen,
} from '../../../docs/product-walkthrough/content/walkthrough.types';
import { CSS } from './template.css';

/** Resolves a shot id to an `<img src>` value (data URI or relative path). */
export type ImageResolver = (shot: string) => string;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function labelled(label: string, html: string): string {
  return `<div class="label">${label}</div><p>${html}</p>`;
}

function screenCard(s: Screen, img: ImageResolver): string {
  const title = s.title.replace(/ · /g, ' <span class="dot">·</span> ');
  const pitch = s.pitch
    ? `<div class="pitch"><div class="label">Dla sprzedaży</div><p>${s.pitch}</p></div>`
    : '';
  const note = s.note
    ? `<div class="note"><div class="label">Uwaga</div><p>${s.note}</p></div>`
    : '';
  return `<article class="screen">
    <div class="frame"><img src="${img(s.shot)}" alt="${esc(s.title)}"></div>
    <h3>${title}</h3>
    ${labelled('Co widać', s.see)}
    ${labelled('Po co', s.why)}
    ${pitch}${note}
  </article>`;
}

function wideCard(s: Screen, img: ImageResolver): string {
  const pitch = s.pitch
    ? `<div class="pitch"><div class="label">Dla sprzedaży</div><p>${s.pitch}</p></div>`
    : '';
  const note = s.note
    ? `<div class="note"><div class="label">Uwaga</div><p>${s.note}</p></div>`
    : '';
  return `<article class="wide">
    <h3>${s.title}</h3>
    <div class="frame"><img src="${img(s.shot)}" alt="${esc(s.title)}"></div>
    <div class="cols">
      <div>${labelled('Co widać', s.see)}${labelled('Po co', s.why)}</div>
      <div>${pitch}${note}</div>
    </div>
  </article>`;
}

function table(b: Extract<Block, { kind: 'table' }>): string {
  const cols = b.widths
    ? `<colgroup>${b.widths.map((w) => `<col style="width:${w}">`).join('')}</colgroup>`
    : '';
  const head = `<thead><tr>${b.head.map((h) => `<th>${h}</th>`).join('')}</tr></thead>`;
  const rows = b.rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
  return `<table>${cols}${head}<tbody>${rows}</tbody></table>`;
}

function block(b: Block, img: ImageResolver): string {
  switch (b.kind) {
    case 'screens':
      return `<div class="screens">${b.items.map((s) => screenCard(s, img)).join('')}</div>`;
    case 'wide':
      return b.items.map((s) => wideCard(s, img)).join('');
    case 'text':
      return `<div class="text">${b.html}</div>`;
    case 'callout':
      return `<div class="callout">${b.html}</div>`;
    case 'list':
      return `<div class="list">${b.title ? `<h2>${b.title}</h2>` : ''}<ul>${b.items.map((i) => `<li>${i}</li>`).join('')}</ul></div>`;
    case 'table':
      return table(b);
  }
}

function chapter(c: Chapter, n: number, img: ImageResolver): string {
  return `<section class="chapter">
    <div class="kicker">Rozdział ${n}</div>
    <h1>${c.title}</h1>
    <p class="lead">${c.lead}</p>
    ${c.blocks.map((b) => block(b, img)).join('\n')}
  </section>`;
}

function cover(d: Doc): string {
  return `<section class="cover">
    <div class="kicker">${d.kicker}</div>
    <div class="product">${d.product}<span>${d.productSuffix}</span></div>
    <div class="title">${d.title}</div>
    <p class="intro">${d.intro}</p>
    <div class="kicker">Spis rozdziałów</div>
    <div class="toc">${d.chapters.map((c) => `<div>${c.title}</div>`).join('')}</div>
    <div class="spacer"></div>
    <div class="status"><b>${d.status.label}</b> ${d.status.html}</div>
    <div class="demo-note">${d.demoNote}</div>
  </section>`;
}

export function renderDocument(d: Doc, img: ImageResolver): string {
  const body = d.chapters.map((c, i) => chapter(c, i + 1, img)).join('\n');
  return `<!doctype html>
<html lang="pl"><head><meta charset="utf-8">
<title>${esc(d.product)} — ${esc(d.title)}</title>
<style>${CSS}</style></head>
<body>${cover(d)}
${body}
<div class="footer">${d.footer}</div>
</body></html>`;
}
