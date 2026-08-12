import { describe, expect, it } from "vitest";
import { entryField, FIELD_COLOURS } from "@/lib/library/field";

/**
 * Library fields replace the film stills the mockups showed. Brief rule
 * 8 forbids third party film imagery, so the field must be derived
 * purely from the row's own id and must carry nothing about the film.
 */

const REVEALED_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("entryField", () => {
  it("gives a revealed entry a field from the palette", () => {
    const field = entryField(REVEALED_ID, true)!;
    expect(FIELD_COLOURS).toContain(field.colour);
  });

  it("gives a sealed entry no field at all", () => {
    // An unrevealed row should read as withheld, not decorated.
    expect(entryField(REVEALED_ID, false)).toBeNull();
  });

  it("is stable, so a Library looks the same every time it is opened", () => {
    const first = entryField(REVEALED_ID, true);
    const second = entryField(REVEALED_ID, true);
    expect(first).toEqual(second);
  });

  it("varies across entries rather than painting one wall of colour", () => {
    const colours = new Set(
      Array.from({ length: 40 }, (_, i) => entryField(`opening-${i}`, true)!.colour),
    );
    expect(colours.size).toBeGreaterThan(2);
  });

  it("keeps the band off both edges", () => {
    for (let i = 0; i < 200; i += 1) {
      const { bandAt } = entryField(`row-${i}`, true)!;
      expect(bandAt).toBeGreaterThanOrEqual(30);
      expect(bandAt).toBeLessThanOrEqual(70);
    }
  });

  it("uses only palette tokens, never a literal colour", () => {
    // Keeps the fields inside the design system rather than drifting
    // into one-off hexes.
    for (const colour of FIELD_COLOURS) {
      expect(colour).toMatch(/^var\(--hd-[a-z-]+\)$/);
    }
  });
});
