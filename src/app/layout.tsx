import type { Metadata, Viewport } from "next";
import { newsreader, barlowCondensed } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL)
    : undefined,
  title: {
    default: "House Dark",
    template: "%s — House Dark",
  },
  description:
    "The best film experiences happen when you know nothing. House Dark presents one human chosen film each night, sealed until you choose to enter.",
  applicationName: "House Dark",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "House Dark",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    title: "House Dark",
    description: "One film. A few friends. Nobody knows.",
    siteName: "House Dark",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#030303",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
