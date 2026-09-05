type IconProps = { className?: string; filled?: boolean };

const base = "h-6 w-6";

export function HomeIcon({ className = base, filled }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

export function CalendarIcon({ className = base, filled }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2.5" fill={filled ? "currentColor" : "none"} />
      <path d="M8 3v4M16 3v4M3 10h18" stroke={filled ? "rgb(var(--canvas))" : "currentColor"} />
    </svg>
  );
}

export function SearchIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function GiftIcon({ className = base, filled }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="9" width="18" height="12" rx="1.5" />
      <path d="M3 13h18M12 9v12" />
      <path d="M12 9S10.5 3 7.8 3a2.2 2.2 0 0 0 0 4.4H12ZM12 9s1.5-6 4.2-6a2.2 2.2 0 0 1 0 4.4H12Z" />
    </svg>
  );
}

/**
 * The bag in the header. A shopping basket says supermarket; this is a gift
 * bag with handles and a ribbon, which is what someone is actually carrying
 * out of CADO.
 */
export function GiftBagIcon({ className = base, filled }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* the bag */}
      <path d="M5 8h14l-1 12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 8Z" />
      {/* handles */}
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      {/* ribbon down the front */}
      <path d="M12 11v10" />
      <path d="M12 11s-1-2-2.4-2a1.3 1.3 0 0 0 0 2.6H12Zm0 0s1-2 2.4-2a1.3 1.3 0 0 1 0 2.6H12Z" />
    </svg>
  );
}

export function OrdersIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12l1.5 4.5H4.5L6 3Z" />
      <path d="M4.5 7.5V20a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V7.5" />
      <path d="M9.5 11.5h5" />
    </svg>
  );
}

export function AccountIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

export function BasketIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5h18l-1.6 10.2a2 2 0 0 1-2 1.8H6.6a2 2 0 0 1-2-1.8L3 8.5Z" />
      <path d="M8.5 8.5 12 3l3.5 5.5" />
    </svg>
  );
}

export function HeartIcon({ className = base, filled }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20.5s-7.5-4.6-10-9.3C.5 8 1.9 4.7 5 3.7c2-.6 4 .1 5.3 1.9L12 7.5l1.7-1.9c1.3-1.8 3.3-2.5 5.3-1.9 3.1 1 4.5 4.3 3 7.5-2.5 4.7-10 9.3-10 9.3Z" />
    </svg>
  );
}

export function SettingsIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.64 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.64a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.64a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.36 9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  );
}

export function HelpIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M9.2 9a2.8 2.8 0 1 1 4 2.55c-.8.4-1.2 1-1.2 1.95v.3" />
      <path d="M12 17.2h.01" />
    </svg>
  );
}

export function GlobeIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M2.5 12h19M12 2.5c2.5 2.6 3.8 5.8 3.8 9.5s-1.3 6.9-3.8 9.5c-2.5-2.6-3.8-5.8-3.8-9.5S9.5 5.1 12 2.5Z" />
    </svg>
  );
}

export function LightningIcon({ className = base, filled }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  );
}

export function GoogleIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.56-5.17 3.56-8.66Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.27a12 12 0 0 0 0 10.76l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.62l4 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

export function PlusIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function StarIcon({ className = base, filled }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5 14.6 9l6 .9-4.3 4.2 1 6-5.3-2.8L6.7 20l1-6-4.3-4.2 6-.9 2.6-5.5Z" />
    </svg>
  );
}

export function WrapIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="8" width="16" height="12" rx="1.5" />
      <path d="M4 13h16M12 8v12" />
      <path d="M12 8S10.5 3 8 3a2 2 0 0 0 0 4h4ZM12 8s1.5-5 4-5a2 2 0 0 1 0 4h-4Z" />
    </svg>
  );
}

export function ShieldCheckIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 4.5 5.5V11c0 5 3.2 8.4 7.5 10 4.3-1.6 7.5-5 7.5-10V5.5L12 3Z" />
      <path d="M9 12l2 2 4-4.5" />
    </svg>
  );
}

export function WalletIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TruckIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="12" height="10" rx="1" />
      <path d="M14 10.5h4.5L21 13.5V17h-7z" />
      <circle cx="7" cy="18.5" r="1.6" />
      <circle cx="17.5" cy="18.5" r="1.6" />
    </svg>
  );
}

export function InstagramIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function WhatsAppIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21c-1.6 0-3.1-.4-4.4-1.2L3 21l1.3-4.4A8.9 8.9 0 1 1 12 21Z" />
      <path d="M8.5 8.8c.2-.5.4-.5.6-.5h.5c.2 0 .4 0 .5.4.2.5.6 1.6.6 1.7.1.1.1.3 0 .4-.1.2-.2.3-.3.4l-.4.4c-.1.1-.3.3-.1.6.2.4.8 1.3 1.8 2.1 1.2 1 2.2 1.3 2.6 1.5.3.1.5.1.6-.1l.6-.7c.2-.2.4-.2.6-.1l1.5.7c.2.1.4.2.4.3.1.2.1 1-.3 1.4-.4.5-1.3.9-2.3.8-1.9-.3-3.6-1.1-5-2.5-1.1-1.1-1.8-2.2-2.1-2.7-.3-.5-.9-1.6-.9-3 0-.4.1-.7.2-1Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TikTokIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3v10.5a3 3 0 1 1-2.5-3" />
      <path d="M14 3c.3 2.3 1.9 4 4.5 4.3" />
    </svg>
  );
}

export function ChevronLeftIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18 9 12l6-6" />
    </svg>
  );
}

/** Two opposed arrows — the sort control beside the filter button. */
export function SortIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4v16M7 20l-3.2-3.4M7 20l3.2-3.4" />
      <path d="M17 20V4M17 4l-3.2 3.4M17 4l3.2 3.4" />
    </svg>
  );
}

/** Three heads — the group gift card, where several people chip in on one
 *  card. Drawn as one front figure and two behind so it still reads as
 *  "several people" at 24px, where a crowd turns to mush. */
export function GroupIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="9" r="3.2" />
      <path d="M6.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M5.2 12.2a2.6 2.6 0 1 1 1.6-4.6M2.5 17.4a4.2 4.2 0 0 1 2.6-3.6" />
      <path d="M18.8 12.2a2.6 2.6 0 1 0-1.6-4.6M21.5 17.4a4.2 4.2 0 0 0-2.6-3.6" />
    </svg>
  );
}

/** A ticket/card with a scan line — "enter the code you were given". Kept
 *  distinct from GiftIcon so the three gift-card options never share art. */
export function TicketIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h15A1.5 1.5 0 0 1 21 8.5v2a2 2 0 0 0 0 3.9v2A1.5 1.5 0 0 1 19.5 18h-15A1.5 1.5 0 0 1 3 16.5v-2a2 2 0 0 0 0-3.9v-2Z" />
      <path d="M14 10.5v4" strokeDasharray="1.6 2.2" />
    </svg>
  );
}

/** The stacked-lines / sliders filter glyph. Three tracks with a handle on
 *  each — it reads as "adjust" at 20px, which a plain funnel does not. */
export function SlidersIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="2.2" fill="rgb(var(--surface))" />
      <circle cx="15" cy="12" r="2.2" fill="rgb(var(--surface))" />
      <circle cx="8" cy="17" r="2.2" fill="rgb(var(--surface))" />
    </svg>
  );
}

/** Shown / hidden, for the wallet balance toggle. Same 1.7 stroke as the rest. */
export function EyeIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

export function EyeOffIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 6.5C2.9 8.4 2 12 2 12s3.6 6.5 10 6.5c1.8 0 3.4-.5 4.8-1.2M9.6 5.7A9.9 9.9 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a19 19 0 0 1-3.2 4" />
      <path d="M9.9 9.9a2.6 2.6 0 0 0 3.6 3.7" />
      <path d="m3 3 18 18" />
    </svg>
  );
}

/** The delivery-address marker in the header. An SVG rather than 📍 because
 *  an emoji renders in its own colours on every platform and cannot be asked
 *  to be ink on a white header. */
export function PinIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}
