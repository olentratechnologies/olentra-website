"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, LockKeyhole, Save, UserRound } from "lucide-react";
import { useInternship } from "@/components/intern/InternshipProvider";
import {
  Button,
  EmptyState,
  ErrorMessage,
  Heading,
  Loading,
  Notice,
  Panel,
  Skills,
  Status,
  useAction,
} from "./PortalUI";
import styles from "./portal.module.css";
import { GithubConnectionPanel } from "./GithubConnection";

function PasswordInput({ id, label, value, onChange, autoComplete = "current-password", hint }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className={styles.field} htmlFor={id}>
      {label}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <LockKeyhole size={15} style={{ position: "absolute", left: 10, color: "var(--ad-subtle, #6c84aa)", pointerEvents: "none" }} />
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required
          style={{ paddingLeft: 32, paddingRight: 36 }}
        />
        <button
          type="button"
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          onClick={() => setVisible((v) => !v)}
          style={{ position: "absolute", right: 8, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "var(--ad-subtle, #6c84aa)" }}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint && <small>{hint}</small>}
    </label>
  );
}

function ChangePasswordForm() {
  const { commands, notify, my } = useInternship();
  // Accounts opened from the emailed link have no password yet, so there is nothing to confirm.
  const hasPassword = my?.hasPassword !== false;
  const action = useAction();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmNext, setConfirmNext] = useState("");
  const [localError, setLocalError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(event) {
    event.preventDefault();
    setLocalError("");
    setSaved(false);
    if (next.length < 8) {
      setLocalError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirmNext) {
      setLocalError("New passwords do not match.");
      return;
    }
    await action.run(
      () => commands.changePassword({ currentPassword: current, newPassword: next }),
      () => {
        setSaved(true);
        setCurrent("");
        setNext("");
        setConfirmNext("");
        notify(hasPassword ? "Your password has been updated." : "Your password is set. Sign in with your email and password from now on.");
      },
    );
  }

  return (
    <form onSubmit={save} className={styles.sectionGap}>
      <Panel>
        <div className={styles.panelHeader}>
          <h2>Security &amp; password</h2>
          <LockKeyhole size={19} />
        </div>
        <p className={styles.panelDescription}>
          {hasPassword
            ? "Update your password to keep your account secure."
            : "You signed in with an email link. Set a password to sign in without one next time."}
        </p>
        <ErrorMessage>{localError || action.error}</ErrorMessage>
        <fieldset className={styles.fieldset} disabled={action.busy}>
          <div className={styles.formGrid}>
            {hasPassword && (
              <PasswordInput
                id="current-password"
                label="Current password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => { setCurrent(e.target.value); setSaved(false); }}
              />
            )}
            <PasswordInput
              id="new-password"
              label="New password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => { setNext(e.target.value); setSaved(false); }}
              hint="Minimum 8 characters"
            />
            <PasswordInput
              id="confirm-new-password"
              label="Confirm new password"
              autoComplete="new-password"
              value={confirmNext}
              onChange={(e) => { setConfirmNext(e.target.value); setSaved(false); }}
            />
          </div>
        </fieldset>
        <div className={styles.formActions}>
          <Button type="submit" disabled={action.busy} busy={action.busy}>
            {saved ? <Check size={15} /> : <Save size={15} />}
            {saved ? "Password saved" : hasPassword ? "Update password" : "Set password"}
          </Button>
        </div>
      </Panel>
    </form>
  );
}

function ProfileForm({ account, application }) {
  const { commands, notify } = useInternship();
  const [values, setValues] = useState({
    name: account.name || application.name || "",
    phone: application.phone || "",
    college: application.college || "",
    location: application.location || "",
    skills: (application.skills || []).join(", "),
    github: application.github || "",
    linkedin: application.linkedin || "",
    bio: application.bio || "",
  });
  const [saved, setSaved] = useState(false);
  const action = useAction();
  function change(key, value) {
    setSaved(false);
    setValues((current) => ({ ...current, [key]: value }));
  }
  async function save(event) {
    event.preventDefault();
    await action.run(
      () =>
        commands.updateProfile({
          ...values,
          skills: [
            ...new Set(
              values.skills
                .split(",")
                .map((skill) => skill.trim())
                .filter(Boolean),
            ),
          ],
        }),
      () => {
        setSaved(true);
        notify("Your profile has been updated.");
      },
    );
  }
  return (
    <form onSubmit={save} className={styles.profileGrid}>
      <Panel>
        <div className={styles.panelHeader}>
          <h2>Personal information</h2>
          <UserRound size={19} />
        </div>
        <p className={styles.panelDescription}>
          Keep your contact details and learning interests up to date.
        </p>
        <ErrorMessage>{action.error}</ErrorMessage>
        <fieldset className={styles.fieldset} disabled={action.busy}>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              Full name
              <input
                required
                autoComplete="name"
                value={values.name}
                onChange={(event) => change("name", event.target.value)}
              />
            </label>
            <label className={styles.field}>
              Email address
              <input
                readOnly
                type="email"
                autoComplete="email"
                value={account.email || ""}
              />
              <small>Your sign-in email is managed with your account.</small>
            </label>
            <label className={styles.field}>
              Phone
              <input
                type="tel"
                autoComplete="tel"
                value={values.phone}
                onChange={(event) => change("phone", event.target.value)}
              />
            </label>
            <label className={styles.field}>
              Location
              <input
                autoComplete="address-level2"
                value={values.location}
                onChange={(event) => change("location", event.target.value)}
              />
            </label>
            <label className={`${styles.field} ${styles.fullWidth}`}>
              College / institution
              <input
                value={values.college}
                onChange={(event) => change("college", event.target.value)}
              />
            </label>
            <label className={`${styles.field} ${styles.fullWidth}`}>
              Skills
              <input
                value={values.skills}
                onChange={(event) => change("skills", event.target.value)}
                placeholder="Add skills separated by commas"
              />
            </label>
            <label className={styles.field}>
              GitHub
              <input
                type="url"
                placeholder="https://github.com/yourname"
                value={values.github}
                onChange={(event) => change("github", event.target.value)}
              />
            </label>
            <label className={styles.field}>
              LinkedIn
              <input
                type="url"
                placeholder="https://linkedin.com/in/yourname"
                value={values.linkedin}
                onChange={(event) => change("linkedin", event.target.value)}
              />
            </label>
            <label className={`${styles.field} ${styles.fullWidth}`}>
              About me
              <textarea
                rows={4}
                maxLength={1500}
                value={values.bio}
                onChange={(event) => change("bio", event.target.value)}
                placeholder="What do you love building? What would you like to learn?"
              />
            </label>
          </div>
        </fieldset>
        <div className={styles.formActions}>
          <Button type="submit" disabled={action.busy} busy={action.busy}>
            {saved ? <Check size={15} /> : <Save size={15} />}
            {saved ? "Profile saved" : "Save profile"}
          </Button>
        </div>
      </Panel>
      <Panel className={styles.profileSummary}>
        <span className={styles.profilePortrait}>
          {values.name
            .split(" ")
            .slice(0, 2)
            .map((word) => word[0])
            .join("")}
        </span>
        <h2>{values.name}</h2>
        <p>{application.program}</p>
        <Status value={application.status} />
        <div className={styles.profileSummaryDivider} />
        <h3>What I’m learning</h3>
        <Skills
          values={values.skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean)}
        />
        <Notice>
          Your profile is shared with the Olentra team to support your
          internship journey.
        </Notice>
      </Panel>
    </form>
  );
}

export default function PortalProfile() {
  const { ready, account, my } = useInternship();
  if (!ready) return <Loading />;
  return (
    <>
      <Heading
        title="My Profile"
        description="A little about the person behind the next big idea."
      />
      {my.application ? (
        <>
          <ProfileForm
            key={account.id}
            account={account}
            application={my.application}
          />
          <GithubConnectionPanel />
          <ChangePasswordForm key={`${account.id}-pw`} />
        </>
      ) : (
        <Panel>
          <EmptyState
            icon={UserRound}
            title="Your profile will appear here"
            description="Your account needs a linked application before you can edit your internship profile."
          />
        </Panel>
      )}
    </>
  );
}
