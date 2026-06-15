export function SynapseLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="7" fill="#E20074" />
      <circle cx="9" cy="16" r="2.5" fill="white" />
      <circle cx="16" cy="10" r="2.5" fill="white" />
      <circle cx="23" cy="16" r="2.5" fill="white" />
      <circle cx="16" cy="22" r="2.5" fill="white" />
      <line x1="11" y1="15" x2="14" y2="11.5" stroke="white" strokeWidth="1.5" />
      <line x1="18" y1="11.5" x2="21" y2="15" stroke="white" strokeWidth="1.5" />
      <line x1="21" y1="17" x2="18" y2="20.5" stroke="white" strokeWidth="1.5" />
      <line x1="14" y1="20.5" x2="11" y2="17" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}
