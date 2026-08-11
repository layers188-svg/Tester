import type { EmailPayload } from "./types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://housedark.app";

/**
 * Shared wrapper — "a short note from the house, not a newsletter
 * template" (brief §13). One thought, one action. No poster, no logo
 * art, just the wordmark as text.
 */
function wrapper(opts: { previewText: string; heading: string; body: string; actionLabel: string; actionHref: string; footerNote?: string }): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>House Dark</title>
  </head>
  <body style="margin:0;padding:0;background:#030303;color:#e9e0d0;font-family:Georgia,'Iowan Old Style',serif;">
    <span style="display:none;font-size:1px;color:#030303;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(
      opts.previewText,
    )}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#030303;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:92%;">
            <tr>
              <td style="padding-bottom:24px;">
                <span style="font-family:Arial,sans-serif;letter-spacing:0.18em;font-size:12px;text-transform:uppercase;color:#b9a16c;">House Dark</span>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid rgba(233,224,208,0.16);padding-top:24px;">
                <h1 style="font-family:Georgia,serif;font-weight:500;font-size:22px;margin:0 0 12px;color:#e9e0d0;">${escapeHtml(
                  opts.heading,
                )}</h1>
                <p style="font-size:16px;line-height:1.6;color:#d8ccb8;margin:0 0 24px;">${opts.body}</p>
                <a href="${opts.actionHref}" style="display:inline-block;background:#b9a16c;color:#080807;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;padding:12px 20px;border-radius:2px;">${escapeHtml(
                  opts.actionLabel,
                )}</a>
              </td>
            </tr>
            <tr>
              <td style="padding-top:32px;">
                <p style="font-family:Arial,sans-serif;font-size:12px;color:rgba(216,204,184,0.6);line-height:1.6;">${
                  opts.footerNote ??
                  `House Dark does not own or host the films it introduces. <a href="${APP_URL}/film-rights" style="color:rgba(216,204,184,0.8);">Film rights and service disclaimer</a>.`
                } &middot; <a href="${APP_URL}/you" style="color:rgba(216,204,184,0.8);">Manage email preferences</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toText(heading: string, body: string, actionLabel: string, actionHref: string): string {
  return `${heading}\n\n${body}\n\n${actionLabel}: ${actionHref}\n\nManage email preferences: ${APP_URL}/you`;
}

export function nightlyOpeningEmail(opts: { to: string; openingNumber: number }): EmailPayload {
  const heading = "Tonight's opening is ready.";
  const body = `Opening ${opts.openingNumber} is sealed and waiting. You will not know what it is until you choose to enter.`;
  const actionLabel = "Enter tonight";
  const actionHref = `${APP_URL}/tonight`;
  return {
    to: opts.to,
    subject: "Tonight's opening is ready",
    previewText: "Sealed and waiting. You choose when to enter.",
    html: wrapper({ previewText: "Sealed and waiting. You choose when to enter.", heading, body, actionLabel, actionHref }),
    text: toText(heading, body, actionLabel, actionHref),
  };
}

export function sealedRecommendationEmail(opts: { to: string; senderDisplayName: string }): EmailPayload {
  const heading = "A friend sent you a film under seal.";
  const body = `${escapeHtml(opts.senderDisplayName)} sent you something to watch. The title stays sealed until you choose to reveal it.`;
  const actionLabel = "Open the seal";
  const actionHref = `${APP_URL}/circle`;
  return {
    to: opts.to,
    subject: `${opts.senderDisplayName} sent you a film under seal`,
    previewText: "The title stays sealed until you choose to reveal it.",
    html: wrapper({ previewText: "The title stays sealed until you choose to reveal it.", heading, body, actionLabel, actionHref }),
    text: toText(heading, `${opts.senderDisplayName} sent you something to watch. The title stays sealed until you choose to reveal it.`, actionLabel, actionHref),
  };
}

export function screeningReminderEmail(opts: { to: string; circleName: string; scheduledForLabel: string }): EmailPayload {
  const heading = "Your Circle screening is approaching.";
  const body = `${escapeHtml(opts.circleName)} is gathering ${escapeHtml(opts.scheduledForLabel)}. Lights down soon.`;
  const actionLabel = "See the Circle";
  const actionHref = `${APP_URL}/circle`;
  return {
    to: opts.to,
    subject: "Your Circle screening is approaching",
    previewText: "Lights down soon.",
    html: wrapper({ previewText: "Lights down soon.", heading, body, actionLabel, actionHref }),
    text: toText(heading, `${opts.circleName} is gathering ${opts.scheduledForLabel}. Lights down soon.`, actionLabel, actionHref),
  };
}

export function afterCreditsEmail(opts: { to: string }): EmailPayload {
  const heading = "The conversation is open.";
  const body = "You left your six words. Now you can see what everyone else said.";
  const actionLabel = "Read after credits";
  const actionHref = `${APP_URL}/library`;
  return {
    to: opts.to,
    subject: "The conversation is open",
    previewText: "You left your six words.",
    html: wrapper({ previewText: "You left your six words.", heading, body, actionLabel, actionHref }),
    text: toText(heading, body, actionLabel, actionHref),
  };
}

export function editorialEmail(opts: { to: string; heading: string; body: string; actionLabel: string; actionHref: string }): EmailPayload {
  return {
    to: opts.to,
    subject: opts.heading,
    previewText: opts.body.slice(0, 90),
    html: wrapper({
      previewText: opts.body.slice(0, 90),
      heading: opts.heading,
      body: opts.body,
      actionLabel: opts.actionLabel,
      actionHref: opts.actionHref,
      footerNote: `You are receiving this because you opted in to House Dark editorial notes. <a href="${APP_URL}/you" style="color:rgba(216,204,184,0.8);">Unsubscribe</a>.`,
    }),
    text: toText(opts.heading, opts.body, opts.actionLabel, opts.actionHref),
  };
}
