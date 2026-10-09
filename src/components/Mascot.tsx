export function Mascot({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="36" rx="26" ry="22" fill="#FFEAD5" stroke="#4A3036" strokeWidth="3" />
      <circle cx="24" cy="34" r="3" fill="#4A3036" />
      <circle cx="40" cy="34" r="3" fill="#4A3036" />
      <ellipse cx="18" cy="41" rx="4" ry="2.5" fill="#E78895" />
      <ellipse cx="46" cy="41" rx="4" ry="2.5" fill="#E78895" />
      <path d="M28 41 q4 4 8 0" fill="none" stroke="#4A3036" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M44 6 l10 10 -18 18 -12 2 2 -12z" fill="#89B9AD" stroke="#4A3036" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}
