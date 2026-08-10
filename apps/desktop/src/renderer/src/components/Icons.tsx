/** Iconos de trazo, dibujados a mano para no depender de una librería. */

type Props = { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const IconDashboard = ({ size = 20 }: Props) => (
  <svg {...base(size)}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
  </svg>
);

export const IconMail = ({ size = 20 }: Props) => (
  <svg {...base(size)}>
    <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
    <path d="M3 7l9 6 9-6" />
  </svg>
);

export const IconQuarantine = ({ size = 20 }: Props) => (
  <svg {...base(size)}>
    <path d="M3 8.5h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M2.5 4.5h19v4h-19z" />
    <path d="M10 13h4" />
  </svg>
);

export const IconSettings = ({ size = 20 }: Props) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.56V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.56-1.05A1.7 1.7 0 0 0 4.3 7.1l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.05a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

export const IconShield = ({ size = 20 }: Props) => (
  <svg {...base(size)}>
    <path d="M12 2.8l7.5 3v6c0 4.6-3.1 8.6-7.5 9.8-4.4-1.2-7.5-5.2-7.5-9.8v-6z" />
    <path d="M9.2 12l2 2 3.6-4" />
  </svg>
);

export const IconAlert = ({ size = 20 }: Props) => (
  <svg {...base(size)}>
    <path d="M12 3.6l9 15.6H3z" />
    <path d="M12 9.6v4" />
    <circle cx="12" cy="16.4" r=".9" fill="currentColor" stroke="none" />
  </svg>
);

export const IconLock = ({ size = 20 }: Props) => (
  <svg {...base(size)}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
);

export const IconLogout = ({ size = 18 }: Props) => (
  <svg {...base(size)}>
    <path d="M9.5 20.5H5.5a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h4" />
    <path d="M15.5 16.5l4.5-4.5-4.5-4.5" />
    <path d="M20 12H9" />
  </svg>
);

export const IconTrash = ({ size = 17 }: Props) => (
  <svg {...base(size)}>
    <path d="M3.5 6.5h17" />
    <path d="M8.5 6.5V4.8a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v1.7" />
    <path d="M5.8 6.5l.9 13a1.6 1.6 0 0 0 1.6 1.5h7.4a1.6 1.6 0 0 0 1.6-1.5l.9-13" />
  </svg>
);

export const IconBack = ({ size = 17 }: Props) => (
  <svg {...base(size)}>
    <path d="M20 12H4.5" />
    <path d="M10 5.5L3.5 12l6.5 6.5" />
  </svg>
);

/** La mascota del mockup: escudo con cara amable y un sobre asomando. */
export const ShieldMascot = ({ size = 96 }: Props) => (
  <svg width={size} height={size * 1.06} viewBox="0 0 100 106" fill="none" aria-hidden="true">
    <path
      d="M50 4l38 14v34c0 24-16 44-38 50C28 96 12 76 12 52V18z"
      fill="#86efac"
      stroke="#4ade80"
      strokeWidth="3"
    />
    <circle cx="37" cy="48" r="4.6" fill="#14351f" />
    <circle cx="63" cy="48" r="4.6" fill="#14351f" />
    <path
      d="M38 63c3.4 4.2 7.6 6.3 12 6.3S58.6 67.2 62 63"
      stroke="#14351f"
      strokeWidth="3.4"
      strokeLinecap="round"
    />
    <rect x="70" y="8" width="27" height="20" rx="4" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2.4" />
    <path d="M71.5 12.5L83.5 21l12-8.5" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);
