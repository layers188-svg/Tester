"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHouseLights } from "./HouseLights";
import styles from "./AppNav.module.css";

const DESTINATIONS = [
  { href: "/tonight", label: "Tonight", icon: TonightIcon },
  { href: "/search", label: "Search", icon: SearchIcon },
  { href: "/circle", label: "Circle", icon: CircleIcon },
  { href: "/library", label: "Library", icon: LibraryIcon },
  { href: "/you", label: "Me", icon: YouIcon },
] as const;

/**
 * Five persistent destinations.
 *
 * The brief said four and said not to add a fifth. Search was added by
 * direction on 14 August, and it genuinely could not live inside the
 * others: Tonight is the house choosing, Circle is a friend choosing,
 * Library is what you have already seen. "You know the name of a film
 * and do not want to Google it" had nowhere to go.
 *
 * The Programming Desk still does not belong here — it lives at /desk,
 * reachable from Me for owners. It briefly sat in this bar as a sixth
 * item labelled "Desk", which read as development UI left in by
 * mistake, and contradicted the rule directly above it.
 */
export function AppNav() {
  const pathname = usePathname();
  // The tabs go dark with the room. `inert` matters as much as the
  // opacity: an invisible tab bar that is still tabbable is not dark.
  const { dimmed } = useHouseLights();

  const navRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  const isActive = useCallback(
    (href: string) => pathname === href || pathname.startsWith(`${href}/`),
    [pathname],
  );

  /**
   * Measure where the indicator should sit.
   *
   * Read from the DOM rather than computed from an index, because the
   * five items are not equal widths on desktop, where they lay out to
   * their labels. Re-measured on resize and on orientation change for
   * the same reason.
   */
  useEffect(() => {
    const place = () => {
      const nav = navRef.current;
      const active = nav?.querySelector<HTMLElement>('[data-active="true"]');
      if (!nav || !active) {
        setIndicator(null);
        return;
      }
      const navBox = nav.getBoundingClientRect();
      const itemBox = active.getBoundingClientRect();
      setIndicator({ left: itemBox.left - navBox.left, width: itemBox.width });
    };

    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [pathname]);

  return (
    <nav
      ref={navRef}
      className={`${styles.nav} hd-dimmable hd-persistent-nav`}
      aria-label="Primary"
      data-dimmed={dimmed}
      inert={dimmed}
    >
      {/*
        One rule that travels between sections rather than a border
        destroyed and recreated on each item. Decorative: `aria-current`
        on the link is what actually announces the active section.
      */}
      <span
        className={styles.indicator}
        aria-hidden="true"
        data-hidden={indicator === null}
        style={{
          width: indicator ? `${indicator.width}px` : 0,
          transform: `translate3d(${indicator?.left ?? 0}px, 0, 0)`,
        }}
      />

      {DESTINATIONS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={styles.item}
            aria-current={active ? "page" : undefined}
            data-active={active}
          >
            <Icon active={active} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

type IconProps = { active: boolean };

function TonightIcon({ active }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
      <path
        d="M12 3.5V12l6 3.5"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

function CircleIcon({ active }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="8.5" cy="9" r="3" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
      <circle cx="16" cy="10.5" r="2.25" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
      <path
        d="M3.5 19c.6-2.8 2.6-4.5 5-4.5s4.4 1.7 5 4.5M13.5 19c.4-2 1.9-3.3 3.7-3.3s3.2 1.2 3.6 3"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

function LibraryIcon({ active }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 4.5h5a2 2 0 0 1 2 2V20a2 2 0 0 0-2-2H4V4.5ZM20 4.5h-5a2 2 0 0 0-2 2V20a2 2 0 0 1 2-2h5V4.5Z"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon({ active }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
      <path
        d="M15 15l4.5 4.5"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

function YouIcon({ active }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
      <path
        d="M4.5 19.5c1-3.8 4-6 7.5-6s6.5 2.2 7.5 6"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}
