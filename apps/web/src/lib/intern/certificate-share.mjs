/** Public verification link for a certificate number. */
export function verifyUrl(certificateNumber, origin) {
  return `${String(origin || "").replace(/\/$/, "")}/certificates/verify/${encodeURIComponent(certificateNumber)}`;
}

/**
 * LinkedIn's "Add licence or certification" deep link, prefilled.
 * https://addtoprofile.linkedin.com — startTask=CERTIFICATION_NAME.
 */
export function linkedInAddUrl(certificate, origin) {
  const issued = new Date(`${String(certificate?.issuedOn || "").slice(0, 10)}T00:00:00Z`);
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: `${certificate?.program || "Internship"} Internship`,
    organizationName: "Olentra Technologies",
    certUrl: verifyUrl(certificate?.certificateNumber || "", origin),
    certId: certificate?.certificateNumber || "",
  });
  if (!Number.isNaN(issued.getTime())) {
    params.set("issueYear", String(issued.getUTCFullYear()));
    params.set("issueMonth", String(issued.getUTCMonth() + 1));
  }
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}
