"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AppNav.module.css";

const DESTINATIONS = [
  { href: "/tonight", label: "Tonight", icon: TonightIcon },
  { href: "/circle", label: "Circle", icon: CircleIcon },
  { href: "/library", label: "Library", icon: LibraryIcon },
  { href: "/you", label: "You", icon: YouIcon },
] as const;

/**
 * Exactly four persistent destinations (brief §5). Do not add a fifth —
 * the Programming Desk lives at /desk, reachable from You for owners,
 * not from this bar.
 */
export function AppNav({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Primary">
      {DESTINATIONS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
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
      {isOwner && (
        <Link href="/desk" className={styles.deskLink}>
          Desk
        </Link>
      )}
    </nav>
  );
}

type IconProps = { active: boolean };

function TonightIcon({ active }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
      <path d="M12 3.5V12l6 3.5" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" />
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
