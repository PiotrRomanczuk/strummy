import { PickMark } from '@/components/shared/BrandMark';

/** 28px gold-gradient brand tile from the Claude Design `SidebarNav`. */
export function SidebarBrandTile() {
  return (
    <div
      className="grid size-7 shrink-0 place-items-center rounded-lg shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)]"
      style={{ background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-2) 100%)' }}
    >
      <PickMark size={17} stroke="#fff" />
    </div>
  );
}
