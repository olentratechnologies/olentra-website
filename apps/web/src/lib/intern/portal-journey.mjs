import { offerTimeLeft } from "./offer-deadline.mjs";

/** The next student action follows the actual offer, not just selection. */
export function portalJourney({ application, offer, onboarding, intern }, now = Date.now()) {
  const accepted = offer?.status === "Accepted" || application?.status === "Joined" || onboarding?.status === "Approved";
  const expired = offer?.status === "Sent" && Boolean(offerTimeLeft(offer.expiresOn, now)?.expired);
  const pending = offer?.status === "Sent" && !expired && !accepted;
  const received = Boolean(offer) || accepted;
  const offerHref = "/intern/portal/application#internship-offer";
  return {
    accepted, pending, expired, offerHref,
    steps: [
      { label: "Application", done: Boolean(application) },
      { label: "Offer received", done: received, status: "Awaiting offer" },
      { label: "Offer accepted", done: accepted, status: pending ? "Action required" : expired ? "Offer expired" : offer?.status === "Declined" ? "Offer declined" : "Coming up next", ...(pending ? { action: "Accept your offer", href: offerHref } : {}) },
      { label: "Onboarding", done: onboarding?.status === "Approved", status: accepted ? onboarding?.status === "Submitted" ? "Under review" : "Ready to complete" : "Accept your offer first" },
      { label: "Internship", done: intern?.status === "Completed", status: intern?.status === "Active" ? "In progress" : intern?.status === "Dropped" ? "Ended" : "Coming up next" },
    ],
  };
}
