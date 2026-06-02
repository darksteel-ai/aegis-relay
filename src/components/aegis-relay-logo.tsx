type AegisRelayLogoProps = {
  subtitle?: string;
  compact?: boolean;
  markClassName?: string;
  textClassName?: string;
};

export function AegisRelayLogo({
  subtitle,
  compact = false,
  markClassName = "h-10 w-10",
  textClassName = "",
}: AegisRelayLogoProps) {
  return (
    <span className="flex items-center gap-3">
      <AegisRelayMark className={markClassName} />
      {!compact ? (
        <span className={textClassName}>
          <span className="block text-sm font-semibold leading-none text-white">
            Aegis Relay
          </span>
          {subtitle ? (
            <span className="mt-1 block text-xs font-medium leading-none text-slate-500">
              {subtitle}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

export function AegisRelayMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="aegis-relay-shield" x1="12" x2="52" y1="6" y2="58">
          <stop stopColor="#67E8F9" />
          <stop offset="0.48" stopColor="#E2E8F0" />
          <stop offset="1" stopColor="#FF3347" />
        </linearGradient>
        <linearGradient id="aegis-relay-core" x1="20" x2="46" y1="18" y2="46">
          <stop stopColor="#22D3EE" />
          <stop offset="1" stopColor="#FF3347" />
        </linearGradient>
      </defs>
      <rect
        height="62"
        rx="13"
        stroke="url(#aegis-relay-shield)"
        strokeOpacity="0.36"
        width="62"
        x="1"
        y="1"
      />
      <path
        d="M32 9.5 48.5 16v13.4c0 11.2-6.4 18.9-16.5 25.1-10.1-6.2-16.5-13.9-16.5-25.1V16L32 9.5Z"
        fill="#071017"
        stroke="url(#aegis-relay-shield)"
        strokeWidth="2.4"
      />
      <path
        d="M25 34.5 32 19l7 15.5m-10.7-5.7h7.4"
        stroke="url(#aegis-relay-core)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3.2"
      />
      <path
        d="M18.5 25.5h7.2M38.3 25.5h7.2M22 40.5h6.5M35.5 40.5H42"
        stroke="#94A3B8"
        strokeLinecap="round"
        strokeOpacity="0.72"
        strokeWidth="2.2"
      />
      <circle cx="18.5" cy="25.5" fill="#67E8F9" r="2.5" />
      <circle cx="45.5" cy="25.5" fill="#FF3347" r="2.5" />
      <circle cx="22" cy="40.5" fill="#E2E8F0" r="2.2" />
      <circle cx="42" cy="40.5" fill="#E2E8F0" r="2.2" />
    </svg>
  );
}
