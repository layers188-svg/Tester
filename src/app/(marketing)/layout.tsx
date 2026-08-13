import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/Button";
import styles from "./layout.module.css";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="House Dark home">
          <Wordmark />
        </Link>
        {/* The entrance carries the calls to action now, so the header
            only holds identity and a way back. "How it works" moved to
            the footer with the other reading. */}
        <nav className={styles.nav} aria-label="Primary">
          <Button href="/join" variant="secondary">
            Sign in
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
          <Link href="/how-it-works">How it works</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/film-rights">Film rights and service disclaimer</Link>
        </nav>
      </footer>
    </div>
  );
}
