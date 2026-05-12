export function BrandMark() {
  return (
    <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-zinc-950 via-violet-950 to-cyan-950 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-200/35">
      <svg aria-hidden="true" className="size-7" viewBox="0 0 32 32" fill="none">
        <path
          d="M6 15.2 16 6.8l10 8.4v9.55A2.25 2.25 0 0 1 23.75 27H8.25A2.25 2.25 0 0 1 6 24.75V15.2Z"
          fill="url(#cliphouse-fill)"
        />
        <path
          d="M4.75 15.8 16 6.3l11.25 9.5M8 14.35v10.4A2.25 2.25 0 0 0 10.25 27h11.5A2.25 2.25 0 0 0 24 24.75v-10.4"
          stroke="url(#cliphouse-stroke)"
          strokeWidth="2.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M13.25 12.1v8.8l7.45-4.4-7.45-4.4Z" fill="#67e8f9" />
        <path d="M13.25 12.1v8.8l7.45-4.4-7.45-4.4Z" stroke="#f5f3ff" strokeOpacity="0.55" strokeWidth="0.8" strokeLinejoin="round" />
        <path
          d="M8.3 16.15 16 9.65l7.7 6.5"
          stroke="#f0abfc"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
        <defs>
          <linearGradient id="cliphouse-fill" x1="6" x2="26" y1="7" y2="27" gradientUnits="userSpaceOnUse">
            <stop stopColor="#111827" />
            <stop offset="0.55" stopColor="#312e81" />
            <stop offset="1" stopColor="#083344" />
          </linearGradient>
          <linearGradient id="cliphouse-stroke" x1="4.75" x2="27.25" y1="6.3" y2="27" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f0abfc" />
            <stop offset="0.48" stopColor="#c4b5fd" />
            <stop offset="1" stopColor="#67e8f9" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
