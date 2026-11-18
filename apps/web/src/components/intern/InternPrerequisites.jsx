import { CalendarCheck, Laptop, MessagesSquare, Rocket, Wifi } from "lucide-react";
import { INTERN_ROLES } from "@/lib/intern/opportunities.mjs";
import styles from "./intern-sections.module.css";

const ESSENTIALS = [
  { icon: Laptop, title: "Access to a computer", text: "A laptop or desktop computer you can use for development and daily work." },
  { icon: Wifi, title: "Reliable internet", text: "A stable connection for remote collaboration, video calls and online tools." },
  { icon: CalendarCheck, title: "Program commitment", text: "Consistent availability throughout the program, aligned with your selected schedule." },
  { icon: MessagesSquare, title: "Clear communication", text: "Good written and spoken English for working with a remote team." },
  { icon: Rocket, title: "Drive to learn", text: "Willingness to learn, take ownership, and meet deadlines." },
];


/** "Prerequisites" section: what every intern needs, then helpful skills per role. */
export default function InternPrerequisites({ roles = INTERN_ROLES }) {
  return (
    <section className={styles.section} id="internship-prerequisites" aria-labelledby="internship-prerequisites-title">
      <div className={styles.header}>
        <span className={styles.eyebrow}>Prerequisites</span>
        <h2 id="internship-prerequisites-title">What you need to get started</h2>
        <p>No prior industry experience is required. Here is what every intern needs, plus the skills that help in each role.</p>
      </div>

      <h3 className={styles.subheading}>Essential requirements</h3>
      <ul className={styles.essentials} role="list">
        {ESSENTIALS.map(({ icon: Icon, title, text }) => (
          <li key={title} className={styles.essential}>
            <span className={styles.essentialIcon} aria-hidden="true"><Icon size={20} strokeWidth={1.9} /></span>
            <strong>{title}</strong>
            <span>{text}</span>
          </li>
        ))}
      </ul>

      <h3 className={styles.subheading}>Helpful for your role <small>Optional skills</small></h3>
      <div className={styles.roleSkills}>
        {roles.map((entry) => (
          <div key={entry.tag} className={styles.roleSkill} data-role={entry.tag.toLowerCase()}>
            <span className={styles.roleTag}>{entry.tag}</span>
            <strong>{entry.short}</strong>
            <ul role="list">
              {entry.skills.map((skill) => <li key={skill}>{skill}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
