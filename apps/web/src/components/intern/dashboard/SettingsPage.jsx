"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Layers, Save, Settings2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useDashboard } from "./DashboardProvider";
import { Button, PageHeader, Panel, Tabs } from "./DashboardUI";
import { isProgramAvailable, normalizeCompensationMode } from "@/lib/intern/program-availability.mjs";
import ui from "./pages.module.css";
import styles from "./settings.module.css";

const compensationOptions = [
  { value: "free", label: "Free / unpaid", description: "Only tracks with no stipend." },
  { value: "paid", label: "Paid", description: "Only tracks that pay a stipend." },
  { value: "both", label: "Both", description: "Accept unpaid and paid tracks." },
];

function Switch({ label, checked, onChange, description, disabled = false }) {
  return <div className={styles.switchRow}><div><strong>{label}</strong>{description && <p>{description}</p>}</div><button type="button" role="switch" aria-label={label} aria-checked={Boolean(checked)} disabled={disabled} className={styles.switch} onClick={() => onChange(!checked)}><span/></button></div>;
}

function TrackSettings({ program, configure, notify }) {
  const [fee, setFee] = useState(program.fee ?? "");
  const [stipend, setStipend] = useState(program.stipend ?? "");
  const [enabled, setEnabled] = useState(Boolean(program.enabled));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setFee(program.fee ?? ""); setStipend(program.stipend ?? ""); setEnabled(Boolean(program.enabled)); }, [program.fee, program.stipend, program.enabled]);
  async function save(event) {
    event.preventDefault();
    if (fee === "" || stipend === "" || !Number.isSafeInteger(Number(fee)) || Number(fee) < 0 || !Number.isSafeInteger(Number(stipend)) || Number(stipend) < 0) { setError("Enter a non-negative whole amount for both fee and stipend."); return; }
    setBusy(true); setError("");
    try {
      const result = await configure({ programId: program.id, fee: Number(fee), stipend: Number(stipend), enabled });
      if (!result.ok) { setError(result.error); return; }
      notify(`${program.name} settings saved.`);
    } finally { setBusy(false); }
  }
  const Icon = program.id === "explorer" ? Sparkles : Zap;
  return <form className={styles.trackCard} data-track={program.id} onSubmit={save}>
    <div className={styles.trackIcon}><Icon size={26}/></div><h3>{program.name}</h3><p>A ₹0 stipend makes this a free / unpaid track. Set a positive stipend for a paid track. Applicant fees are separate.</p>
    <label className={ui.field}>Program fee charged to applicant (₹)<input type="number" min="0" step="1" value={fee} onChange={event => setFee(event.target.value)} required/></label>
    <label className={ui.field}>Monthly stipend paid to intern (₹)<input type="number" min="0" step="1" value={stipend} onChange={event => setStipend(event.target.value)} required/></label>
    <Switch label={`Accept applications for ${program.name}`} checked={enabled} onChange={setEnabled}/>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save track"}</Button>
  </form>;
}

const DEFAULT_RUBRIC = [
  { id: "video", label: "Intro video", weight: 1 },
  { id: "skills", label: "Skills & experience", weight: 1 },
  { id: "communication", label: "Communication", weight: 1 },
];

const RETENTION_OPTIONS = [
  { days: null, label: "Never (keep until erased by hand)" },
  { days: 180, label: "6 months" },
  { days: 365, label: "1 year" },
  { days: 730, label: "2 years" },
];

export default function SettingsPage() {
  const { data, commands, notify, updateSettings } = useDashboard();
  const [tab, setTab] = useState("general");
  const [batch, setBatch] = useState(data.settings.defaultBatch || "");
  const [name, setName] = useState(data.settings.programName || "Olentra Internship Program");
  const [programEnabled, setProgramEnabled] = useState(Boolean(data.settings.programEnabled));
  const [compensationMode, setCompensationMode] = useState(normalizeCompensationMode(data.settings.compensationMode));
  const [applicationAlerts, setApplicationAlerts] = useState(data.settings.applicationAlerts !== false);
  const [rejectionEmails, setRejectionEmails] = useState(data.settings.rejectionEmails === true);
  const [retentionDays, setRetentionDays] = useState(data.settings.retentionDays ?? null);
  const [rubric, setRubric] = useState(() => data.settings.rubric || DEFAULT_RUBRIC);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => { setBatch(data.settings.defaultBatch || ""); setName(data.settings.programName || "Olentra Internship Program"); setProgramEnabled(Boolean(data.settings.programEnabled)); setCompensationMode(normalizeCompensationMode(data.settings.compensationMode)); setApplicationAlerts(data.settings.applicationAlerts !== false); setRejectionEmails(data.settings.rejectionEmails === true); setRetentionDays(data.settings.retentionDays ?? null); setRubric(data.settings.rubric || DEFAULT_RUBRIC); }, [data.settings.rubric, data.settings.retentionDays, data.settings.defaultBatch, data.settings.programName, data.settings.programEnabled, data.settings.compensationMode, data.settings.applicationAlerts, data.settings.rejectionEmails]);
  const availableTracks = data.programs.filter(program => isProgramAvailable(program, { programEnabled: true, compensationMode }));
  async function save(event) {
    event.preventDefault();
    if (tab === "general" && !name.trim()) { setError("Enter a program name."); return; }
    setBusy(true); setError("");
    try {
      const result = await updateSettings(tab === "notifications" ? { applicationAlerts, rejectionEmails } : { programName: name.trim(), defaultBatch: batch.trim(), programEnabled, compensationMode, retentionDays, rubric: rubric.filter(criterion => criterion.label.trim()) });
      if (result !== false) { setSaved(true); notify("Program settings saved."); }
    } finally { setBusy(false); }
  }
  function edit(setter, value) { setter(value); setSaved(false); setError(""); }
  return <div className={ui.page}>
    <PageHeader title="Settings" description="Configure your internship program"/>
    <Tabs label="Settings sections" value={tab} onChange={value => { setTab(value); setSaved(false); setError(""); }} items={[{ id: "general", label: "General" }, { id: "tracks", label: "Tracks" }, { id: "notifications", label: "Notifications" }]}/>
    {tab === "tracks" ? <Panel className={`${styles.settingsPanel} ${styles.settingsForm}`}><div className={styles.sectionHeading}><span><Layers size={19}/></span><div><h2>Internship Tracks</h2><p>Configure each track before accepting applications.</p></div></div><div className={styles.trackCards}>{data.programs.map(program => <TrackSettings key={program.id} program={program} configure={commands.configureProgram} notify={notify}/>)}</div><p className={styles.helper}><ShieldCheck size={15}/> Existing application and intern records remain available when a track is paused. The program must also be enabled in General.</p></Panel> : <form onSubmit={save} className={styles.settingsForm}><Panel className={styles.settingsPanel}>
      {tab === "general" ? <><div className={styles.sectionHeading}><span><Settings2 size={19}/></span><div><h2>Program General Settings</h2><p>Manage the internship program and application intake.</p></div></div><div className={styles.switches}><Switch label="Enable Internship Program" description="Accept applications for tracks that are enabled and configured." checked={programEnabled} onChange={value => edit(setProgramEnabled, value)}/></div>
      <fieldset className={styles.compensationFieldset} aria-describedby="compensation-help compensation-availability">
        <legend>Internship type</legend>
        <p id="compensation-help">Choose which tracks accept applications. Free means no stipend; applicant fees are configured separately in Tracks.</p>
        <div className={styles.compensationOptions}>
          {compensationOptions.map(option => <label key={option.value} className={styles.compensationOption}>
            <input type="radio" name="compensationMode" value={option.value} checked={compensationMode === option.value} onChange={() => edit(setCompensationMode, option.value)}/>
            <span><strong>{option.label}</strong><small>{option.description}</small></span>
          </label>)}
        </div>
        <p id="compensation-availability" className={styles.availability} role="status">{availableTracks.length ? `${availableTracks.length} enabled ${availableTracks.length === 1 ? "track matches" : "tracks match"} this selection.${programEnabled ? "" : " Enable the program to open applications."}` : "No enabled tracks match this selection. Set the stipend and enable a matching track in Tracks."}</p>
      </fieldset>
      <div className={styles.divider}/><h3 className={styles.subheading}>Workspace details</h3><div className={ui.formGrid}><label className={ui.field}>Program name<input value={name} maxLength={100} onChange={event => edit(setName, event.target.value)}/></label><label className={ui.field}>Default batch (optional)<input value={batch} maxLength={40} onChange={event => edit(setBatch, event.target.value)}/></label></div>
      <div className={styles.divider}/><h3 className={styles.subheading}>Scoring criteria</h3>
      <p className={styles.helper}>Reviewers score each applicant 0–5 on these. A higher weight counts for more in the average.</p>
      <ul className={styles.rubricList}>
        {rubric.map((criterion, index) => <li key={criterion.id || index}>
          <input aria-label={`Criterion ${index + 1} name`} value={criterion.label} maxLength={40} onChange={event => edit(setRubric, rubric.map((item, i) => i === index ? { ...item, label: event.target.value } : item))}/>
          <select aria-label={`Criterion ${index + 1} weight`} value={criterion.weight} onChange={event => edit(setRubric, rubric.map((item, i) => i === index ? { ...item, weight: Number(event.target.value) } : item))}>
            {[1, 2, 3, 4, 5].map(weight => <option key={weight} value={weight}>×{weight}</option>)}
          </select>
          <Button variant="ghost" disabled={rubric.length <= 1} onClick={() => edit(setRubric, rubric.filter((_, i) => i !== index))}>Remove</Button>
        </li>)}
      </ul>
      {rubric.length < 8 && <Button variant="secondary" onClick={() => edit(setRubric, [...rubric, { id: "", label: "", weight: 1 }])}>Add criterion</Button>}
      <div className={styles.divider}/><h3 className={styles.subheading}>Applicant data</h3>
      <div className={ui.formGrid}><label className={ui.field}>Delete rejected, declined and withdrawn applicants after
        <select value={retentionDays ?? ""} onChange={event => edit(setRetentionDays, event.target.value ? Number(event.target.value) : null)}>
          {RETENTION_OPTIONS.map(option => <option key={option.label} value={option.days ?? ""}>{option.label}</option>)}
        </select>
      </label></div>
      <p className={styles.helper}><ShieldCheck size={15}/> Off by default. When set, their application, account, files and messages are permanently deleted that long after the final decision, and each deletion is recorded in Staff → Activity.</p></> : <><div className={styles.sectionHeading}><span><Bell size={19}/></span><div><h2>Notification Preferences</h2><p>Choose which applicant and staff updates are sent.</p></div></div><div className={styles.switches}><Switch label="New application alerts" description="Notify the internship team when a new application arrives." checked={applicationAlerts} onChange={value => edit(setApplicationAlerts, value)}/><Switch label="Rejection emails" description="Send a status email when an application is rejected. This is off until you opt in." checked={rejectionEmails} onChange={value => edit(setRejectionEmails, value)}/></div><p className={styles.helper}>Applicant emails are sent after shortlisted, offer, onboarding, and certificate updates. Internship messages and workflow notifications remain available in the app.</p></>}
      {error && <p className={styles.error} role="alert">{error}</p>}<div className={styles.saveRow}><span>{saved ? <><Check size={15}/> All changes saved</> : "Changes apply after saving."}</span><Button type="submit" disabled={busy}><Save size={15}/>{busy ? "Saving…" : "Save Changes"}</Button></div>
    </Panel></form>}
    <div className={styles.resetPanel}><div><h3>Password recovery</h3><p>After verifying an intern’s identity, staff can reset their password from their application record.</p></div></div>
  </div>;
}
