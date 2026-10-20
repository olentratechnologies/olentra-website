"use client";

import { useState } from "react";
import { ArrowRight, Check, Minus, Plus, Store } from "lucide-react";

const plans = {
  basic: {
    name: "Basic",
    label: "Just POS",
    rate: 1250,
    price: "₹15,000 / store / year",
    features: [
      "Multi-channel barcode scanning",
      "Offline counter POS billing",
      "Hold & recall active carts",
      "Cash, UPI & card payments",
      "Daily store turnover summaries",
    ],
  },
  advanced: {
    name: "Advanced",
    label: "Full suite",
    rate: 7500,
    price: "From ₹7,500 / store / month",
    features: [
      "Complete store POS & inventory",
      "Physical stock audit 3 times/year",
      "Society milk & daily subscriptions",
      "GST compliance & GSTR-1/3B export",
      "AI smart combo cross-selling",
    ],
  },
  enterprise: {
    name: "Enterprise",
    label: "Custom solution",
    rate: 0,
    price: "A quote tailored to your business",
    features: [
      "Multi-store central inventory sync",
      "Society resident app white-labeling",
      "Automated vendor supply network",
      "Customer khata & WhatsApp auto-pay",
      "Dedicated account manager & 24/7 SLA",
    ],
  },
};

const currency = (value) => `₹${value.toLocaleString("en-IN")}`;

export function PricingCalculator() {
  const [plan, setPlan] = useState("basic");
  const [stores, setStores] = useState(1);
  const selected = plans[plan];
  const monthly = selected.rate * stores;
  const custom = plan === "enterprise";
  const prefix = plan === "advanced" ? "From " : "";
  const updateStores = (value) => setStores(Math.min(50, Math.max(1, value)));

  return (
    <div className="overflow-hidden rounded-2xl border border-blue-400/20 bg-slate-900/70 shadow-[0_16px_50px_rgba(0,0,0,0.2)]">
      <div className="grid lg:grid-cols-[1.25fr_1fr]">
        <div className="p-5 sm:p-7">
          <fieldset>
            <legend className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
              Choose your plan
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {Object.keys(plans).map((key) => (
                <label key={key} className="cursor-pointer">
                  <input
                    type="radio"
                    name="pricing-plan"
                    value={key}
                    checked={plan === key}
                    onChange={() => setPlan(key)}
                    className="peer sr-only"
                  />
                  <span className="block rounded-xl border border-white/10 bg-white/[0.03] px-2 py-3 text-center transition-colors peer-checked:border-blue-400 peer-checked:bg-blue-600/20 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-300 hover:border-blue-400/60">
                    <span className="block text-xs sm:text-sm font-bold text-white">
                      {plans[key].name}
                    </span>
                    <span className="mt-1 block text-[10px] sm:text-xs text-slate-400">
                      {plans[key].label}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="pricing-stores"
                className="flex items-center gap-2 text-sm font-semibold"
              >
                <Store className="h-4 w-4 text-blue-400" />
                Retail store locations
              </label>
              <div className="flex items-center rounded-lg border border-white/10 bg-slate-950/60">
                <button
                  type="button"
                  aria-label="Remove one store"
                  disabled={stores === 1}
                  onClick={() => updateStores(stores - 1)}
                  className="p-2.5 text-slate-300 hover:text-white disabled:opacity-30 focus-visible:outline-blue-300"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-7 text-center text-base font-bold tabular-nums">
                  {stores}
                </span>
                <button
                  type="button"
                  aria-label="Add one store"
                  disabled={stores === 50}
                  onClick={() => updateStores(stores + 1)}
                  className="p-2.5 text-slate-300 hover:text-white disabled:opacity-30 focus-visible:outline-blue-300"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            <input
              id="pricing-stores"
              type="range"
              min="1"
              max="50"
              step="1"
              value={stores}
              onChange={(event) => updateStores(Number(event.target.value))}
              aria-valuetext={`${stores} ${stores === 1 ? "store" : "stores"}`}
              className="mt-4 h-6 w-full cursor-pointer accent-blue-500 focus-visible:outline-blue-300"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>1 store</span>
              <span>50 stores</span>
            </div>
          </div>

          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-sm font-semibold text-blue-300">{selected.price}</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {selected.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-xs leading-relaxed text-slate-300"
                >
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col justify-between border-t border-white/10 bg-gradient-to-br from-blue-600/15 to-slate-950/80 p-5 sm:p-7 lg:border-l lg:border-t-0">
          <div aria-live="polite" aria-atomic="true">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-300">
              {custom ? "Your custom plan" : "Estimated monthly equivalent"}
            </p>
            <p className="mt-3 text-3xl sm:text-4xl font-black tracking-tight tabular-nums">
              {custom ? (
                "Let’s talk"
              ) : (
                <>
                  <span className="text-base font-medium text-slate-400">{prefix}</span>
                  {currency(monthly)}
                </>
              )}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {selected.name} · {stores} {stores === 1 ? "store" : "stores"}
              {plan === "basic" ? " · billed annually" : ""}
            </p>
            {!custom && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-y border-white/10 py-4 text-sm">
                <span className="text-slate-300">
                  {plan === "basic" ? "Annual subscription" : "12-month estimate"}
                </span>
                <strong className="tabular-nums">
                  {prefix}
                  {currency(monthly * 12)}
                </strong>
              </div>
            )}
            <p className="mt-4 text-xs leading-relaxed text-slate-400">
              {plan === "basic" &&
                "Subscription only. One-time onboarding is additional: ₹10,000 per 5,000 SKU. Applicable taxes are excluded."}
              {plan === "advanced" &&
                "Starting estimate using the base rate per store. Final pricing varies by monthly sales. Onboarding, add-ons and applicable taxes are excluded."}
              {custom &&
                "Tell us about your locations and operations for a tailored quote. For more than 50 stores, contact our team directly."}
            </p>
          </div>
          <a
            href={custom ? "/#contact" : "tel:+919100125055"}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
          >
            {custom ? "Request a custom quote" : "Talk to us about this plan"}
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
