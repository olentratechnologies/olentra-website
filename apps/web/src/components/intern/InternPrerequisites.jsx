import { CalendarCheck, Laptop, MessagesSquare, Rocket, Wifi } from "lucide-react";
import styles from "./intern-sections.module.css";

const ESSENTIALS = [
  { icon: Laptop, title: "Access to a computer", text: "A laptop or desktop computer you can use for development and daily work." },
  { icon: Wifi, title: "Reliable internet", text: "A stable connection for remote collaboration, video calls and online tools." },
  { icon: CalendarCheck, title: "Program commitment", text: "Consistent availability throughout the program, aligned with your selected schedule." },
  { icon: MessagesSquare, title: "Clear communication", text: "Good written and spoken English for working with a remote team." },
  { icon: Rocket, title: "Drive to learn", text: "Willingness to learn, take ownership, and meet deadlines." },
];


/** General requirements for the unified software engineering program. */
export default function InternPrerequisites() {
  return (
    <section className={styles.section} id="internship-prerequisites" aria-labelledby="internship-prerequisites-title">
      <div className={styles.header}>
        <span className={styles.eyebrow}>Prerequisites</span>
        <h2 id="internship-prerequisites-title">What you need to get started</h2>
        <p>No prior industry experience is required. We value curiosity, software fundamentals, and consistent follow-through.</p>
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
    </section>
  );
}
