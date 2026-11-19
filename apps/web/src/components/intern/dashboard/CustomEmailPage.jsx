"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, FileSpreadsheet, Mail, Send, X } from "lucide-react";
import { useInternship } from "@/components/intern/InternshipProvider";
import { useInternQuery } from "../useInternQuery";
import { readEmailRowsFromFile } from "@/lib/intern/email-recipient-import.mjs";
import { LINKEDIN_FOLLOWUP_TEMPLATE, normalizeCustomEmailName, renderCustomEmailGreeting } from "@/data/custom-email-templates.mjs";
import { Button, PageHeader, Panel } from "./DashboardUI";
import QueryStatus from "./QueryStatus";
import styles from "./custom-email.module.css";

const MAX_RECIPIENTS = 500;
// Leave room for the request envelope within the 64 KiB WebSocket limit.
const MAX_CAMPAIGN_BYTES = 64_000;
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const NO_TEMPLATES = [];

function errorText(error, fallback) {
  return typeof error === "string" ? error : error?.message || fallback;
}

function splitAddresses(value) {
  return String(value || "").split(/[\s,;]+/).map(email => email.trim()).filter(Boolean);
}

export default function CustomEmailPage() {
  const { commands } = useInternship();
  const templateQuery = useInternQuery("template.list", {});
  const savedTemplates = templateQuery.data || NO_TEMPLATES;
  const templates = useMemo(() => [
    LINKEDIN_FOLLOWUP_TEMPLATE,
    ...savedTemplates.map(template => ({ ...template, format: "text" })),
  ], [savedTemplates]);
  const [templateId, setTemplateId] = useState(LINKEDIN_FOLLOWUP_TEMPLATE.id);
  const selectedTemplate = templates.find(template => template.id === templateId) || templates[0];
  const usesRecipientGreeting = selectedTemplate?.id === LINKEDIN_FOLLOWUP_TEMPLATE.id;
  const subject = selectedTemplate?.subject || "";
  const [content, setContent] = useState(LINKEDIN_FOLLOWUP_TEMPLATE.body);
  const [manualText, setManualText] = useState("");
  const [importedRecipients, setImportedRecipients] = useState(() => new Map());
  const [importSummary, setImportSummary] = useState("");
  const [importWarning, setImportWarning] = useState("");
  const [importError, setImportError] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [sendError, setSendError] = useState("");
  const [campaignStatus, setCampaignStatus] = useState(null);
  const [checkingLatestCampaign, setCheckingLatestCampaign] = useState(true);
  const campaignSelected = useRef(false);
  const sendInFlight = useRef(false);

  const manualEntries = useMemo(() => splitAddresses(manualText), [manualText]);
  const invalidManual = useMemo(() => manualEntries.filter(email => email.length > 254 || !EMAIL_RE.test(email)), [manualEntries]);
  const validManual = useMemo(() => manualEntries.filter(email => email.length <= 254 && EMAIL_RE.test(email)).map(email => email.toLowerCase()), [manualEntries]);
  const uniqueRecipients = useMemo(() => [...new Set([...validManual, ...importedRecipients.keys()])], [validManual, importedRecipients]);
  const duplicateCount = validManual.length + importedRecipients.size - uniqueRecipients.length;
  const previewName = usesRecipientGreeting ? [...importedRecipients.values()].find(Boolean) : undefined;
  const previewContent = usesRecipientGreeting ? renderCustomEmailGreeting(content, previewName) : content;
  const tooManyRecipients = uniqueRecipients.length > MAX_RECIPIENTS;
  const sendingCampaign = Boolean(campaignStatus && !campaignStatus.complete);
  const sendDisabled = checkingLatestCampaign || sendBusy || importBusy || sendingCampaign || !selectedTemplate || !subject.trim() || !content.trim() || !uniqueRecipients.length || tooManyRecipients || invalidManual.length > 0;

  useEffect(() => {
    let cancelled = false;
    async function restoreLatestCampaign() {
      const result = await commands.getLatestCustomEmailStatus();
      if (cancelled) return;
      if (!campaignSelected.current && result.ok && result.data) {
        campaignSelected.current = true;
        setCampaignStatus(result.data);
      }
      setCheckingLatestCampaign(false);
    }
    void restoreLatestCampaign();
    return () => { cancelled = true; };
  }, [commands]);

  useEffect(() => {
    const campaignId = campaignStatus?.campaignId;
    if (!campaignId || campaignStatus.complete) return undefined;
    let cancelled = false;
    let timer;
    async function refresh() {
      const result = await commands.getCustomEmailStatus(campaignId);
      if (cancelled) return;
      if (result.ok) {
        setCampaignStatus(result.data);
        if (!result.data.complete) timer = setTimeout(refresh, 2200);
      } else {
        setSendError(errorText(result.error, "Could not refresh delivery progress."));
        timer = setTimeout(refresh, 6000);
      }
    }
    timer = setTimeout(refresh, 900);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [campaignStatus?.campaignId, campaignStatus?.complete, commands]);

  async function importFile(event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setImportBusy(true);
    setImportError("");
    setImportWarning("");
    setImportSummary("");
    try {
      const rows = await readEmailRowsFromFile(file);
      const valid = rows.filter(item => item.email.length <= 254 && EMAIL_RE.test(item.email));
      const invalid = rows.filter(item => item.email.length > 254 || !EMAIL_RE.test(item.email));
      if (!valid.length) throw new Error("No valid email addresses were found in column B from row 2 onward.");
      setImportedRecipients(current => {
        const next = new Map(current);
        for (const { email, name } of valid) {
          const address = email.toLowerCase();
          if (!next.get(address)) next.set(address, normalizeCustomEmailName(name));
        }
        return next;
      });
      setImportSummary(`${valid.length} address${valid.length === 1 ? "" : "es"} loaded from ${file.name}.`);
      if (invalid.length) {
        const examples = invalid.slice(0, 3).map(item => `row ${item.row}: ${item.email}`).join(" · ");
        setImportWarning(`${invalid.length} invalid row${invalid.length === 1 ? " was" : "s were"} skipped${examples ? ` (${examples}${invalid.length > 3 ? " · …" : ""})` : ""}.`);
      }
    } catch (error) {
      setImportError(errorText(error, "The file could not be read."));
    } finally {
      setImportBusy(false);
    }
  }

  function chooseTemplate(event) {
    const nextId = event.target.value;
    setTemplateId(nextId);
    const template = templates.find(item => item.id === nextId);
    if (template) setContent(template.body || "");
  }

  function removeRecipient(email) {
    const normalized = email.toLowerCase();
    setManualText(current => splitAddresses(current).filter(value => value.toLowerCase() !== normalized).join("\n"));
    setImportedRecipients(current => {
      const next = new Map(current);
      next.delete(normalized);
      return next;
    });
  }

  async function send(event) {
    event.preventDefault();
    if (sendInFlight.current || sendDisabled) return;
    const payload = {
      recipients: uniqueRecipients.map(email => {
        const name = usesRecipientGreeting ? importedRecipients.get(email) : "";
        return name ? { email, name } : email;
      }),
      subject,
      body: content,
      format: selectedTemplate.format,
    };
    if (new TextEncoder().encode(JSON.stringify(payload)).byteLength > MAX_CAMPAIGN_BYTES) {
      setSendError("Split the recipient list into smaller batches to send this campaign.");
      return;
    }
    sendInFlight.current = true;
    setSendBusy(true);
    setSendError("");
    try {
      const result = await commands.sendCustomEmail(payload);
      if (!result.ok) {
        setSendError(errorText(result.error, "The email campaign could not be queued."));
        return;
      }
      campaignSelected.current = true;
      setCampaignStatus({
        campaignId: result.data.campaignId,
        subject,
        total: result.data.total,
        sent: 0,
        queued: result.data.total,
        failed: 0,
        failedRecipients: [],
        retrying: 0,
        lastError: "",
        createdAt: result.data.createdAt,
        complete: false,
      });
      setManualText("");
      setImportedRecipients(new Map());
      setImportSummary("");
      setImportWarning("");
      setImportError("");
    } finally {
      sendInFlight.current = false;
      setSendBusy(false);
    }
  }

  const progress = campaignStatus?.total ? Math.round(((campaignStatus.sent + campaignStatus.failed) / campaignStatus.total) * 100) : 0;
  const campaignAge = campaignStatus?.createdAt ? Date.now() - new Date(campaignStatus.createdAt).getTime() : 0;
  const waitingForWorker = Boolean(sendingCampaign && campaignStatus.queued > 0 && !campaignStatus.retrying && campaignAge > 15_000);
  const campaignTitle = campaignStatus?.complete
    ? campaignStatus.failed ? "Delivery finished with failures" : "Campaign sent"
    : campaignStatus?.retrying ? "Retrying email delivery"
      : waitingForWorker ? "Delivery worker not responding" : "Email delivery queued";
  const campaignMessage = campaignStatus?.complete
    ? campaignStatus.failed ? `Some recipients could not be reached. ${campaignStatus.lastError || "Failed addresses are listed below."}` : "All recipient emails were accepted for delivery."
    : campaignStatus?.retrying
      ? `A delivery attempt failed and will be retried. ${campaignStatus.lastError || ""}`.trim()
      : waitingForWorker ? "No delivery attempt has been reported. Check that the realtime email outbox worker is running."
        : "The email delivery service will update this status as recipients are processed.";
  const sendHint = checkingLatestCampaign ? "Checking for a queued campaign…"
    : sendingCampaign ? "Wait for the current campaign to finish."
      : uniqueRecipients.length ? `Ready to email ${uniqueRecipients.length} recipient${uniqueRecipients.length === 1 ? "" : "s"}.`
        : "Add recipients to continue.";

  return <div className={styles.page}>
    <PageHeader title="Custom email" description="Choose a template, add recipients, and send individual email copies." />
    <div className={styles.layout}>
      {campaignStatus && <Panel className={styles.statusPanel} aria-live="polite">
        <div className={styles.statusHeading}><div><span className={styles.statusIcon}><Send size={16} /></span><div><h2>{campaignTitle}</h2><p>{campaignStatus.subject}</p></div></div><strong>{progress}%</strong></div>
        <div className={styles.progressTrack} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div>
        <div className={styles.deliveryCounts}><span><b>{campaignStatus.sent}</b> sent</span><span><b>{campaignStatus.queued}</b> queued</span><span><b>{campaignStatus.failed}</b> failed</span></div>
        <p className={waitingForWorker ? styles.warning : campaignStatus.retrying > 0 || campaignStatus.failed > 0 ? styles.error : styles.statusMessage} role={waitingForWorker || campaignStatus.retrying > 0 || campaignStatus.failed > 0 ? "alert" : "status"}>{campaignMessage}</p>
        {campaignStatus.failedRecipients?.length > 0 && <details className={styles.failedList}><summary>View failed addresses</summary><ul>{campaignStatus.failedRecipients.map(email => <li key={email}>{email}</li>)}</ul></details>}
      </Panel>}

      <Panel className={styles.composer}>
        <div className={styles.panelHeading}>
          <span className={styles.headingIcon}><Mail size={18} /></span>
          <div><h2>Compose campaign</h2><p>Recipients receive separate messages, so their addresses stay private.</p></div>
        </div>
        <QueryStatus query={templateQuery} label="email templates" compact />
        <form onSubmit={send} className={styles.form}>
          <label className={styles.field}>
            Email template
            <select value={selectedTemplate?.id || ""} onChange={chooseTemplate} aria-label="Email template" disabled={sendBusy}>
              <option value={LINKEDIN_FOLLOWUP_TEMPLATE.id}>{LINKEDIN_FOLLOWUP_TEMPLATE.name} · supplied template</option>
              {savedTemplates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
          </label>
          {selectedTemplate?.format === "text" && <label className={styles.field}>
            Message
            <textarea className={styles.messageEditor} value={content} onChange={event => setContent(event.target.value)} rows={7} maxLength={5000} readOnly={sendBusy} required />
            <span className={styles.fieldHint}>Changes apply to this campaign only. Review placeholders before sending.</span>
          </label>}

          <section className={styles.recipientBlock} aria-labelledby="recipient-title">
            <div className={styles.recipientHeading}>
              <div><h3 id="recipient-title">Recipients</h3><p>Enter one or more addresses, separated by a comma or a new line.</p></div>
              <span className={styles.count}>{uniqueRecipients.length} / {MAX_RECIPIENTS}</span>
            </div>
            <label className={styles.srOnly} htmlFor="manual-recipients">Email addresses</label>
            <textarea id="manual-recipients" value={manualText} onChange={event => setManualText(event.target.value)} rows={5} placeholder="alex@example.com&#10;sam@example.com" autoComplete="off" readOnly={sendBusy} />
            {uniqueRecipients.length > 0 && <div className={styles.recipientTokens} aria-label="Added recipients">
              {uniqueRecipients.slice(0, 50).map(email => <span className={styles.recipientToken} key={email}>
                <span>{email}</span><button type="button" onClick={() => removeRecipient(email)} aria-label={`Remove ${email}`} disabled={sendBusy}><X size={12} /></button>
              </span>)}
              {uniqueRecipients.length > 50 && <span className={styles.moreRecipients}>+{uniqueRecipients.length - 50} more</span>}
            </div>}
            {invalidManual.length > 0 && <p className={styles.warning} role="alert">Fix or remove invalid address{invalidManual.length === 1 ? "" : "es"}: {invalidManual.slice(0, 3).join(", ")}{invalidManual.length > 3 ? " · …" : ""}</p>}
            {duplicateCount > 0 && <p className={styles.helper}>{duplicateCount} duplicate address{duplicateCount === 1 ? "" : "es"} will be sent once.</p>}
            {tooManyRecipients && <p className={styles.warning} role="alert">Reduce the list to {MAX_RECIPIENTS} unique addresses or fewer.</p>}
          </section>

          <section className={styles.uploadBlock} aria-labelledby="upload-title">
            <div className={styles.uploadIcon}><FileSpreadsheet size={18} /></div>
            <div className={styles.uploadText}>
              <h3 id="upload-title">Import from Excel or CSV</h3>
              <p>Use any headers in row 1. From row 2, put names in column A and email addresses in column B. For Excel, use the first worksheet.{usesRecipientGreeting && " Names personalize the greeting."}</p>
              <label className={styles.uploadButton}>
                {importBusy ? "Reading file…" : "Choose .xlsx or .csv"}
                <input type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={importFile} disabled={importBusy || sendBusy} />
              </label>
            </div>
          </section>
          {importSummary && <p className={styles.success}><Check size={15} />{importSummary}</p>}
          {importWarning && <p className={styles.warning} role="status">{importWarning}</p>}
          {importError && <p className={styles.error} role="alert">{importError}</p>}
          {importedRecipients.size > 0 && <div className={styles.importedList}>
            <span>{importedRecipients.size} imported address{importedRecipients.size === 1 ? "" : "es"}</span>
            <Button variant="ghost" disabled={sendBusy} onClick={() => { setImportedRecipients(new Map()); setImportSummary(""); setImportWarning(""); }}>Clear import <X size={14} /></Button>
          </div>}
          {uniqueRecipients.length > 0 && <details className={styles.recipientPreview}>
            <summary>Review recipient list ({uniqueRecipients.length})</summary>
            <ul>{uniqueRecipients.slice(0, 20).map(email => <li key={email}>{importedRecipients.get(email) ? `${importedRecipients.get(email)} — ${email}` : email}</li>)}</ul>
            {uniqueRecipients.length > 20 && <p>And {uniqueRecipients.length - 20} more address{uniqueRecipients.length - 20 === 1 ? "" : "es"}.</p>}
          </details>}

          {sendError && <p className={styles.error} role="alert">{sendError}</p>}
          <div className={styles.sendRow}>
            <p>{sendHint}</p>
            <Button type="submit" disabled={sendDisabled}><Send size={15} />{sendBusy ? "Queueing…" : sendingCampaign ? campaignStatus.retrying ? "Retrying…" : "Queued" : `Send${uniqueRecipients.length ? ` to ${uniqueRecipients.length}` : " email"}`}</Button>
          </div>
        </form>
      </Panel>

      <Panel className={styles.previewPanel}>
        <div className={styles.previewHeading}><div><span>EMAIL PREVIEW</span><h2>{selectedTemplate?.name || "Select a template"}</h2>{previewName && <p>Preview for {previewName}</p>}</div><small>{selectedTemplate?.format === "html" ? "HTML email" : "Plain text email"}</small></div>
        <div className={styles.subjectPreview}><span>Subject</span><strong>{subject || "Choose a template"}</strong></div>
        {selectedTemplate?.format === "html"
          ? <iframe className={styles.htmlPreview} title={`${selectedTemplate.name} email preview`} sandbox="" referrerPolicy="no-referrer" srcDoc={previewContent} />
          : <pre className={styles.textPreview}>{content || "Choose an email template to preview it."}</pre>}
      </Panel>
    </div>
  </div>;
}
