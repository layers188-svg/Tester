// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NoTrailerPlayer } from "@/components/tonight/NoTrailerPlayer";

/**
 * The No Trailer player is the one screen the whole product turns on,
 * and its failure modes are the dangerous kind: playback that starts
 * without being asked, and a broken video that becomes a reveal.
 *
 * The rules changed with the August handover
 * (docs/handover/00_BUILD_BRIEF_FINAL.md §10, motion system §7):
 * "explicit member press before playback", "No autoplay", and at the
 * end, black rather than a Continue button. The tests that asserted the
 * muted-autoplay behaviour are gone with it — the previous design
 * autoplayed muted precisely because a browser would refuse an
 * autoplay carrying sound, and with no autoplay at all, that entire
 * problem and its workaround no longer exist.
 *
 * Rendered with react-dom directly rather than a testing library — the
 * assertions here are plain DOM queries, so the extra dependency would
 * not earn its place (brief rule 10).
 */

let container: HTMLDivElement;
let root: Root;
let playMock: ReturnType<typeof vi.fn>;

/** jsdom implements no media playback, so drive HTMLMediaElement by hand. */
function stubMedia({ rejectPlay = false }: { rejectPlay?: boolean } = {}) {
  playMock = vi.fn(() =>
    rejectPlay ? Promise.reject(new Error("NotAllowedError")) : Promise.resolve(),
  );
  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    writable: true,
    value: playMock,
  });
  Object.defineProperty(HTMLMediaElement.prototype, "load", {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
}

function render(onEnded = vi.fn()) {
  act(() => {
    root.render(<NoTrailerPlayer src="https://example.test/abc.mp4" onEnded={onEnded} />);
  });
  return onEnded;
}

function buttonLabels(): string[] {
  return [...container.querySelectorAll("button")].map((b) => b.textContent?.trim() ?? "");
}

function clickButton(label: string) {
  const button = [...container.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === label,
  );
  if (!button)
    throw new Error(`No button labelled "${label}". Found: ${buttonLabels().join(", ")}`);
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

beforeEach(() => {
  stubMedia();
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("NoTrailerPlayer — nothing plays until the member asks", () => {
  it("does not autoplay", () => {
    render();
    expect(playMock).not.toHaveBeenCalled();
  });

  it("offers the gate: No Trailer, ten seconds, Play", () => {
    render();
    expect(container.textContent).toMatch(/no trailer/i);
    expect(container.textContent).toMatch(/10 seconds/i);
    expect(buttonLabels()).toContain("Play");
  });

  it("plays only on the press", () => {
    render();
    clickButton("Play");
    expect(playMock).toHaveBeenCalledOnce();
  });

  it("starts from the beginning every time it is pressed", () => {
    render();
    const video = container.querySelector("video")!;
    video.currentTime = 6;
    clickButton("Play");
    expect(video.currentTime).toBe(0);
  });
});

describe("NoTrailerPlayer — silent by default", () => {
  it("starts muted", () => {
    render();
    expect(container.querySelector("video")!.muted).toBe(true);
  });

  it("lets the member turn the room tone on", () => {
    render();
    const video = container.querySelector("video")!;

    expect(buttonLabels()).toContain("Sound off");
    clickButton("Sound off");

    expect(video.muted).toBe(false);
    expect(buttonLabels()).toContain("Sound on");
  });

  it("never renders native browser controls", () => {
    render();
    expect(container.querySelector("video")!.hasAttribute("controls")).toBe(false);
  });

  it("plays inline rather than going fullscreen on a phone", () => {
    render();
    expect(container.querySelector("video")!.hasAttribute("playsinline")).toBe(true);
  });
});

describe("NoTrailerPlayer — the end of the picture", () => {
  it("hands straight back to the ritual, with no button in between", () => {
    const onEnded = render();
    const video = container.querySelector("video")!;
    clickButton("Play");

    act(() => {
      video.dispatchEvent(new Event("ended"));
    });

    expect(onEnded).toHaveBeenCalledOnce();
  });

  it("does not end the picture early on its own", () => {
    const onEnded = render();
    clickButton("Play");
    expect(onEnded).not.toHaveBeenCalled();
  });
});

describe("NoTrailerPlayer — failure never becomes a reveal", () => {
  it("offers a retry and says the House stays sealed", () => {
    const onEnded = render();
    const video = container.querySelector("video")!;
    act(() => {
      video.dispatchEvent(new Event("error"));
    });

    expect(buttonLabels()).toContain("Retry");
    expect(container.textContent).toMatch(/could not play/i);
    expect(container.textContent).toMatch(/stays sealed/i);

    // §10: "do not silently skip to reveal".
    expect(onEnded).not.toHaveBeenCalled();
    expect(container.textContent).not.toMatch(/whiplash/i);
  });

  it("a retry returns to the gate rather than a dead end", () => {
    render();
    const video = container.querySelector("video")!;
    act(() => {
      video.dispatchEvent(new Event("error"));
    });

    clickButton("Retry");
    expect(buttonLabels()).toContain("Play");
  });

  it("a play() the browser refuses leaves the gate open", async () => {
    stubMedia({ rejectPlay: true });
    render();
    clickButton("Play");
    await act(async () => {});

    // Still the gate, still pressable — never a spinner that never resolves.
    expect(buttonLabels()).toContain("Play");
  });
});
