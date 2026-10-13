/** Print stylesheet for the walkthrough document (A4, light only — it is a PDF). */
export const CSS = /* css */ `
  :root {
    --ivory: #faf7f0; --paper: #f1ead9; --card: #ffffff; --ink: #1b1712; --mute: #79705f;
    --rule: #e4dac4; --gold: #b9862b; --gold-dim: #8e661e; --gold-tint: #f6ecd0; --warn-bg: #fbf3e2;
    --serif: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
    --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, system-ui, sans-serif;
  }
  @page { size: A4; margin: 14mm 14mm 16mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: var(--ink); }
  body { font: 9.6pt/1.42 var(--sans); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  p { margin: 0 0 4pt; }
  b { font-weight: 650; }
  a { color: inherit; text-decoration: none; }

  .kicker { font: 600 6.6pt/1 var(--sans); letter-spacing: .22em; text-transform: uppercase; color: var(--mute); }
  .kicker b { color: var(--ink); font-weight: 600; }

  /* Cover */
  .cover { page-break-after: always; break-after: page; min-height: 255mm; display: flex; flex-direction: column; }
  .cover .product { font: 700 30pt/1.05 var(--serif); letter-spacing: -.01em; margin: 10pt 0 0; }
  .cover .product span { color: var(--gold); }
  .cover .title { font: 700 30pt/1.05 var(--serif); margin: 0 0 12pt; }
  .cover .intro { font-size: 11.5pt; line-height: 1.45; max-width: 150mm; margin-bottom: 18pt; }
  .toc { display: grid; grid-template-columns: 1fr 1fr; column-gap: 10mm; row-gap: 0; margin-top: 6pt; }
  .toc div { border-bottom: 1px solid var(--rule); padding: 5pt 0 4pt; font-size: 9.2pt; }
  .toc div::before { content: counter(toc) '. '; counter-increment: toc; }
  .toc { counter-reset: toc; }
  .cover .spacer { flex: 1; }
  .status { background: var(--gold-tint); border-radius: 6pt; padding: 9pt 11pt; font-size: 9pt; margin-bottom: 8pt; }
  .status b { font-weight: 700; }
  .demo-note { font-size: 7.6pt; color: var(--mute); border-top: 1px solid var(--rule); padding-top: 5pt; }

  /* Chapter */
  .chapter { page-break-before: always; break-before: page; }
  .chapter > h1 { font: 700 20pt/1.1 var(--serif); margin: 4pt 0 6pt; }
  .chapter > .lead { font-size: 10.2pt; line-height: 1.42; max-width: 165mm; margin-bottom: 9pt; }

  /* Screen cards */
  .screens { display: grid; grid-template-columns: 1fr 1fr; column-gap: 8mm; row-gap: 7mm; margin: 0 0 7mm; }
  .screen { break-inside: avoid; page-break-inside: avoid; }
  .frame { display: block; width: 100%; border: 1px solid var(--rule); border-radius: 9pt; background: var(--card);
           box-shadow: 0 1px 0 rgba(0,0,0,.03); overflow: hidden; margin-bottom: 7pt; }
  .frame img { display: block; width: 100%; height: auto; }
  .screens .frame { width: 64mm; margin-left: auto; margin-right: auto; }
  .screen h3 { font: 700 10.2pt/1.2 var(--sans); margin: 0 0 4pt; }
  .screen h3 .dot { color: var(--mute); font-weight: 400; }
  .label { font: 600 6.4pt/1 var(--sans); letter-spacing: .2em; text-transform: uppercase; color: var(--mute); margin: 5pt 0 2pt; }
  .screen p { font-size: 8.4pt; line-height: 1.38; margin: 0 0 2pt; }
  .pitch { background: var(--gold-tint); border-radius: 5pt; padding: 5pt 8pt 6pt; margin-top: 5pt; }
  .pitch .label { margin-top: 0; color: var(--gold-dim); }
  .pitch p { margin: 0; }
  .note { border-left: 2.5pt solid var(--gold); padding: 3pt 0 3pt 7pt; margin-top: 6pt; }
  .note .label { margin-top: 0; }
  .note p { margin: 0; color: var(--ink); }

  /* Wide (desktop) cards */
  .wide { margin: 0 0 7mm; break-inside: avoid; page-break-inside: avoid; }
  .wide h3 { font: 700 10.2pt/1.2 var(--sans); margin: 0 0 5pt; }
  .wide .frame { width: 148mm; margin: 0 auto 6pt; }
  .wide p { font-size: 8.9pt; }
  .wide .cols { display: grid; grid-template-columns: 1fr 1fr; column-gap: 8mm; }

  /* Text blocks */
  .text { max-width: 165mm; margin-bottom: 9pt; font-size: 9.8pt; line-height: 1.45; }
  .text h2 { font: 700 12.5pt/1.2 var(--serif); margin: 12pt 0 4pt; }
  .callout { background: var(--gold-tint); border-radius: 6pt; padding: 8pt 11pt; margin: 6pt 0 10pt; font-size: 10pt; max-width: 165mm; }
  .list h2 { font: 700 12.5pt/1.2 var(--serif); margin: 12pt 0 4pt; }
  .list ul { margin: 0 0 8pt; padding-left: 0; list-style: none; max-width: 165mm; }
  .list li { padding: 3pt 0 3pt 11pt; position: relative; font-size: 9.6pt; line-height: 1.42; }
  .list li::before { content: ''; position: absolute; left: 0; top: 8.5pt; width: 4pt; height: 4pt; border-radius: 50%; background: var(--gold); }

  /* Tables */
  table { border-collapse: collapse; width: 100%; margin: 4pt 0 12pt; font-size: 8.9pt; line-height: 1.38; }
  th { text-align: left; font: 600 6.6pt/1 var(--sans); letter-spacing: .18em; text-transform: uppercase; color: var(--mute);
       padding: 0 8pt 6pt 0; border-bottom: 1px solid var(--ink); }
  td { vertical-align: top; padding: 6pt 8pt 6pt 0; border-bottom: 1px solid var(--rule); }
  td:first-child { font-weight: 650; white-space: nowrap; }
  tr { break-inside: avoid; page-break-inside: avoid; }

  .footer { margin-top: 14pt; padding-top: 6pt; border-top: 1px solid var(--rule); font-size: 7.4pt; color: var(--mute); }
`;
