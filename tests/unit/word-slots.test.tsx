// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { WordSlots } from "@/components/tonight/WordSlots";

/**
 * The six-word field is one input pretending to be six slots, so the
 * mapping from "what was typed" to "what is shown" is doing real work
 * and can be wrong in ways that look like a rendering glitch: a word in
 * the wrong slot, a caret on the wrong underline, or a paste that
 * silently drops everything.
 *
 * Rendered with react-dom directly rather than a testing library — the
 * assertions are plain DOM queries, so the dependency would not earn
 * its place (brief rule 10).
 */
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

function render(value: string, onChange: (next: string) => void = () => {}) {
  act(() => {
    root.render(<WordSlots value={value} onChange={onChange} />);
  });
}

const slots = () => Array.from(container.querySelectorAll("li"));
const words = () => slots().map((li) => li.textContent);
const input = () => container.querySelector("input") as HTMLInputElement;

/** Mirrors how React's onChange fires for a real edit or paste. */
function type(value: string) {
  const field = input();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  act(() => {
    setter?.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("WordSlots", () => {
  it("always shows six slots, however few words there are", () => {
    render("");
    expect(slots()).toHaveLength(6);
    expect(words()).toEqual(["", "", "", "", "", ""]);
  });

  it("puts each word in its own slot", () => {
    render("Pressure sounds different after the silence");
    expect(words()).toEqual(["Pressure", "sounds", "different", "after", "the", "silence"]);
  });

  it("does not let leading or repeated spaces shift words along", () => {
    render("  loud   film  ");
    expect(words()).toEqual(["loud", "film", "", "", "", ""]);
  });

  /**
   * The caret is the slot the member is writing in. Mid-word it is the
   * word itself; after a space it has moved on to the empty one.
   */
  it("marks the word being written as the active slot", () => {
    render("one two thr");
    expect(slots().findIndex((li) => li.dataset.active === "true")).toBe(2);
  });

  it("moves the caret to the next slot once a space is typed", () => {
    render("one two ");
    expect(slots().findIndex((li) => li.dataset.active === "true")).toBe(2);
  });

  it("marks filled slots so they can be styled apart from empty ones", () => {
    render("one two");
    expect(slots().map((li) => li.dataset.filled)).toEqual([
      "true",
      "true",
      "false",
      "false",
      "false",
      "false",
    ]);
  });

  /**
   * The cap keeps the first six rather than refusing the edit. Refusing
   * makes a pasted sentence look like a field that is simply broken;
   * keeping six shows exactly what was taken.
   */
  it("truncates a paste of more than six words instead of rejecting it", () => {
    const onChange = vi.fn();
    render("", onChange);
    type("one two three four five six seven eight");
    expect(onChange).toHaveBeenCalledWith("one two three four five six");
  });

  it("passes an ordinary edit through untouched, trailing space and all", () => {
    const onChange = vi.fn();
    render("one two", onChange);
    type("one two ");
    expect(onChange).toHaveBeenCalledWith("one two ");
  });

  it("labels the single real input, and hides the slots from assistive tech", () => {
    render("one");
    expect(input()).toBeTruthy();
    expect(container.querySelectorAll("input")).toHaveLength(1);
    expect(container.querySelector("ol")?.getAttribute("aria-hidden")).toBe("true");
    const label = container.querySelector("label");
    expect(label?.getAttribute("for")).toBe(input().id);
  });

  it("does not claim a caret while the field is disabled", () => {
    act(() => {
      root.render(<WordSlots value="one two" onChange={() => {}} disabled />);
    });
    expect(slots().some((li) => li.dataset.active === "true")).toBe(false);
  });
});
