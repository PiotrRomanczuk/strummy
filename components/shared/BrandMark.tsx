/** The Strummy brand mark: a guitar pick with three strum lines. Uses the
 * `--gold-2` token from app/design-tokens.css where the `.theme-strummy`
 * scope is present, falling back to its light-mode value (#b17f12)
 * elsewhere — an unresolved var() makes `stroke` invalid, not just unstyled. */
export const PickMark = ({ size = 24, className }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    stroke="var(--gold-2, #b17f12)"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M32 8c11 0 20 5 20 14 0 13-12 26-20 34C24 48 12 35 12 22 12 13 21 8 32 8z"
      strokeWidth="4.5"
      strokeLinejoin="round"
    />
    <path d="M20 24h24M22 32h20M25 40h14" strokeWidth="3.2" strokeLinecap="round" />
  </svg>
);
