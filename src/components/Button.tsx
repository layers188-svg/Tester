import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost";

interface CommonProps {
  variant?: Variant;
  fullWidth?: boolean;
  /**
   * A request is in flight. The label stays put — swapping it for
   * "Loading…" changes the control's width and shifts whatever is
   * beside it — and a thin rule creeps along the foot instead.
   */
  loading?: boolean;
}

type ButtonAsButton = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsLink = CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const { variant = "primary", fullWidth = false, loading = false, className, ...rest } = props;
  const classes = [styles.button, styles[variant], fullWidth ? styles.fullWidth : "", className]
    .filter(Boolean)
    .join(" ");

  if ("href" in props && props.href) {
    const { href, children, ...anchorRest } = rest as AnchorHTMLAttributes<HTMLAnchorElement> & {
      href: string;
    };
    return (
      <Link href={href} className={classes} {...anchorRest}>
        {children}
      </Link>
    );
  }

  const { children, ...buttonRest } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      className={classes}
      type={buttonRest.type ?? "button"}
      data-loading={loading || undefined}
      // Busy rather than disabled: the control keeps its place in the
      // tab order and a screen reader is told work is happening, which
      // a disabled button cannot say.
      aria-busy={loading || undefined}
      {...buttonRest}
    >
      {children}
    </button>
  );
}
