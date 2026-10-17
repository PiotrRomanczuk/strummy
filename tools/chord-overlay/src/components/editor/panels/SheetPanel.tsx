import { Panel } from "../ui/Panel";

export function SheetPanel({
  text, chunkCount, uniqueCount, onChange,
}: {
  text: string;
  chunkCount: number;
  uniqueCount: number;
  onChange: (text: string) => void;
}) {
  return (
    <Panel title="Chord sheet" subtitle={`${chunkCount} chunks · ${uniqueCount} unique chords`}>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={"Paste from ultimate-guitar.com…\n\n[Em]Hello [G]darkness my old [D]friend"}
        spellCheck={false}
        className="h-40 w-full resize-y rounded-md border border-stone-200 bg-stone-50 p-3 font-mono text-xs text-stone-800 transition focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
      />
    </Panel>
  );
}
