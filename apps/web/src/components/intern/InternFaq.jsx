"use client";

import { useEffect, useId, useState } from "react";
import { Mail, Plus } from "lucide-react";
import JsonLd from "@/components/JsonLd";
import { deadlineTime, formatDeadline } from "@/lib/intern/application-deadline.mjs";
import styles from "./intern-faq.module.css";

const formatMoney = (amount) => `₹${amount.toLocaleString("en-IN")}`;

/** "Software Engineer Intern is unpaid" / "Software Engineer Intern with stipend". */
function stipendAnswer(tracks) {
  const priced = tracks.filter((track) => Number.isSafeInteger(track.stipend));
  if (!priced.length) return "Stipend details for the program will be announced with the next intake.";
  const parts = priced.map((track) => (track.stipend > 0 ? `${track.name} pays a stipend of ${formatMoney(track.stipend)} a month` : `${track.name} is unpaid and learning-focused`));
  const allUnpaid = priced.every((track) => track.stipend === 0);
  return `${parts.join(", while ")}. ${allUnpaid ? "The program includes practical project experience, mentorship, and a certificate on completion." : "The program includes real project experience, mentor guidance and a certificate on completion."}`;
}

function feeAnswer(tracks) {
  const charged = tracks.filter((track) => Number.isSafeInteger(track.fee) && track.fee > 0);
  if (!charged.length) return "No. There is no application or program fee. Olentra will never ask you to pay to apply, to take part or to receive your certificate.";
  return `There is no fee to apply. ${charged.map((track) => `${track.name} has a program fee of ${formatMoney(track.fee)}`).join(" and ")}, shown on the program card before you apply.`;
}

function buildQuestions({ duration, tracks }) {
  return [
    {
      id: "duration",
      question: "How long is the internship?",
      answer: `Each internship runs for ${duration}. It combines structured learning, regular mentor check-ins and a real project you complete by the end.`,
    },
    {
      id: "remote",
      question: "Is the internship remote?",
      answer: "Yes. Every Olentra internship is fully remote, so you can join from anywhere with a laptop and a reliable internet connection.",
    },
    {
      id: "schedule",
      question: "What scheduling options are available?",
      answer: "The program offers both part-time and full-time options to accommodate academic and professional commitments. Select a schedule that allows you to participate consistently throughout the program.",
    },
    {
      id: "eligibility",
      question: "Who can apply, and what are the prerequisites?",
      answer: "Students, recent graduates and early-career learners can apply. Prior industry experience is not required. You need your own laptop, a reliable internet connection, availability for the full program and good communication skills. Web fundamentals, JavaScript or Python, and familiarity with APIs are helpful but optional.",
    },
    {
      id: "stipend",
      question: "Is the internship paid?",
      answer: stipendAnswer(tracks),
    },
    {
      id: "fee",
      question: "Is there a fee to apply or take part?",
      answer: feeAnswer(tracks),
    },
    {
      id: "certificate",
      question: "Will I receive a certificate?",
      answer: "Yes. Interns who complete the program receive a free certificate with a unique number, which anyone, including future employers, can verify on the Olentra website.",
    },
    {
      id: "work",
      question: "What will I work on?",
      answer: "You will build software products across frontend and backend development, integrate AI APIs and language models, and explore agents, chatbots and workflow automation. Projects use tools such as Claude, Codex and Gemini, with mentor guidance and practical work for your portfolio.",
    },
    {
      id: "apply",
      question: "How do I apply?",
      answer: "Apply to the Software Engineer Intern program and select a part-time or full-time schedule. Complete the application form with your resume and LinkedIn profile. An introduction video is optional and helps us get to know you.",
    },
    {
      id: "process",
      question: "What happens after I apply?",
      answer: "You receive an email with a secure link to your candidate portal, where you can follow your application at every stage. Our team checks eligibility and assesses your software fundamentals, experience, problem-solving, and interest in AI-powered products. There is no interview. Selected candidates receive an offer, followed by onboarding.",
    },
    {
      id: "deadline",
      question: "Is there an application deadline?",
      answer: null, // filled in on the client, in the visitor's own time zone
    },
    {
      id: "multiple",
      question: "Can I submit more than one application?",
      answer: "You can submit one application per email address for each intake. You can follow it, and any next steps, from your candidate portal.",
    },
  ];
}

function deadlineAnswer(deadline) {
  const time = deadlineTime(deadline);
  if (time === null) return "No closing date has been announced for the current intake yet. We recommend applying early.";
  if (time <= Date.now()) return `Applications for this intake closed on ${formatDeadline(time)}. Follow Olentra for the next intake.`;
  return `Yes. Applications for this intake close on ${formatDeadline(time)} (shown in your time zone). Applications can't be accepted after that time.`;
}

function FaqItem({ item, index, open, onToggle }) {
  const baseId = useId();
  const buttonId = `${baseId}-q`, panelId = `${baseId}-a`;
  return (
    <li className={styles.item} data-open={open || undefined}>
      <h3 className={styles.itemHeading}>
        <button type="button" id={buttonId} className={styles.trigger} aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
          <span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <span className={styles.question}>{item.question}</span>
          <span className={styles.icon} aria-hidden="true"><Plus size={16} strokeWidth={2.25} /></span>
        </button>
      </h3>
      <div id={panelId} role="region" aria-labelledby={buttonId} className={styles.panel} inert={!open || undefined}>
        <div className={styles.panelInner}>
          <p>{item.answer}</p>
        </div>
      </div>
    </li>
  );
}

/** Frequently asked questions for the careers page, with answers drawn from the live program settings. */
export default function InternFaq({ duration, tracks, deadline }) {
  const [openId, setOpenId] = useState("duration");
  const [deadlineText, setDeadlineText] = useState("");
  useEffect(() => { setDeadlineText(deadlineAnswer(deadline)); }, [deadline]);

  const questions = buildQuestions({ duration, tracks }).map((item) => (item.id === "deadline" ? { ...item, answer: deadlineText || "Check the deadline timer on this page for the current closing date." } : item));
  // Search engines get the answers that don't depend on the visitor's clock.
  const structured = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.filter((item) => item.id !== "deadline").map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })),
  };

  return (
    <section className={styles.faq} id="internship-faq" aria-labelledby="internship-faq-title">
      <JsonLd data={structured} />
      <div className={styles.intro}>
        <span className={styles.eyebrow}>FAQ</span>
        <h2 id="internship-faq-title">Frequently asked questions</h2>
        <p>Find details about the program, eligibility, and application process.</p>
        <div className={styles.contact}>
          <span className={styles.contactIcon} aria-hidden="true"><Mail size={18} /></span>
          <div>
            <strong>Still have a question?</strong>
            <span>Write to our team and we’ll be glad to help.</span>
          </div>
          <a href="mailto:intern.support@olentratechnologies.com">intern.support@<wbr />olentratechnologies.com</a>
        </div>
      </div>
      <ul className={styles.list} role="list">
        {questions.map((item, index) => (
          <FaqItem key={item.id} item={item} index={index} open={openId === item.id} onToggle={() => setOpenId((current) => (current === item.id ? null : item.id))} />
        ))}
      </ul>
    </section>
  );
}
