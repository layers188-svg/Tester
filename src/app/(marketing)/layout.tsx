import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/Button";
import { EntryGate } from "@/components/entry/EntryGate";
import styles from "./layout.module.css";

/**
 * The public site. On "/" it opens behind the projection aperture —
 * EntryGate decides that for itself, so the rest of the marketing
 * routes are untouched by it.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <EntryGate>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="House Dark home">
            <Wordmark />
          </Link>
          <nav className={styles.nav} aria-label="Primary">
            <Link href="/how-it-works" className={styles.navLink}>
              How it works
            </Link>
            <Button href="/join" variant="secondary">
              Join or sign in
            </Button>
          </nav>
        </header>
        <main id="hd-main" className={styles.main}>
          {children}
        </main>
        <footer className={styles.footer}>
          <div className={styles.footerBrand}>
            <Wordmark />
            <p className={styles.footerNote}>One film. A few friends. Nobody knows.</p>
          </div>
          <nav className={styles.footerNav} aria-label="Legal">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/film-rights">Film rights and service disclaimer</Link>
          </nav>
        </footer>
      </div>
    </EntryGate>
  );
}
