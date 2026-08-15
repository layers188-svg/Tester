/**
 * The Room's spatial field (handover 01_MOTION_SYSTEM.md §11).
 *
 * One `roomProgress` in [0,1] drives every voice's y, x, scale, opacity
 * and blur. Keeping that mapping here — rather than inline in the
 * component — means the geometry is a pure function that can be tested
 * without a browser, and the component is left with one job: read the
 * scroll, write the transforms.
 *
 * The reference is PP Fragment: the words are the scenery. A voice
 * approaches, grows, passes and softens. None of this is a card.
 */

export interface VoicePlacement {
  /** Vertical offset in px, relative to the voice's resting position. */
  y: number;
  /** Lateral offset in px. Small — this is depth, not a carousel. */
  x: number;
  scale: number;
  opacity: number;
  /** Blur radius in px. Distance from the member, not a decorative effect. */
  blur: number;
}

export interface VoiceFieldOptions {
  /** Where in the scroll this voice is nearest, in [0,1]. */
  anchor: number;
  /** How much of the scroll this voice occupies either side of its anchor. */
  window: number;
  /**
   * How near this voice is to the member. Circle voices sit forward and
   * personal; House voices exist deeper in the field (§11: "Circle
   * voices feel nearer and more personal. House voices can exist deeper
   * in the field.").
   */
  depth: number;
  /** Alternating sign, so voices do not all drift the same way. */
  drift: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * `local` runs -1 (approaching, below) → 0 (here) → 1 (past, above).
 * Everything else is derived from it, so a voice cannot be near in one
 * property and far in another.
 */
export function placeVoice(roomProgress: number, options: VoiceFieldOptions): VoicePlacement {
  const { anchor, window: voiceWindow, depth, drift } = options;
  const local = clamp((roomProgress - anchor) / voiceWindow, -1, 1);
  const nearness = 1 - Math.abs(local);

  // Travel is large on purpose. Motion principle 5 rules out 3-5px
  // micro motion as the main effect, and this is the main effect.
  const y = local * -240;
  const x = drift * (1 - nearness) * 28;
  const scale = (0.72 + nearness * 0.42) * depth;
  const opacity = 0.06 + nearness * 0.94;
  const blur = (1 - nearness) * 7;

  return { y, x, scale, opacity, blur };
}

/**
 * Spread n voices across the scroll so the first is readable as the
 * Room opens and the last is readable before it ends — rather than
 * anchoring the first at 0 and the last at 1, where each would only
 * ever be half seen.
 */
export function anchorFor(index: number, total: number): number {
  if (total <= 1) return 0.5;
  const margin = 0.12;
  return margin + (index / (total - 1)) * (1 - margin * 2);
}

/**
 * A voice's window has to overlap its neighbours or the field goes
 * empty between them, and the floor keeps a long Room from reducing
 * each voice to a flicker.
 */
export function windowFor(total: number): number {
  return Math.max(0.22, 1.6 / Math.max(total, 1));
}

/**
 * Scene height. §11 asks for 350 to 450vh with a sticky 100vh viewport;
 * a Room with three voices does not need 450vh of scrolling to say so,
 * and a Room with twenty needs the room to breathe.
 */
export function sceneHeightVh(voiceCount: number): number {
  return clamp(140 + voiceCount * 62, 220, 450);
}
