import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router-dom";

export type ButtonVariant = "primary" | "secondary" | "dark" | "ghost";
export type ButtonSize = "md" | "lg";

/**
 * Accent discipline lives here so it can't drift: ribbon is only ever the
 * primary action. Secondary/dark/ghost cover everything else.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-ribbon text-inverse hover:bg-ribbon-deep active:bg-ribbon-deep shadow-rest",
  secondary: "bg-transparent text-ink ring-1 ring-line hover:bg-surface-sunk",
  dark: "bg-ink text-inverse hover:opacity-90",
  ghost: "bg-transparent text-ribbon hover:bg-ribbon-tint",
};

// 52px on primary actions per spec; md is for inline/secondary placements.
const SIZES: Record<ButtonSize, string> = {
  md: "h-11 px-5 text-body",
  lg: "h-[52px] px-7 text-[15px]",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-pill font-medium transition-all duration-fast ease disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97]";

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
