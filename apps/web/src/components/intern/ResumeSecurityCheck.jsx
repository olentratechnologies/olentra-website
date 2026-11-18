"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

export const resumeSecuritySiteKey = process.env.NEXT_PUBLIC_INTERNSHIP_TURNSTILE_SITE_KEY;

export default function ResumeSecurityCheck() {
  const container = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ready || !container.current) return;
    const api = window.turnstile;
    if (!api) return;
    const widget = api.render(container.current, {
      sitekey: resumeSecuritySiteKey,
      action: "resume_upload",
      "refresh-expired": "auto",
      "error-callback": () => setFailed(true),
      callback: () => setFailed(false),
    });
    const node = container.current;
    const reset = () => api.reset(widget);
    node.addEventListener("resume-challenge-reset", reset);
    return () => {
      node.removeEventListener("resume-challenge-reset", reset);
      api.remove(widget);
    };
  }, [ready]);

  if (!resumeSecuritySiteKey) return null;
  return (
    <div>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setReady(true)} onError={() => setFailed(true)} />
      <div ref={container} data-resume-security-check />
      {failed && <p role="alert">The security check couldn’t load. Refresh the page to try again.</p>}
    </div>
  );
}
