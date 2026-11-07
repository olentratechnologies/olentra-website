"use client";

import { useState } from "react";
import { Check, Save, UserRound } from "lucide-react";
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
        <ProfileForm
          key={account.id}
          account={account}
          application={my.application}
        />
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
