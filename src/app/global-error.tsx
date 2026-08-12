"use client";

import { useEffect } from "react";

/**
 * The last resort: an error thrown in the root layout itself, before
 * any styling or font is mounted. Next replaces the whole document
 * here, so this file must render its own <html> and <body> and cannot
 * rely on globals.css having loaded — hence the inline styles, which
 * are otherwise not how anything in this project is built.
 *
 * Same rule as `error.tsx`: the message is never rendered, only the
 * digest is logged (brief §11).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(`House Dark root error${error.digest ? ` (${error.digest})` : ""}`);
  }, [error.digest]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "2rem 1.25rem",
          background: "#030303",
          color: "#e9e0d0",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <p
          style={{
            margin: "0 0 0.5rem",
            color: "#b9a16c",
            fontSize: "0.75rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          The house
        </p>
        <h1 style={{ margin: "0 0 0.75rem", fontSize: "1.75rem", lineHeight: 1.1 }}>
          Something went dark.
        </h1>
        <p style={{ margin: "0 0 1.5rem", color: "#d8ccb8", maxWidth: "34ch" }}>
          The house could not open at all. Nothing you have saved is affected.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            appearance: "none",
            border: "1px solid #b9a16c",
            background: "transparent",
            color: "#e9e0d0",
            padding: "0.75rem 1.25rem",
            font: "inherit",
            cursor: "pointer",
            alignSelf: "flex-start",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
