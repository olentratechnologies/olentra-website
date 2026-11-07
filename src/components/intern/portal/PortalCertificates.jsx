"use client";

import { useState } from "react";
import CompanyBrand from "@/components/intern/CompanyBrand";
import { Award, Download, Eye, Printer, ShieldCheck } from "lucide-react";
import { useInternship } from "@/components/intern/InternshipProvider";
import {
  Button,
  EmptyState,
  ErrorMessage,
  Heading,
  Loading,
  Modal,
  Panel,
  Status,
  formatDate,
  useAction,
} from "./PortalUI";
import styles from "./portal.module.css";

const escape = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

function certificateHtml(certificate, organization) {
  const logoUrl = new URL(
    "/images/branding/Logo/Olentra-Logo-Without-Background.png",
    window.location.origin,
  ).href;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Olentra Technologies Internship Certificate</title><style>@page{size:A4 landscape;margin:0}*{box-sizing:border-box}body{margin:0;padding:30px;color:#182c58;background:#e8efff;font-family:Arial,sans-serif}.certificate{position:relative;max-width:1100px;min-height:650px;margin:0 auto;padding:65px 75px;border:1px solid #b3c9f3;background:linear-gradient(130deg,#fff,#f0f5ff);outline:8px solid #dce7ff;outline-offset:-20px;text-align:center}.brand{display:inline-flex;align-items:center;justify-content:center;gap:12px;color:#334155;font-size:26px;font-weight:900;letter-spacing:-1px}.brand img{display:block;width:46px;height:46px;object-fit:contain;flex:none}.brand .wordmark{display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;font-weight:900;text-transform:uppercase}.brandName{color:#334155}.brandTechnologies{color:#2563eb;background:linear-gradient(90deg,#60a5fa,hsl(217 91% 50%),#2563eb);background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent}.eyebrow{margin-top:45px;font-size:12px;letter-spacing:5px;color:#6d80a6}h1{font-family:Georgia,serif;font-size:42px;font-weight:normal;margin:18px 0 25px}.presented{color:#8390ad;font-size:12px}.name{font-family:Georgia,serif;font-size:35px;color:#235fc4;margin:18px 0}.copy{max-width:630px;margin:0 auto;color:#5b6f98;font-size:15px;line-height:1.8}.track{color:#254b8b;font-weight:bold}.footer{display:flex;justify-content:space-between;align-items:end;text-align:left;margin-top:55px}.footer strong{display:block;font-size:13px}.footer small{display:block;margin-top:7px;font-size:10px;color:#7488ad}.seal{border:2px solid #aac6ed;border-radius:50%;padding:20px 12px;color:#5b82c3;font-size:11px;letter-spacing:2px}.code{font-size:10px;color:#8396b7;margin-top:35px}@media screen and (max-width:700px){body{padding:14px}.certificate{min-height:0;padding:36px 20px;outline-width:5px;outline-offset:-10px}.brand{max-width:100%;gap:10px;font-size:22px;letter-spacing:-.8px}.brand img{width:40px;height:40px}.brand .wordmark{min-width:0;flex-direction:column;align-items:flex-start;gap:2px;line-height:1.08}.eyebrow{margin-top:30px;font-size:10px;letter-spacing:2px}h1{font-size:clamp(26px,6vw,36px);overflow-wrap:anywhere}.name{font-size:clamp(24px,7vw,34px);overflow-wrap:anywhere}.copy{font-size:14px;line-height:1.7}.footer{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;margin-top:35px}.footer strong{font-size:12px;overflow-wrap:anywhere}.footer .seal{grid-column:1/-1;grid-row:2;justify-self:center}.code{overflow-wrap:anywhere}}@media print{body{padding:0;background:white}.certificate{width:297mm;max-width:none;min-height:210mm;border:none;print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body><main class="certificate"><div class="brand" aria-label="Olentra Technologies"><img src="${escape(logoUrl)}" width="46" height="46" alt=""><span class="wordmark"><span class="brandName">OLENTRA</span><span class="brandTechnologies">TECHNOLOGIES</span></span></div><div class="eyebrow">A MILESTONE WORTH CELEBRATING</div><h1>Certificate of Completion</h1><div class="presented">This certificate is proudly presented to</div><div class="name">${escape(certificate.recipient)}</div><p class="copy">For successfully completing the <span class="track">${escape(certificate.program)}</span> internship program and demonstrating dedication to learning, building, and meaningful collaboration.</p><div class="footer"><div><strong>${escape(organization?.legalName || "Olentra Technologies Pvt. Ltd.")}</strong><small>Internship Program Team</small></div><div class="seal">OLENTRA<br>TECHNOLOGIES<br>VERIFIED</div><div><strong>${escape(formatDate(certificate.issuedOn))}</strong><small>Date of issue</small></div></div><div class="code">Certificate ID: ${escape(certificate.certificateNumber || certificate.id)}</div></main></body></html>`;
}

export default function PortalCertificates() {
  const { ready, my, data } = useInternship();
  const [selected, setSelected] = useState(null);
  const action = useAction();
  if (!ready) return <Loading />;
  const certificates = my.certificates || [];
  async function download(certificate) {
    await action.run(async () => {
      if (certificate.status !== "Issued")
        return { ok: false, error: "This certificate hasn’t been issued yet." };
      const url = URL.createObjectURL(
        new Blob([certificateHtml(certificate, data.organization)], {
          type: "text/html;charset=utf-8",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `olentra-certificate-${certificate.id}.html`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return { ok: true };
    });
  }
  async function print(certificate) {
    await action.run(async () => {
      if (certificate.status !== "Issued")
        return { ok: false, error: "This certificate hasn’t been issued yet." };
      const printWindow = window.open("", "_blank", "width=1100,height=800");
      if (!printWindow)
        return {
          ok: false,
          error: "Allow pop-ups in your browser to print your certificate.",
        };
      printWindow.opener = null;
      printWindow.document.write(
        certificateHtml(certificate, data.organization),
      );
      printWindow.document.close();
      const logo = printWindow.document.querySelector(".brand img");
      if (logo) await logo.decode().catch(() => {});
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
      return { ok: true };
    });
  }
  return (
    <>
      <Heading
        title="My Certificates"
        description="A milestone to be proud of. An achievement to share."
      />
      <ErrorMessage>{action.error}</ErrorMessage>
      <Panel>
        <div className={styles.panelHeader}>
          <h2>Your achievements</h2>
          <span className={styles.muted}>
            {certificates.length}{" "}
            {certificates.length === 1 ? "certificate" : "certificates"}
          </span>
        </div>
        {certificates.length ? (
          <div className={styles.certificateList}>
            {certificates.map((certificate) => (
              <article className={styles.certificateCard} key={certificate.id}>
                <span className={styles.certificateIcon}>
                  <Award size={30} />
                </span>
                <div>
                  <h3>{certificate.program}</h3>
                  <p>{certificate.recipient}</p>
                  <small>
                    {certificate.issuedOn
                      ? `Issued ${formatDate(certificate.issuedOn)}`
                      : "Your certificate is being prepared"}
                  </small>
                  <span className={styles.certificateCode}>
                    {certificate.certificateNumber || certificate.id}
                  </span>
                </div>
                <Status value={certificate.status} />
                <div className={styles.actions}>
                  <Button
                    variant="secondary"
                    disabled={certificate.status !== "Issued"}
                    onClick={() => setSelected(certificate)}
                  >
                    <Eye size={14} />
                    Preview
                  </Button>
                  <Button
                    disabled={certificate.status !== "Issued" || action.busy}
                    onClick={() => download(certificate)}
                  >
                    <Download size={14} />
                    Download
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Award}
            title="Your achievement is in the making"
            description="Complete your assigned work and internship milestones. Your certificate will appear here after the Olentra team issues it."
          />
        )}
      </Panel>
      <Modal
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title="Your internship certificate"
        description="A record of your dedication, curiosity, and growth."
      >
        {selected && (
          <>
            <div className={styles.certificatePreview}>
              <div className={styles.certificateBrand}>
                <CompanyBrand variant="certificate" />
              </div>
              <span className={styles.eyebrow}>CELEBRATING YOUR GROWTH</span>
              <h2>Certificate of Completion</h2>
              <p>This certificate is proudly presented to</p>
              <h3>{selected.recipient}</h3>
              <p>
                For successfully completing the
                <br />
                <strong>{selected.program}</strong> internship program.
              </p>
              <div className={styles.certificatePreviewFooter}>
                <span>
                  {formatDate(selected.issuedOn)}
                  <small>Date of issue</small>
                </span>
                <ShieldCheck size={38} />
                <span>
                  Olentra Technologies<small>Internship Program Team</small>
                </span>
              </div>
              <small>{selected.certificateNumber || selected.id}</small>
            </div>
            <ErrorMessage>{action.error}</ErrorMessage>
            <div className={styles.formActions}>
              <Button
                variant="secondary"
                disabled={action.busy}
                onClick={() => print(selected)}
              >
                <Printer size={14} />
                Print / Save PDF
              </Button>
              <Button disabled={action.busy} onClick={() => download(selected)}>
                <Download size={14} />
                Download certificate
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
