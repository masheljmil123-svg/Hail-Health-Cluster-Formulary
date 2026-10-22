export function HeroArt() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[34%] lg:block" aria-hidden="true">
      <svg viewBox="0 0 520 640" className="h-full w-full" fill="none">
        <g opacity="0.55" stroke="#8FB8D6" strokeWidth="1.4">
          <circle cx="250" cy="150" r="7" fill="#d7ebf7" />
          <circle cx="330" cy="118" r="5" fill="#e7f4fb" />
          <circle cx="390" cy="190" r="6" fill="#d5e9f6" />
          <circle cx="300" cy="230" r="4.5" fill="#edf6fb" />
          <path d="M250 150 L330 118 L390 190 L300 230 Z" />
          <circle cx="430" cy="90" r="3" fill="#c5dded" />
          <path d="M390 190 L430 90" />
          <circle cx="180" cy="210" r="4" fill="#e7f3fa" />
          <path d="M180 210 L250 150" />
        </g>
        <g transform="translate(250 250) rotate(28)">
          <rect x="0" y="0" width="86" height="250" rx="43" fill="url(#capsule)" opacity="0.95" />
          <path d="M8 125 H78" stroke="white" strokeOpacity="0.7" />
          <rect x="18" y="148" width="50" height="70" rx="8" fill="white" fillOpacity="0.18" />
        </g>
        <defs>
          <linearGradient id="capsule" x1="0" y1="0" x2="86" y2="250" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F7FBFE" />
            <stop offset="0.48" stopColor="#D7E8F6" />
            <stop offset="0.52" stopColor="#7EADD4" />
            <stop offset="1" stopColor="#1A4E86" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
