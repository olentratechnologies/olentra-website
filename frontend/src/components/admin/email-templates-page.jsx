"use client";

import { useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowDownLeft, ArrowUpRight, Check, ChevronRight, Eye, FileText, Info, Layers3, Mail, Monitor, Smartphone, X } from "lucide-react";
import { useAdmin } from "./store";
import { Badge, Button, EmptyState, Field, PageHeader, SearchInput, Select } from "./ui";
import { EMAIL_TEMPLATE_CATALOG, EMAIL_TEMPLATE_PRESETS, EMAIL_TEMPLATE_SELECTION_KEY, renderEmailTemplate } from "@/lib/admin/email-template-catalog.mjs";
import styles from "./email-templates.module.css";
import { EnterpriseEmail } from "./enterprise-email";

const audienceLabel = audience => audience === "team" ? "To Olentra team" : "To users";
const availabilityLabel = status => status === "existing-email" ? "Existing email flow" : "Email not connected";
const presetLabel = presetId => EMAIL_TEMPLATE_PRESETS.find(item => item.id === presetId)?.label || presetId;
const selectedVariant = (type, selections) => type.variants.find(variant => variant.id === selections[type.id]) || type.variants.find(variant => variant.presetId === "professional");

function PreviewDialog({ type, variant, selected, saved, canManage, onSelect, onClose, onRestoreFocus }) {
  const [mode, setMode] = useState("desktop");
  const rendered = renderEmailTemplate(type, variant);
  return <Dialog.Root open onOpenChange={open => { if (!open) onClose(); }}><Dialog.Portal>
    <Dialog.Overlay className="ad-modal-overlay" />
    <Dialog.Content className={styles.dialog} onCloseAutoFocus={event => { event.preventDefault(); onRestoreFocus(); }}>
      <div className={styles.dialogHeader}><div><span className={styles.eyebrow}>TEMPLATE PREVIEW</span><Dialog.Title>{type.title}</Dialog.Title><Dialog.Description>{variant.label} · Fictional sample data. Preview links are inactive.</Dialog.Description></div><Dialog.Close className={styles.close} aria-label="Close template preview"><X size={21} /></Dialog.Close></div>
      <div className={styles.previewToolbar}>
        <div className={styles.previewModes} role="group" aria-label="Preview format">{[{ id: "desktop", label: "Desktop", Icon: Monitor }, { id: "mobile", label: "Mobile", Icon: Smartphone }, { id: "text", label: "Plain text", Icon: FileText }].map(({ id, label, Icon }) => <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)}><Icon size={15} aria-hidden="true" />{label}</button>)}</div>
        <span className={styles.previewAudience}>{audienceLabel(type.audience)}</span>
      </div>
      <div className={styles.envelope}><div><span>From</span><strong>Olentra Technologies</strong></div><div><span>Subject</span><strong>{rendered.subject}</strong></div><div><span>Preview text</span><p>{rendered.preheader}</p></div><div><span>Recipient</span><p>{type.recipient}</p></div></div>
      <div className={`${styles.previewCanvas} ${mode === "mobile" ? styles.mobileCanvas : ""}`}>
        {mode === "text" ? <pre className={styles.plainText}>{rendered.text}</pre> : <div className={styles.previewPaper}><EnterpriseEmail type={type} variant={variant} /></div>}
      </div>
      <div className={styles.dialogFooter}><p>{selected ? saved ? "Saved choice for this email type." : "Current choice for this email type." : "Choose this preset as your default for this email type."} <span>No email will be sent.</span></p><Button variant={selected ? "default" : "primary"} icon={selected ? Check : undefined} disabled={!canManage || selected} onClick={() => onSelect(type, variant)}>{selected ? "Selected template" : "Use this template"}</Button></div>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}

export function EmailTemplatesPage() {
  const { db, command, can, notify, persisted } = useAdmin();
  const catalog = db.reference.governance.emailTemplates || EMAIL_TEMPLATE_CATALOG;
  const selections = db.datasets[EMAIL_TEMPLATE_SELECTION_KEY] || {};
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [audience, setAudience] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [activeId, setActiveId] = useState("account.registered");
  const [preview, setPreview] = useState(null);
  const previewOpener = useRef(null);
  const [feedback, setFeedback] = useState("");
  const canManage = can("Email Templates", "manage");
  const categories = useMemo(() => [...new Set(catalog.map(type => type.category))], [catalog]);
  const filtered = useMemo(() => catalog.filter(type =>
    (category === "all" || type.category === category) &&
    (audience === "all" || type.audience === audience) &&
    (availability === "all" || type.deliveryStatus === availability) &&
    `${type.title} ${type.category} ${type.trigger} ${type.recipient}`.toLowerCase().includes(query.trim().toLowerCase())
  ), [catalog, category, audience, availability, query]);
  const activeType = filtered.find(type => type.id === activeId) || filtered[0];
  const activeVariant = activeType ? selectedVariant(activeType, selections) : null;
  const previewType = preview && catalog.find(type => type.id === preview.typeId);
  const previewVariant = previewType?.variants.find(variant => variant.id === preview.variantId);
  const openPreview = (type, variant, opener) => { previewOpener.current = opener; setPreview({ typeId: type.id, variantId: variant.id }); };

  function chooseTemplate(type, variant) {
    const result = command("emailTemplate.select", { typeId: type.id, variantId: variant.id });
    if (!result.ok) { setFeedback(result.error); return; }
    const message = result.persisted === false
      ? "Template selected for this session only. Browser storage is unavailable; export your workspace to keep this choice."
      : `${variant.label} saved for ${type.title.toLowerCase()}.`;
    setFeedback(message);
    notify(message);
  }

  function clearFilters() { setQuery(""); setCategory("all"); setAudience("all"); setAvailability("all"); }

  return <div className={styles.page}>
    <PageHeader title="Email Templates" eyebrow="COMMUNICATIONS" description="Branded correspondence for your customers, candidates and company. Set a consistent standard for every interaction." actions={<span className={styles.workspacePill}><Layers3 size={14} aria-hidden="true" />Workspace-wide defaults</span>} />
    <div className={styles.summary}>
      <div><span className={styles.summaryIcon}><Mail size={20} aria-hidden="true" /></span><strong>{catalog.length}</strong><span>Email types<small>Across users and your team</small></span></div>
      <div><span className={styles.summaryIcon}><Layers3 size={20} aria-hidden="true" /></span><strong>{catalog.reduce((total, type) => total + type.variants.length, 0)}</strong><span>Template variants<small>Corporate, signature and executive formats</small></span></div>
      <div><span className={styles.summaryIcon}><Check size={20} aria-hidden="true" /></span><strong>{Object.keys(selections).length}</strong><span>Personal selections<small>Professional is the starting default</small></span></div>
    </div>
    <div className={styles.notice}><Info size={18} aria-hidden="true" /><p>Selections are saved in this browser. Email delivery is not connected to these selections.</p></div>
    <div className={styles.filters}>
      <Field label="Find an email type"><SearchInput value={query} onChange={setQuery} placeholder="Search registration, enquiry, offer…" /></Field>
      <Field label="Category"><Select value={category} onChange={event => setCategory(event.target.value)} options={[{ value: "all", label: "All categories" }, ...categories.map(value => ({ value, label: value }))]} /></Field>
      <Field label="Recipient"><Select value={audience} onChange={event => setAudience(event.target.value)} options={[{ value: "all", label: "All recipients" }, { value: "users", label: "To users" }, { value: "team", label: "To Olentra team" }]} /></Field>
      <Field label="Current email availability"><Select value={availability} onChange={event => setAvailability(event.target.value)} options={[{ value: "all", label: "All email types" }, { value: "existing-email", label: "Existing email flow" }, { value: "not-connected", label: "Email not connected" }]} /></Field>
    </div>
    <div className={styles.resultsBar}><p aria-live="polite">Showing <strong>{filtered.length}</strong> of {catalog.length} email types</p>{(query || category !== "all" || audience !== "all" || availability !== "all") && <button type="button" onClick={clearFilters}>Clear filters</button>}<span>Selections apply across all environments and regions.</span></div>
    {activeType ? <div className={styles.workspace}>
      <nav className={styles.catalog} aria-label="Email types"><div className={styles.catalogHeading}><h2>Browse templates</h2><span>{filtered.length}</span></div><div className={styles.typeList}>
        {categories.map(group => {
          const types = filtered.filter(type => type.category === group);
          return types.length ? <div key={group} className={styles.typeGroup}><h3>{group}</h3>{types.map(type => {
            const Icon = type.audience === "team" ? ArrowDownLeft : ArrowUpRight;
            return <button key={type.id} type="button" className={`${styles.typeButton} ${activeType.id === type.id ? styles.activeType : ""}`} aria-current={activeType.id === type.id ? "true" : undefined} onClick={() => setActiveId(type.id)}><Icon size={16} aria-hidden="true" /><span><strong>{type.title}</strong><small>{audienceLabel(type.audience)}</small></span>{Object.hasOwn(selections, type.id) ? <Check className={styles.savedCheck} size={14} aria-label="Custom selection" /> : <ChevronRight size={14} aria-hidden="true" />}</button>;
          })}</div> : null;
        })}
      </div></nav>
      <section className={styles.detail} aria-labelledby="email-type-title">
        <div className={styles.detailHeader}><div className={styles.detailBadges}><Badge tone="blue">{activeType.category}</Badge><Badge>{audienceLabel(activeType.audience)}</Badge><Badge tone={activeType.deliveryStatus === "existing-email" ? "success" : "muted"}>{availabilityLabel(activeType.deliveryStatus)}</Badge></div><h2 id="email-type-title">{activeType.title}</h2><p>{activeType.trigger}</p><div className={styles.recipient}><Mail size={14} aria-hidden="true" /><span>Recipient: <strong>{activeType.recipient}</strong></span></div></div>
        <div className={styles.choiceHeader}><div><h3>Choose a communication style</h3><p>Three distinct layouts, tailored to this event.</p></div><span className={styles.choiceStatus}><Check size={13} aria-hidden="true" />{Object.hasOwn(selections, activeType.id) ? persisted ? "Choice saved" : "Selected · not saved" : "Professional by default"}</span></div>
        <div className={styles.cards}>{activeType.variants.map(variant => {
          const selected = variant.id === activeVariant?.id;
          const rendered = renderEmailTemplate(activeType, variant);
          return <article key={variant.id} className={`${styles.card} ${selected ? styles.selectedCard : ""}`}>
            <button type="button" className={styles.thumbnail} onClick={event => openPreview(activeType, variant, event.currentTarget)} aria-label={`Preview ${variant.label} for ${activeType.title}`}><div aria-hidden="true"><EnterpriseEmail type={activeType} variant={variant} compact /></div><span className={styles.thumbnailHint}><Eye size={14} />Explore this design</span></button>
            <div className={styles.cardBody}><span className={styles.designLabel}>{({professional:"01 / CORPORATE STANDARD",warm:"02 / SIGNATURE LETTER",minimal:"03 / EXECUTIVE MEMO"})[variant.presetId]}</span><div className={styles.cardTitle}><h4>{presetLabel(variant.presetId)}</h4>{selected && <Check size={17} aria-label="Selected template" />}</div><p className={styles.presetDescription}>{EMAIL_TEMPLATE_PRESETS.find(preset => preset.id === variant.presetId)?.description}</p><div className={styles.subject}><span>SUBJECT</span><p>{rendered.subject}</p></div><div className={styles.cardActions}><Button icon={Eye} onClick={event => openPreview(activeType, variant, event.currentTarget)} aria-label={`Open ${variant.label} preview`}>Preview</Button><Button variant={selected ? "default" : "primary"} icon={selected ? Check : undefined} disabled={!canManage || selected} onClick={() => chooseTemplate(activeType, variant)}>{selected ? "Selected" : "Use this template"}</Button></div></div>
          </article>;
        })}</div>
        {!canManage && <p className={styles.readOnly}>You have preview access. An administrator can grant permission to change template selections.</p>}
        <details className={styles.variables}><summary>Available placeholders <span>{activeType.variables.length}</span></summary><p>These values personalize the message when email delivery is connected. Previews use fictional examples.</p><div>{activeType.variables.map(variable => <code key={variable}>{`{{${variable}}}`}</code>)}</div></details>
        <p className={styles.deliveryNote}>{activeType.deliveryStatus === "existing-email" ? "This workflow already sends email using its current template. Your selection here is saved separately for future integration." : "This template is ready to preview. Email delivery for this workflow is not connected."}</p>
      </section>
    </div> : <div className={styles.empty}><EmptyState title="No matching email types" description="Try a different search or clear your filters to browse all templates." action={<Button onClick={clearFilters}>Clear filters</Button>} /></div>}
    <p className={styles.feedback} role="status">{feedback}</p>
    {previewType && previewVariant && <PreviewDialog key={previewVariant.id} type={previewType} variant={previewVariant} selected={selectedVariant(previewType, selections)?.id === previewVariant.id} saved={Object.hasOwn(selections, previewType.id) && persisted} canManage={canManage} onSelect={chooseTemplate} onClose={() => setPreview(null)} onRestoreFocus={() => { if (previewOpener.current?.isConnected) previewOpener.current.focus({ preventScroll: true }); }} />}
  </div>;
}
