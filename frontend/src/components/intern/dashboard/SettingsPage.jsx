"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Layers, Save, Settings2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useDashboard } from "./DashboardProvider";
import { Button, PageHeader, Panel, Tabs } from "./DashboardUI";
import ui from "./pages.module.css";
import styles from "./settings.module.css";

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
    <div className={styles.trackIcon}><Icon size={26}/></div><h3>{program.name}</h3><p>Set the actual fee and stipend before opening applications for this track.</p>
    <label className={ui.field}>Fee (₹)<input type="number" min="0" step="1" value={fee} onChange={event => setFee(event.target.value)} required/></label>
    <label className={ui.field}>Stipend (₹)<input type="number" min="0" step="1" value={stipend} onChange={event => setStipend(event.target.value)} required/></label>
    <Switch label={`Accept applications for ${program.name}`} checked={enabled} onChange={setEnabled}/>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save track"}</Button>
  </form>;
}

export default function SettingsPage() {
  const { data, commands, notify, updateSettings } = useDashboard();
  const [tab, setTab] = useState("general");
  const [batch, setBatch] = useState(data.settings.defaultBatch || "");
  const [name, setName] = useState(data.settings.programName || "Olentra Internship Program");
  const [programEnabled, setProgramEnabled] = useState(Boolean(data.settings.programEnabled));
  const [applicationAlerts, setApplicationAlerts] = useState(data.settings.applicationAlerts !== false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => { setBatch(data.settings.defaultBatch || ""); setName(data.settings.programName || "Olentra Internship Program"); setProgramEnabled(Boolean(data.settings.programEnabled)); setApplicationAlerts(data.settings.applicationAlerts !== false); }, [data.settings.defaultBatch, data.settings.programName, data.settings.programEnabled, data.settings.applicationAlerts]);
  async function save(event) {
    event.preventDefault();
    if (tab === "general" && !name.trim()) { setError("Enter a program name."); return; }
    setBusy(true); setError("");
    try {
      const result = await updateSettings(tab === "notifications" ? { applicationAlerts } : { programName: name.trim(), defaultBatch: batch.trim(), programEnabled });
      if (result !== false) { setSaved(true); notify("Program settings saved."); }
    } finally { setBusy(false); }
  }
  function edit(setter, value) { setter(value); setSaved(false); setError(""); }
  return <div className={ui.page}>
    <PageHeader title="Settings" description="Configure your internship program"/>
    <Tabs label="Settings sections" value={tab} onChange={value => { setTab(value); setSaved(false); setError(""); }} items={[{ id: "general", label: "General" }, { id: "tracks", label: "Tracks" }, { id: "notifications", label: "Notifications" }]}/>
    {tab === "tracks" ? <Panel className={`${styles.settingsPanel} ${styles.settingsForm}`}><div className={styles.sectionHeading}><span><Layers size={19}/></span><div><h2>Internship Tracks</h2><p>Configure each track before accepting applications.</p></div></div><div className={styles.trackCards}>{data.programs.map(program => <TrackSettings key={program.id} program={program} configure={commands.configureProgram} notify={notify}/>)}</div><p className={styles.helper}><ShieldCheck size={15}/> Existing application and intern records remain available when a track is paused. The program must also be enabled in General.</p></Panel> : <form onSubmit={save} className={styles.settingsForm}><Panel className={styles.settingsPanel}>
      {tab === "general" ? <><div className={styles.sectionHeading}><span><Settings2 size={19}/></span><div><h2>Program General Settings</h2><p>Manage the internship program and application intake.</p></div></div><div className={styles.switches}><Switch label="Enable Internship Program" description="Accept applications for tracks that are enabled and configured." checked={programEnabled} onChange={value => edit(setProgramEnabled, value)}/></div><div className={styles.divider}/><h3 className={styles.subheading}>Workspace details</h3><div className={ui.formGrid}><label className={ui.field}>Program name<input value={name} maxLength={100} onChange={event => edit(setName, event.target.value)}/></label><label className={ui.field}>Default batch (optional)<input value={batch} maxLength={40} onChange={event => edit(setBatch, event.target.value)}/></label></div></> : <><div className={styles.sectionHeading}><span><Bell size={19}/></span><div><h2>Notification Preferences</h2><p>Choose which in-app updates the internship team receives.</p></div></div><div className={styles.switches}><Switch label="New application alerts" description="Notify the internship team when a new application arrives." checked={applicationAlerts} onChange={value => edit(setApplicationAlerts, value)}/></div><p className={styles.helper}>Email and external integrations are not configured. Internship messages and workflow notifications remain available in the app.</p></>}
      {error && <p className={styles.error} role="alert">{error}</p>}<div className={styles.saveRow}><span>{saved ? <><Check size={15}/> All changes saved</> : "Changes apply after saving."}</span><Button type="submit" disabled={busy}><Save size={15}/>{busy ? "Saving…" : "Save Changes"}</Button></div>
    </Panel></form>}
    <div className={styles.resetPanel}><div><h3>Password recovery</h3><p>After verifying an intern’s identity, staff can reset their password from their application record.</p></div></div>
  </div>;
}
