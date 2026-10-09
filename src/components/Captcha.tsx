"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

// Cloudflare Turnstile widget. Renders nothing when no site key is configured.

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("captcha script failed to load"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export type CaptchaHandle = { reset: () => void };

export default function Captcha({
  siteKey,
  onToken,
  ref,
}: {
  siteKey: string | null;
  onToken: (token: string | null) => void;
  ref?: Ref<CaptchaHandle>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);

  useImperativeHandle(ref, () => ({
    // Tokens are single-use: get a fresh one after each submit attempt.
    reset: () => {
      onToken(null);
      if (widget.current) window.turnstile?.reset(widget.current);
    },
  }));

  useEffect(() => {
    if (!siteKey || !box.current) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return;
        widget.current = window.turnstile.render(box.current, {
          sitekey: siteKey,
          theme: "dark",
          language: "pt-br",
          callback: (t: string) => onToken(t),
          "expired-callback": () => onToken(null),
          "error-callback": () => onToken(null),
        });
      })
      .catch((err) => console.error(err));
    return () => {
      cancelled = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey, onToken]);

  if (!siteKey) return null;
  return <div ref={box} className="min-h-[65px]" />;
}
