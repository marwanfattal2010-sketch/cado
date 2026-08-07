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

export function FlowerIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21c-4.5-3.2-8-6.4-8-10.2A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 8 2.8c0 3.8-3.5 7-8 10.2Z" />
    </svg>
  );
}

export function JewelryIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3.5h12l3 5-9 12-9-12 3-5Z" />
      <path d="M3 8.5h18M9 3.5l3 5-3 12M15 3.5l-3 5 3 12" />
    </svg>
  );
}

export function PerfumeIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 8.5V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2.5" />
      <path d="M8 8.5h8l1 3v9a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-9l1-3Z" />
      <path d="M9 14h6" />
    </svg>
  );
}

export function ChocolateIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="6" width="17" height="13" rx="1.5" />
      <path d="M3.5 10h17M8 6v13M14 6v13M5.7 13h1.6M10.7 13h1.6M15.7 13h1.6" />
    </svg>
  );
}

export function FashionIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4 6 6 3 9l3 2.5V20a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-8.5L21 9l-3-3-3-2" />
      <path d="M9 4a3 3 0 0 0 6 0" />
    </svg>
  );
}

export function ShoeIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 19v-4.5c2-.3 3-1.2 3.8-2.3.9-1.3 1.7-2.2 3.7-2.2 1.6 0 2 .9 3.5 2 1.3 1 3.6 1.5 6 1.5V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
      <path d="M3 16.5h18" />
    </svg>
  );
}

export function ToyIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="4.5" />
      <rect x="12.5" y="12.5" width="8" height="8" rx="1.5" />
      <path d="M3.5 20.5c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" />
    </svg>
  );
}

export function HomeGiftIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.5V20a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5" />
      <path d="M12 13v8M9.3 13c-1.6 0-2.3-1-2.3-2s1-1.6 1.8-1.1c.6.4.5 1.8.5 3.1ZM14.7 13c1.6 0 2.3-1 2.3-2s-1-1.6-1.8-1.1c-.6.4-.5 1.8-.5 3.1Z" />
    </svg>
  );
}

export function ElectronicsIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path d="M11.5 18h1" />
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
