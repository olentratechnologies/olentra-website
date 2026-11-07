"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  ChevronRight,
  Github,
  HardDrive,
  Layers,
  Mail,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useDashboard } from "./DashboardProvider";
import { Button, Modal, PageHeader, Panel, Tabs } from "./DashboardUI";
import ui from "./pages.module.css";
import styles from "./settings.module.css";

function Switch({ label, checked, onChange, description, disabled }) {
  return (
    <div className={styles.switchRow}>
      <div>
        <strong>{label}</strong>
        {description && <p>{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={Boolean(checked)}
        disabled={disabled}
        className={styles.switch}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { data, ready, updateSettings, resetDemo, notify } = useDashboard();
  const [tab, setTab] = useState("general");
  const [form, setForm] = useState(data.settings);
  const [profile, setProfile] = useState(data.user);
  const [resetOpen, setResetOpen] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const settingsSnapshot = JSON.stringify(data.settings);
  const profileSnapshot = JSON.stringify(data.user);
  useEffect(() => {
    if (ready) {
      setForm(JSON.parse(settingsSnapshot));
      setProfile(JSON.parse(profileSnapshot));
    }
  }, [ready, settingsSnapshot, profileSnapshot]);
  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setError("");
  };
  async function save(event) {
    event.preventDefault();
    if (
      !String(form.programName || "").trim() ||
      !String(form.defaultBatch || "").trim() ||
      !profile.name.trim()
    ) {
      setError("Enter a program name, default batch, and administrator name.");
      return;
    }
    const amount = Number(form.maxStipend);
    if (
      form.maxStipend === "" ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      amount > 1000000 ||
      !Number.isInteger(amount)
    ) {
      setError("Enter a whole stipend amount between ₹0 and ₹10,00,000.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      setError("Enter a valid administrator email address.");
      return;
    }
    const name = profile.name.trim();
    const result = await updateSettings({
      ...form,
      programName: form.programName.trim(),
      defaultBatch: form.defaultBatch.trim(),
      maxStipend: amount,
      profile: {
        ...profile,
        name,
        firstName: name.split(" ")[0],
        initials: name
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
          .toUpperCase(),
      },
    });
    if (result === false) return;
    setSaved(true);
    setError("");
    notify("Program settings saved in this browser.");
  }
  const toggle = (key, label, description) => (
    <Switch
      key={key}
      label={label}
      description={description}
      checked={form[key]}
      onChange={(value) => update(key, value)}
    />
  );

  return (
    <div className={ui.page}>
      <PageHeader
        title="Settings"
        description="Configure your internship program"
      />
      <Tabs
        label="Settings sections"
        value={tab}
        onChange={setTab}
        items={[
          { id: "general", label: "General" },
          { id: "tracks", label: "Tracks" },
          { id: "notifications", label: "Notifications" },
          { id: "integrations", label: "Integrations" },
        ]}
      />
      <form onSubmit={save} noValidate className={styles.settingsForm}>
        <Panel className={styles.settingsPanel}>
          {tab === "general" && (
            <>
              <div className={styles.sectionHeading}>
                <span>
                  <Settings2 size={19} />
                </span>
                <div>
                  <h2>Program General Settings</h2>
                  <p>A few essentials for your next generation of builders.</p>
                </div>
              </div>
              <div className={styles.switches}>
                {toggle("programEnabled", "Enable Internship Program")}
                {toggle("explorerEnabled", "Allow Free Internship (Explorer)")}
                {toggle(
                  "innovatorEnabled",
                  "Allow Paid Internship (Innovator)",
                )}
              </div>
              <div className={styles.stipendRow}>
                <label htmlFor="max-stipend">
                  Max Stipend (₹)
                  <span>
                    The maximum monthly stipend for the Innovator track.
                  </span>
                </label>
                <div>
                  <span>₹</span>
                  <input
                    id="max-stipend"
                    type="number"
                    min="0"
                    max="1000000"
                    step="1"
                    inputMode="numeric"
                    value={form.maxStipend}
                    onChange={(event) =>
                      update("maxStipend", event.target.value)
                    }
                  />
                </div>
              </div>
              <div className={styles.divider} />
              <h3 className={styles.subheading}>Workspace details</h3>
              <div className={ui.formGrid}>
                <label className={ui.field}>
                  Program name
                  <input
                    value={form.programName || ""}
                    maxLength={100}
                    onChange={(event) =>
                      update("programName", event.target.value)
                    }
                  />
                </label>
                <label className={ui.field}>
                  Default batch
                  <input
                    value={form.defaultBatch || ""}
                    maxLength={40}
                    onChange={(event) =>
                      update("defaultBatch", event.target.value)
                    }
                  />
                </label>
                <label className={ui.field}>
                  Administrator name
                  <input
                    value={profile.name}
                    autoComplete="name"
                    maxLength={80}
                    onChange={(event) => {
                      setProfile({ ...profile, name: event.target.value });
                      setSaved(false);
                    }}
                  />
                </label>
                <label className={ui.field}>
                  Administrator email
                  <input
                    value={profile.email}
                    type="email"
                    autoComplete="email"
                    maxLength={120}
                    onChange={(event) => {
                      setProfile({ ...profile, email: event.target.value });
                      setSaved(false);
                    }}
                  />
                </label>
              </div>
            </>
          )}
          {tab === "tracks" && (
            <>
              <div className={styles.sectionHeading}>
                <span>
                  <Layers size={19} />
                </span>
                <div>
                  <h2>Internship Tracks</h2>
                  <p>Two paths. One community of curious builders.</p>
                </div>
              </div>
              <div className={styles.trackCards}>
                {data.programs.map((program) => (
                  <article
                    key={program.id}
                    className={styles.trackCard}
                    data-track={program.id}
                  >
                    <div className={styles.trackIcon}>
                      {program.id === "explorer" ? (
                        <Sparkles size={26} />
                      ) : (
                        <Zap size={26} />
                      )}
                    </div>
                    <h3>{program.name}</h3>
                    <span>
                      {program.id === "explorer"
                        ? "Free internship"
                        : `Paid internship · up to ₹${Number(form.maxStipend || 0).toLocaleString("en-IN")}`}
                    </span>
                    <p>
                      {program.id === "explorer"
                        ? "A foundation in technology through structured learning, mentorship, and hands-on projects."
                        : "Build real products, take ownership, and grow alongside our engineering team."}
                    </p>
                    <Switch
                      label={`Enable ${program.name}`}
                      checked={form[`${program.id}Enabled`]}
                      onChange={(value) =>
                        update(`${program.id}Enabled`, value)
                      }
                    />
                  </article>
                ))}
              </div>
              <p className={styles.helper}>
                <ShieldCheck size={15} /> Existing application and intern
                records remain available when a track is paused.
              </p>
            </>
          )}
          {tab === "notifications" && (
            <>
              <div className={styles.sectionHeading}>
                <span>
                  <Bell size={19} />
                </span>
                <div>
                  <h2>Notification Preferences</h2>
                  <p>Stay close to the updates that matter to your program.</p>
                </div>
              </div>
              <div className={styles.switches}>
                {toggle(
                  "emailNotifications",
                  "Email notifications",
                  "Keep email updates enabled for this demo workspace.",
                )}
                {toggle(
                  "applicationAlerts",
                  "New application alerts",
                  "Show alerts when new applications arrive.",
                )}
                {toggle(
                  "weeklyDigest",
                  "Weekly program digest",
                  "Include applications, intern progress, and project updates.",
                )}
                {toggle(
                  "reviewReminder",
                  "Application review reminders",
                  "Highlight candidates waiting for a review.",
                )}
              </div>
              <p className={styles.helper}>
                <Mail size={15} /> Preferences are saved locally for this demo.
              </p>
            </>
          )}
          {tab === "integrations" && (
            <>
              <div className={styles.sectionHeading}>
                <span>
                  <Zap size={19} />
                </span>
                <div>
                  <h2>Workspace Integrations</h2>
                  <p>
                    Preview the tools that bring your internship program
                    together.
                  </p>
                </div>
              </div>
              <div className={styles.integrations}>
                {[
                  {
                    id: "github",
                    name: "GitHub",
                    description:
                      "Project repositories and contribution updates",
                    Icon: Github,
                  },
                  {
                    id: "slack",
                    name: "Slack",
                    description: "Team conversations and internship updates",
                    Icon: Layers,
                  },
                  {
                    id: "googleDrive",
                    name: "Google Drive",
                    description: "Resumes, shared resources, and certificates",
                    Icon: HardDrive,
                  },
                ].map(({ id, name, description, Icon }) => (
                  <div className={styles.integration} key={id}>
                    <span className={styles.integrationIcon}>
                      <Icon size={23} />
                    </span>
                    <div>
                      <strong>{name}</strong>
                      <p>{description}</p>
                      <small>
                        {form.integrations?.[id]
                          ? "Enabled in demo"
                          : "Not connected"}
                      </small>
                    </div>
                    <Button
                      variant={
                        form.integrations?.[id] ? "secondary" : "primary"
                      }
                      onClick={() => {
                        update("integrations", {
                          ...form.integrations,
                          [id]: !form.integrations?.[id],
                        });
                      }}
                    >
                      {form.integrations?.[id]
                        ? "Disable preview"
                        : "Enable preview"}
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                ))}
              </div>
              <p className={styles.helper}>
                Integration states are for preview. They do not connect external
                accounts.
              </p>
            </>
          )}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <div className={styles.saveRow}>
            <span>
              {saved ? (
                <>
                  <Check size={15} /> All changes saved
                </>
              ) : (
                "Changes are saved to this browser."
              )}
            </span>
            <Button type="submit">
              <Save size={15} />
              Save Changes
            </Button>
          </div>
        </Panel>
      </form>
      <div className={styles.resetPanel}>
        <div>
          <h3>Start with a clean workspace</h3>
          <p>Restore the original sample data, settings, and activity.</p>
        </div>
        <Button variant="ghost" onClick={() => setResetOpen(true)}>
          <RotateCcw size={14} />
          Reset demo data
        </Button>
      </div>
      <Modal
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset demo data?"
        description="Your saved demo edits will be replaced with the original JSON fixtures. This only affects this internship demo."
      >
        <div className={ui.formActions}>
          <Button variant="secondary" onClick={() => setResetOpen(false)}>
            Keep my changes
          </Button>
          <Button
            onClick={() => {
              resetDemo();
              setResetOpen(false);
              setSaved(false);
            }}
          >
            Reset demo data
          </Button>
        </div>
      </Modal>
    </div>
  );
}
