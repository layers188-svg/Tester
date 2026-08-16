import type { Metadata, Viewport } from "next";
import { newsreader, barlowCondensed } from "@/app/fonts";
import "@/app/globals.css";

/**
 * The same shell the product uses — same fonts, same tokens, same reset
 * — so what is measured here is what the product does.
 *
 * Two deliberate omissions. There is no service worker: this site is a
 * review surface, and a cache that outlives a redeploy is the last thing
 * it needs. And there is no manifest or icon set, because those live in
 * the product's public/ and this export ships only what the stage
 * actually loads.
 */

export const metadata: Metadata = {
  title: "House Dark — motion",
  description: "The staging state simulator: signature motion, rendered.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#030303",
  colorScheme: "dark",
};

export default function StageSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${barlowCondensed.variable}`}>
      <body>
        <a href="#hd-main" className="hd-skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
