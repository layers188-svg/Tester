// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NoTrailerPlayer } from "@/components/tonight/NoTrailerPlayer";

/**
 * The No Trailer player is the one screen the whole product turns on,
 * and its failure modes are the dangerous kind: a silent dead end, or a
 * browser refusing an autoplay that carries sound (brief §7 rules 8-10,
 * §16 rule 7).
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

function setReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    }),
  });
}

function render(onComplete = vi.fn(), fallbackCues: string[] = []) {
  act(() => {
    root.render(
      <NoTrailerPlayer
        src="https://example.test/abc.mp4"
        fallbackCues={fallbackCues}
        onComplete={onComplete}
      />,
    );
  });
  return onComplete;
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
  setReducedMotion(false);
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

describe("NoTrailerPlayer — autoplay and sound", () => {
  it("starts muted so the browser cannot refuse the autoplay", async () => {
    render();
    const video = container.querySelector("video")!;
    // Brief §7 rule 10: autoplay must not depend on sound.
    expect(video.muted).toBe(true);
    expect(playMock).toHaveBeenCalled();
  });

  it("lets the member turn the room tone on afterwards", () => {
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
    const video = container.querySelector("video")!;
    expect(video.hasAttribute("playsinline")).toBe(true);
  });
});

describe("NoTrailerPlayer — a declined autoplay is never a dead end", () => {
  it("offers a way in when the browser refuses to play", async () => {
    stubMedia({ rejectPlay: true });
    render();
    // Let the rejected play() promise settle.
    await act(async () => {});

    expect(buttonLabels()).toContain("Play the No Trailer");
  });

  it("plays when the member asks", async () => {
    stubMedia({ rejectPlay: true });
    render();
    await act(async () => {});

    stubMedia();
    clickButton("Play the No Trailer");
    expect(playMock).toHaveBeenCalled();
  });
});

describe("NoTrailerPlayer — reduced motion", () => {
  it("holds on the still frame when the system asks for reduced motion", () => {
    setReducedMotion(true);
    render();

    expect(playMock).not.toHaveBeenCalled();
    // Held at the end state, so Continue is available without motion.
    expect(buttonLabels()).toContain("Continue");
  });

  it("exposes an in-app control, so the choice is not buried in an OS panel", () => {
    render();
    const control = [...container.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Reduced motion",
    )!;
    expect(control.getAttribute("aria-pressed")).toBe("false");

    clickButton("Reduced motion");
    expect(control.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("NoTrailerPlayer — completion and failure", () => {
  it("offers replay and continue once the sequence ends", () => {
    render();
    const video = container.querySelector("video")!;
    act(() => {
      video.dispatchEvent(new Event("ended"));
    });

    expect(buttonLabels()).toEqual(
      expect.arrayContaining(["Replay", "Continue", "Sound off", "Reduced motion"]),
    );
  });

  it("only advances when the member chooses to continue", () => {
    const onComplete = render();
    const video = container.querySelector("video")!;
    act(() => {
      video.dispatchEvent(new Event("ended"));
    });

    expect(onComplete).not.toHaveBeenCalled();
    clickButton("Continue");
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("offers a retry on playback failure and never reveals anything", () => {
    render(vi.fn(), ["Tempo", "Ambition"]);
    const video = container.querySelector("video")!;
    act(() => {
      video.dispatchEvent(new Event("error"));
    });

    expect(buttonLabels()).toContain("Try again");
    // Brief §7 rule 8: a broken video must never reveal a title.
    expect(container.textContent).not.toMatch(/whiplash/i);
    expect(container.textContent).toMatch(/will not play/i);
  });

  it("falls back to the safe cues rather than leaving the member with nothing", () => {
    // A failed asset must still let the night continue: the same cues
    // the sealed card showed, and a way forward that is not the title.
    const onComplete = render(vi.fn(), ["Tempo", "Ambition", "Cruelty"]);
    act(() => {
      container.querySelector("video")!.dispatchEvent(new Event("error"));
    });

    for (const cue of ["Tempo", "Ambition", "Cruelty"]) {
      expect(container.textContent).toContain(cue);
    }
    clickButton("Continue");
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("stops the sample at ten seconds even when the asset runs longer", () => {
    const onComplete = render();
    const video = container.querySelector("video")!;
    Object.defineProperty(video, "duration", { value: 45, configurable: true });

    act(() => {
      Object.defineProperty(video, "currentTime", { value: 4, configurable: true });
      video.dispatchEvent(new Event("timeupdate"));
    });
    expect(buttonLabels()).not.toContain("Replay");

    act(() => {
      Object.defineProperty(video, "currentTime", { value: 10.2, configurable: true });
      video.dispatchEvent(new Event("timeupdate"));
    });
    // Ended without the media itself ending: the cap did it.
    expect(buttonLabels()).toContain("Replay");
    expect(onComplete).not.toHaveBeenCalled();
  });
});
