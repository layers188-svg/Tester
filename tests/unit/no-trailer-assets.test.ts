import { describe, expect, it } from "vitest";
import { readFileSync, statSync } from "node:fs";
import { validateMediaFile } from "@/lib/media/validate";

/**
 * The six supplied No Trailer assets (handover 10_SAMPLE_VIDEO_ASSETS.md).
 *
 * This file deliberately does not contain the six film titles.
 *
 * An earlier draft listed them as forbidden terms and asserted the
 * filenames did not contain them — which passed, and which would have
 * committed a list of exactly six candidate titles to the repository.
 * One of those six is whatever is sealed tonight, so that list narrows
 * the answer far more sharply than the 500-film corpus does. The seed
 * title appears in the spoiler suite because it is a fixture; these are
 * the real programme.
 *
 * So the assertions are about the *shape* of an opaque asset rather
 * than about any particular title. `HDNT-004` cannot leak a title it
 * does not contain, whatever the title turns out to be — a property
 * worth more than a blocklist, because it also holds for the seventh
 * asset nobody has supplied yet.
 */

interface Asset {
  assetId: string;
  file: string;
  durationSeconds: number;
  bytes: number;
  hasAudioTrack: boolean;
  approvedForPublicUse: boolean;
}

const RAW = readFileSync("media/no-trailer/manifest.json", "utf8");
const manifest = JSON.parse(RAW) as { assets: Asset[] };

describe("the supplied No Trailer assets", () => {
  it("are all six the handover expects", () => {
    expect(manifest.assets).toHaveLength(6);
  });

  it("are named opaquely and nothing else", () => {
    // The one rule that makes a client-visible storage path safe.
    for (const a of manifest.assets) {
      expect(a.assetId).toMatch(/^HDNT-\d{3}$/);
      expect(a.file).toBe(`media/no-trailer/${a.assetId}.mp4`);
    }
  });

  it("carry no prose that could describe a film", () => {
    // Every string value in the manifest is either an opaque id, a path
    // built from one, a hex digest or a container name. Anything else is
    // someone having added a helpful note.
    const allowed = /^(HDNT-\d{3}|media\/no-trailer\/HDNT-\d{3}\.mp4|[0-9a-f]{64}|mp4)$/;
    for (const a of manifest.assets) {
      for (const value of Object.values(a)) {
        if (typeof value === "string") expect(value).toMatch(allowed);
      }
    }
  });

  it("pass the real media validator", () => {
    for (const a of manifest.assets) {
      const size = statSync(a.file).size;
      // A title the asset could not possibly contain, to exercise the
      // check without naming a real one.
      const issues = validateMediaFile(
        { type: "video/mp4", size, name: `${a.assetId}.mp4` },
        "A Title That Is Not Any Of Them",
      );
      expect(issues.filter((i) => i.blocking)).toEqual([]);
    }
  });

  it("are the documented ten seconds, and silent", () => {
    for (const a of manifest.assets) {
      expect(a.durationSeconds).toBeCloseTo(10, 0);
      expect(a.hasAudioTrack).toBe(false);
    }
  });

  it("are not approved for public use merely by existing", () => {
    // "A sample video is not automatically launch-approved because it
    // exists in the repository." Approval is a human act, recorded.
    for (const a of manifest.assets) expect(a.approvedForPublicUse).toBe(false);
  });
});
