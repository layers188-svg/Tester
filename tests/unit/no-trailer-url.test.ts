import { afterEach, describe, expect, it } from "vitest";
import { noTrailerUrl } from "@/lib/media/storage";

/**
 * Where a No Trailer is fetched from.
 *
 * Three kinds of value reach this function and they are not
 * interchangeable: an opaque object name in the Storage bucket (the
 * normal case, written by the Programming Desk), an absolute URL (a CDN
 * in front of the bucket), and an absolute path served by this
 * deployment (the staging simulator's clip). The last one is the reason
 * the base path exists — the motion review site is published to a
 * subdirectory, and Next prefixes its own asset URLs but not a path
 * carried inside a Library record.
 */

const ORIGINAL_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH;
const ORIGINAL_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_BASE_PATH = ORIGINAL_BASE_PATH;
  process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_SUPABASE_URL;
});

describe("noTrailerUrl", () => {
  it("resolves an object name against the no-trailer bucket", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";

    expect(noTrailerUrl("9f2c1a7e4b")).toBe(
      "https://project.supabase.co/storage/v1/object/public/no-trailer/9f2c1a7e4b",
    );
  });

  it("leaves an absolute URL alone, base path or not", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/Tester";

    expect(noTrailerUrl("https://cdn.example.test/9f2c1a7e4b")).toBe(
      "https://cdn.example.test/9f2c1a7e4b",
    );
  });

  it("is the identity on an absolute path when no base path is set", () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH;

    expect(noTrailerUrl("/dev/stage-no-trailer.webm")).toBe("/dev/stage-no-trailer.webm");
  });

  it("prefixes an absolute path with the deployment's base path", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/Tester";

    expect(noTrailerUrl("/dev/stage-no-trailer.webm")).toBe("/Tester/dev/stage-no-trailer.webm");
  });

  it("does not let the base path reach a bucket object name", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/Tester";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";

    // The bucket is not served by this deployment, so a subdirectory
    // deploy must not rewrite the way into it.
    expect(noTrailerUrl("9f2c1a7e4b")).toBe(
      "https://project.supabase.co/storage/v1/object/public/no-trailer/9f2c1a7e4b",
    );
  });
});
