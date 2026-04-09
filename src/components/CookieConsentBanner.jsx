"use client";

import { useEffect, useState } from "react";

const CONSENT_KEY = "olentra_cookie_consent_v1";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function readConsent() {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeConsent(consent) {
  const payload = {
    essential: true,
    analytics: Boolean(consent.analytics),
    status: consent.status || (consent.analytics ? "accepted" : "rejected"),
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
  document.cookie = `${CONSENT_KEY}=${encodeURIComponent(
    JSON.stringify(payload)
  )}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  window.dispatchEvent(new CustomEvent("olentra-consent-changed", { detail: payload }));
}

export default function CookieConsentBanner() {
  const [loaded, setLoaded] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(true);

  useEffect(() => {
    const existing = readConsent();
    if (!existing) {
      setShowBanner(true);
    } else {
      setAnalyticsAllowed(Boolean(existing.analytics));
    }
    setLoaded(true);
  }, []);

  const acceptAll = () => {
    writeConsent({ analytics: true, status: "accepted" });
    setAnalyticsAllowed(true);
    setShowBanner(false);
    setShowPreferences(false);
  };

  const rejectNonEssential = () => {
    writeConsent({ analytics: false, status: "rejected" });
    setAnalyticsAllowed(false);
    setShowBanner(false);
    setShowPreferences(false);
    if (window.posthog?.opt_out_capturing) {
      window.posthog.opt_out_capturing();
    }
  };

  const savePreferences = () => {
    writeConsent({
      analytics: analyticsAllowed,
      status: analyticsAllowed ? "custom-accepted" : "custom-rejected",
    });
    setShowBanner(false);
    setShowPreferences(false);
    if (!analyticsAllowed && window.posthog?.opt_out_capturing) {
      window.posthog.opt_out_capturing();
    }
  };

  if (!loaded) return null;

  return (
    <>
      {showBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-[140] md:left-6 md:right-6">
          <div className="mx-auto max-w-5xl rounded-2xl border border-white/15 bg-slate-950/95 text-white backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.55)] p-5 md:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary mb-3">
              Cookie Preferences
            </p>
            <p className="text-sm md:text-[15px] text-slate-200 leading-relaxed">
              We use essential cookies for site operation and optional analytics cookies to improve
              performance and user experience.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={acceptAll}
                className="px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.24em] bg-primary text-white hover:bg-blue-700 transition-all"
                style={{
                  clipPath:
                    "polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)",
                }}
              >
                Accept All
              </button>
              <button
                type="button"
                onClick={rejectNonEssential}
                className="px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.24em] border border-white/20 text-slate-100 hover:border-primary hover:text-primary transition-all"
                style={{
                  clipPath:
                    "polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)",
                }}
              >
                Reject Optional
              </button>
              <button
                type="button"
                onClick={() => setShowPreferences((prev) => !prev)}
                className="px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.24em] border border-white/20 text-slate-100 hover:border-primary hover:text-primary transition-all"
                style={{
                  clipPath:
                    "polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)",
                }}
              >
                Preferences
              </button>
            </div>
            {showPreferences && (
              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white">
                      Essential Cookies
                    </p>
                    <p className="text-xs text-slate-400">
                      Required for core website functionality.
                    </p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                    Always On
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white">
                      Analytics Cookies
                    </p>
                    <p className="text-xs text-slate-400">
                      Help us improve service quality and site performance.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={analyticsAllowed}
                      onChange={(e) => setAnalyticsAllowed(e.target.checked)}
                      className="h-4 w-4 accent-blue-600"
                    />
                    Enabled
                  </label>
                </div>
                <button
                  type="button"
                  onClick={savePreferences}
                  className="px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.24em] bg-primary text-white hover:bg-blue-700 transition-all"
                  style={{
                    clipPath:
                      "polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)",
                  }}
                >
                  Save Preferences
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </>
  );
}
