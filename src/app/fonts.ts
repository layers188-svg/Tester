import { Newsreader, Barlow_Condensed } from "next/font/google";

/**
 * Self-hosted via next/font — the font files are downloaded at build
 * time and served from this deployment's own origin, with no runtime
 * request to Google (brief §8: "Self host the font files"). Licence:
 * both families are SIL Open Font License 1.1, see public/fonts/OFL.txt.
 */

export const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  variable: "--font-newsreader",
  display: "swap",
  fallback: ["Iowan Old Style", "Palatino Linotype", "Georgia", "serif"],
});

export const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
  fallback: ["Arial Narrow", "Arial", "sans-serif"],
});
