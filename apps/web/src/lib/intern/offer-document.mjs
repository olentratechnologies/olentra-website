import { offerTimeLeft } from "./offer-deadline.mjs";

export function offerDocumentState(application, offer, now = Date.now()) {
  const accepted = offer?.status === "Accepted";
  const sent = offer?.status === "Sent";
  const expired = sent && Boolean(offerTimeLeft(offer.expiresOn, now)?.expired);
  return {
    visible: Boolean(application?.id && (accepted || sent)),
    downloadable: Boolean(application?.id && accepted),
    status: accepted ? "Accepted" : expired ? "Expired" : "Pending acceptance",
    date: accepted ? offer.decidedOn : offer?.sentOn,
    dateLabel: accepted ? "Accepted" : "Sent",
    reference: application?.id ? `OL-OFR-${application.id.replace(/^OL-/, "").slice(0, 18)}` : "",
  };
}
