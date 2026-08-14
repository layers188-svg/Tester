"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";

/**
 * The way to sign in, carrying the testing key if the visitor arrived
 * with one.
 *
 * `/join` reads `?k=` to decide whether to offer the code-free entry
 * (see TEST_SIGNIN_KEY). The entrance already handled this because the
 * home page could read `searchParams` and hand the key to the form it
 * renders inline. Every *link* to /join dropped it, so a visitor who
 * arrived at `/?k=…` and clicked "Sign in" landed on the ordinary form
 * and was asked for a code that cannot currently be delivered.
 *
 * Preserved rather than hardcoded: the key is whatever is in the URL,
 * this component never knows the real one, and a visitor without a link
 * gets a plain `/join` exactly as before.
 */
function SignInLinkInner({ className, label }: { className?: string; label: string }) {
  const key = useSearchParams().get("k");
  const href = key ? `/join?k=${encodeURIComponent(key)}` : "/join";

  return className ? (
    <a href={href} className={className}>
      {label}
    </a>
  ) : (
    <Button href={href} variant="secondary">
      {label}
    </Button>
  );
}

export function SignInLink({ className, label }: { className?: string; label: string }) {
  /*
   * `useSearchParams` opts the subtree into client rendering, which the
   * static marketing shell must not be dragged into wholesale. The
   * fallback is the plain link: correct for everyone without a key, and
   * replaced the moment the real one resolves.
   */
  return (
    <Suspense
      fallback={
        className ? (
          <a href="/join" className={className}>
            {label}
          </a>
        ) : (
          <Button href="/join" variant="secondary">
            {label}
          </Button>
        )
      }
    >
      <SignInLinkInner className={className} label={label} />
    </Suspense>
  );
}
