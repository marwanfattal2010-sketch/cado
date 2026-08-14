import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router-dom";

export type ButtonVariant = "primary" | "secondary" | "dark" | "ghost" | "accent";
export type ButtonSize = "md" | "lg";

/**
 * Accent discipline lives here so it can't drift. `primary` is a charcoal
 * fill with cream text and is what the shopping side of the app uses.
 *
 * `accent` is the Persimmon fill, and it is deliberately opt-in rather than
 * the default: it belongs to the account side — Account, Orders, Favorites,
 * Gift Cards — where it marks the one action on the screen. Making primary
 * itself Persimmon would repaint Home, which is explicitly out of scope.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-inverse hover:bg-primary-deep active:bg-primary-deep shadow-rest",
  secondary: "bg-surface text-ink ring-1 ring-line hover:bg-surface-sunk",
  dark: "bg-primary text-inverse hover:bg-primary-deep",
  ghost: "bg-transparent text-ink underline underline-offset-4 hover:bg-surface-sunk",
  accent: "bg-persimmon text-white hover:brightness-95 active:brightness-95 shadow-rest",
};

// 52px on primary actions per spec; md is for inline/secondary placements.
const SIZES: Record<ButtonSize, string> = {
  md: "h-11 px-5 text-body",
  lg: "h-[52px] px-7 text-[15px]",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-pill font-medium transition-all duration-press ease-out disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97]";

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
};

export const Button = forwardRef<
  HTMLButtonElement,
  CommonProps & ButtonHTMLAttributes<HTMLButtonElement>
>(function Button(
  { variant = "primary", size = "lg", fullWidth = false, className = "", children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});

/** Same visual language for navigation, so a link never looks like a button
 *  that behaves differently. */
export function ButtonLink({
  to,
  variant = "primary",
  size = "lg",
  fullWidth = false,
  className = "",
  children,
  ...rest
}: CommonProps & { to: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const isExternal = /^(https?:|mailto:|tel:)/.test(to);
  const cls = `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? "w-full" : ""} ${className}`;
  if (isExternal) {
    return (
      <a href={to} className={cls} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={cls} {...rest}>
      {children}
    </Link>
  );
}
