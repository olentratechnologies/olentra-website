"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLenis } from "lenis/react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  FileText,
  Upload,
  X,
} from "lucide-react";
import ApplicationsChart from "./ApplicationsChart";
import ApplicationLaunch from "./ApplicationLaunch";
import LaunchAnimation from "./LaunchAnimation";
import { useInternship } from "./InternshipProvider";
import { makeSampleResume, saveAttachment } from "@/lib/intern-attachments.mjs";
import styles from "./intern.module.css";
import { useSiteFeatures } from "@/components/site-features";

const ART_SOURCE = "/images/intern/reference-art.png";
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

// Source coordinates retain the supplied artwork without baking UI into an image.
const artwork = {
  hero: [595, 60, 570, 310],
  book: [391, 488, 197, 176],
  trophy: [946, 488, 182, 176],
  users: [108, 830, 39, 38],
  rocket: [238, 830, 39, 38],
  star: [367, 830, 39, 38],
  benefitRocket: [99, 1054, 38, 39],
  benefitUsers: [215, 1054, 38, 39],
  chip: [329, 1054, 38, 39],
  growth: [448, 1054, 39, 39],
  bulb: [885, 817, 56, 60],
  plane: [579, 1003, 39, 37],
  diamond: [65, 986, 27, 27],
  bars: [65, 755, 27, 29],
};

const tracks = [
  {
    id: "explorer",
    type: "Type A",
    name: "Tech Explorer",
    subtitle: "Free Internship",
    description:
      "Explore the world of technology with structured learning, mentorship and hands-on projects.",
    benefits: [
      "Learn from industry experts",
      "Work on real projects",
      "Get an Internship Certificate",
    ],
    art: "book",
    cta: "Apply for Explorer",
  },
  {
    id: "innovator",
    type: "Type B",
    name: "Tech Innovator",
    subtitle: "Paid Internship – Up to ₹20,000",
    description:
      "Go beyond learning. Contribute, build and innovate while earning a stipend of up to ₹20,000.",
    benefits: [
      "Stipend up to ₹20,000",
      "Access to premium AI tools",
      "Contribute to live projects",
      "Exclusive perks & more",
    ],
    art: "trophy",
    cta: "Apply for Innovator",
  },
];

const benefits = [
  { art: "benefitRocket", lines: ["Real-World", "Projects"] },
  { art: "benefitUsers", lines: ["Expert", "Mentorship"] },
  { art: "chip", lines: ["Cutting-Edge", "AI Tools"] },
  { art: "growth", lines: ["Career Growth", "Opportunities"] },
];

function ReferenceArt({ name, className = "" }) {
  return (
    <svg
      viewBox={artwork[name].join(" ")}
      className={`${styles.referenceArt} ${className}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <image href={ART_SOURCE} width="1199" height="1312" />
      {name === "hero" && (
        <g transform="rotate(-10 817 185)">
          {/* Cover the reference mark to keep the laptop unbranded. */}
          <rect x="807" y="174" width="21" height="23" rx="6" fill="#30369d" />
        </g>
      )}
    </svg>
  );
}

function BackgroundWaves() {
  return (
    <svg
      className={styles.backgroundWaves}
      viewBox="0 0 1199 1312"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="intern-wave" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fff" stopOpacity=".48" />
          <stop offset="1" stopColor="#fff" stopOpacity=".02" />
        </linearGradient>
        <linearGradient id="intern-blue-wave" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#84bcff" stopOpacity=".1" />
          <stop offset="1" stopColor="#38baff" stopOpacity=".48" />
        </linearGradient>
      </defs>
      <path
        d="M0 157C80 72 176 85 238 126S348 200 341 278 388 363 509 390C260 385 120 432 0 302Z"
        fill="url(#intern-wave)"
        stroke="#fff"
        strokeOpacity=".28"
      />
      <path d="M994 0C954 63 915 77 853 97L904 0Z" fill="url(#intern-wave)" />
      <path
        d="M1199 314C1138 395 1080 329 1033 365S1031 440 1199 432Z"
        fill="url(#intern-blue-wave)"
      />
      <path
        d="M0 413C170 352 330 429 550 401S1005 461 1199 364L1199 415C987 491 811 439 581 447S230 394 0 449Z"
        fill="url(#intern-wave)"
      />
      <path
        d="M0 415C231 356 411 417 650 396S1051 452 1199 365"
        fill="none"
        stroke="#fff"
        strokeOpacity=".63"
      />
      <path
        d="M1199 898C1117 850 1083 798 1071 755 1063 866 1087 915 1199 961Z"
        fill="url(#intern-wave)"
      />
      <path
        d="M1199 926C1116 924 1096 992 1047 1030S1040 1126 1199 1100"
        fill="none"
        stroke="#fff"
        strokeOpacity=".7"
        strokeWidth="2"
      />
      <path
        d="M1199 1088C1102 1139 1028 1122 1008 1199L1199 1154Z"
        fill="url(#intern-blue-wave)"
      />
      <path
        d="M1199 1099C1103 1122 1040 1162 1012 1214"
        fill="none"
        stroke="#fff"
        strokeOpacity=".62"
      />
    </svg>
  );
}

export default function InternLanding() {
  const { commands, ready, sessionReady } = useInternship();
  const { features, ready: featuresReady } = useSiteFeatures();
  const canApply = Boolean(featuresReady && features.internships && features.applications);
  const canApplyRef = useRef(canApply);
  canApplyRef.current = canApply;
  const [selectedTrack, setSelectedTrack] = useState("");
  const [previewComplete, setPreviewComplete] = useState(false);
  const [launchPhase, setLaunchPhase] = useState("idle");
  const [showValidation, setShowValidation] = useState(false);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [resumeName, setResumeName] = useState("");
  const [resumeError, setResumeError] = useState("");
  const [resumeDragging, setResumeDragging] = useState(false);
  const [linkedInError, setLinkedInError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sampleBusy, setSampleBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [savedApplication, setSavedApplication] = useState(null);
  const submissionLock = useRef(false);
  const nameInput = useRef(null);
  const resumeInput = useRef(null);
  const linkedInInput = useRef(null);
  const submitButtonRef = useRef(null);
  const previousLaunchPhase = useRef("idle");
  const lenis = useLenis();

  useEffect(() => {
    if (!canApply) {
      setLaunchPhase("idle");
      setPreviewComplete(false);
    }
  }, [canApply]);

  useEffect(() => {
    if (launchPhase !== "launching") return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = window.setTimeout(
      () => {
        setPreviewComplete(true);
        setLaunchPhase("complete");
      },
      reducedMotion ? 250 : 2000,
    );
    return () => window.clearTimeout(timer);
  }, [launchPhase]);

  useEffect(() => {
    if (launchPhase === "idle" && previousLaunchPhase.current !== "idle") {
      submitButtonRef.current?.focus({ preventScroll: true });
    }
    previousLaunchPhase.current = launchPhase;
  }, [launchPhase]);

  function scrollToSection(event, sectionId) {
    event.preventDefault();
    event.stopPropagation();
    const section = document.getElementById(sectionId);
    if (!section) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const top = Math.max(
      0,
      section.getBoundingClientRect().top + window.scrollY - 112,
    );
    if (lenis) {
      lenis.scrollTo(top, { immediate: reducedMotion, duration: 0.7 });
    } else {
      window.scrollTo({ top, behavior: reducedMotion ? "instant" : "smooth" });
    }
    window.history.replaceState(window.history.state, "", `#${sectionId}`);
  }

  function applyForTrack(event, track) {
    if (!canApplyRef.current) { event.preventDefault(); return; }
    setSelectedTrack(track);
    setPreviewComplete(false);
    scrollToSection(event, "internship-application");
    // Focusing without a second scroll keeps the anchor below the shared navbar.
    nameInput.current?.focus({ preventScroll: true });
  }

  async function submitPreview(event) {
    event.preventDefault();
    if (!canApplyRef.current) {
      setSubmitError("New internship applications are currently closed.");
      return;
    }
    if (
      launchPhase !== "idle" ||
      submissionLock.current ||
      !ready ||
      !sessionReady
    )
      return;
    const name = nameInput.current;
    if (name && !name.value.trim()) {
      name.setCustomValidity("Please enter your full name.");
      name.reportValidity();
      return;
    }
    if (linkedInInput.current && !validateLinkedIn(linkedInInput.current)) {
      linkedInInput.current.reportValidity();
      return;
    }
    const formData = new FormData(event.currentTarget);
    const input = {
      name: String(formData.get("fullName") || "").trim(),
      email: String(formData.get("email") || "")
        .trim()
        .toLowerCase(),
      programId: selectedTrack,
      linkedin: String(formData.get("linkedin") || "").trim(),
    };
    if (
      savedApplication &&
      savedApplication.email?.toLowerCase() === input.email &&
      savedApplication.name === input.name &&
      savedApplication.programId === input.programId
    ) {
      setPreviewComplete(false);
      setLaunchPhase("launching");
      return;
    }
    const file = resumeInput.current?.files?.[0];
    if (!file) {
      setResumeError("Please upload your resume.");
      return;
    }
    submissionLock.current = true;
    setSubmitting(true);
    setSubmitError("");
    setPreviewComplete(false);
    setShowValidation(false);
    try {
      const attachment = await saveAttachment(file, "resume");
      const result = await commands.submitApplication({
        ...input,
        resumeAttachmentId: attachment.id,
      });
      if (!result.ok) {
        setSubmitError(
          typeof result.error === "string"
            ? result.error
            : result.error?.message ||
                "Unable to save your application. Please try again.",
        );
        return;
      }
      setSavedApplication(result.data);
      if (!canApplyRef.current) return;
      setLaunchPhase("launching");
    } catch (error) {
      setSubmitError(
        error?.message || "Unable to save your application. Please try again.",
      );
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  }

  async function useSampleResume() {
    if (sampleBusy || submitting) return;
    setSampleBusy(true);
    try {
      const file = await makeSampleResume();
      const transfer = new DataTransfer();
      transfer.items.add(file);
      if (resumeInput.current) {
        resumeInput.current.files = transfer.files;
        updateResume(resumeInput.current);
      }
    } catch (error) {
      setResumeError(
        error?.message ||
          "Unable to prepare the sample resume. Please choose a file.",
      );
    } finally {
      setSampleBusy(false);
    }
  }

  function selectResume(event) {
    updateResume(event.currentTarget);
  }

  function updateResume(input, rejectedMessage = "") {
    const file = input.files?.[0];
    let message = rejectedMessage;
    if (!message && !file) {
      message = "Please upload your resume.";
    } else if (!message && file && !/\.(pdf|docx?)$/i.test(file.name)) {
      message = "Choose a PDF, DOC, or DOCX file.";
    } else if (!message && file && file.size > MAX_RESUME_BYTES) {
      message = "Your resume must be 5 MB or smaller.";
    } else if (!message && file && file.size === 0) {
      message = "Your resume file is empty. Choose another file.";
    }
    input.setCustomValidity(message);
    setResumeError(message);
    setResumeName(message ? "" : file?.name || "");
    if (message) input.value = "";
    setPreviewComplete(false);
  }

  function dropResume(event) {
    event.preventDefault();
    event.stopPropagation();
    setResumeDragging(false);
    const input = resumeInput.current;
    const files = event.dataTransfer.files;
    if (!input || !files.length) return;
    if (files.length > 1) {
      input.value = "";
      updateResume(input, "Please upload one resume at a time.");
      return;
    }
    const transfer = new DataTransfer();
    transfer.items.add(files[0]);
    input.files = transfer.files;
    updateResume(input);
  }

  function removeResume() {
    if (resumeInput.current) {
      resumeInput.current.value = "";
      resumeInput.current.setCustomValidity("");
      resumeInput.current.focus({ preventScroll: true });
    }
    setResumeName("");
    setResumeError("");
    setPreviewComplete(false);
  }

  function validateLinkedIn(input) {
    const value = input.value.trim();
    let message = "";
    if (value) {
      try {
        const url = new URL(value);
        const isLinkedIn =
          url.hostname === "linkedin.com" ||
          url.hostname.endsWith(".linkedin.com");
        if (
          !isLinkedIn ||
          !["http:", "https:"].includes(url.protocol) ||
          !/^\/in\/[^/]+/.test(url.pathname)
        ) {
          message =
            "Enter a LinkedIn profile URL, such as https://www.linkedin.com/in/your-name.";
        }
      } catch {
        message =
          "Enter the full profile URL, starting with https://www.linkedin.com/in/.";
      }
    }
    input.setCustomValidity(message);
    setLinkedInError(message);
    return !message;
  }

  return (
    <div className={styles.page}>
      <BackgroundWaves />
      <main className={styles.main}>
        <section
          className={styles.hero}
          data-theme="light"
          aria-labelledby="intern-title"
        >
          <div className={`${styles.container} ${styles.heroInner}`}>
            <div className={styles.heroCopy}>
              <div className={styles.eyebrow}>
                <ReferenceArt name="rocket" />
                <span>Olentra Launchpad</span>
              </div>
              <h1 id="intern-title">
                Internship <span>Program</span>
              </h1>
              <p className={styles.heroTagline}>Learn. Build. Grow.</p>
              <p className={styles.heroDescription}>
                Join <strong>Olentra Technologies</strong> and kickstart your
                career with hands-on experience, mentorship, and real-world
                projects.
              </p>
              <div className={styles.heroActions}>
                <a
                  className={styles.primaryButton}
                  href="#internship-tracks"
                  onClick={(event) =>
                    scrollToSection(event, "internship-tracks")
                  }
                >
                  Explore Opportunities{" "}
                  <ArrowRight size={15} aria-hidden="true" />
                </a>
                <a
                  className={styles.secondaryButton}
                  href="#internship-insights"
                  onClick={(event) =>
                    scrollToSection(event, "internship-insights")
                  }
                >
                  <ReferenceArt name="bars" /> View Insights
                </a>
              </div>
            </div>
            <ReferenceArt name="hero" className={styles.heroArt} />
          </div>
        </section>

        <section
          className={`${styles.container} ${styles.tracks}`}
          id="internship-tracks"
          data-theme="light"
          aria-label="Internship opportunities"
        >
          <div className={styles.trackGrid}>
            {tracks.map((track) => (
              <article
                key={track.id}
                className={`${styles.trackCard} ${track.id === "innovator" ? styles.innovator : styles.explorer}`}
              >
                <ReferenceArt name={track.art} className={styles.trackArt} />
                <div className={styles.trackContent}>
                  <div className={styles.trackHeading}>
                    <span className={styles.trackBadge}>{track.type}</span>
                    <h2>{track.name}</h2>
                    <p className={styles.trackSubtitle}>{track.subtitle}</p>
                  </div>
                  <p className={styles.trackDescription}>{track.description}</p>
                  <ul className={styles.trackBenefits}>
                    {track.benefits.map((benefit) => (
                      <li key={benefit}>
                        <span>
                          <Check size={11} strokeWidth={3} aria-hidden="true" />
                        </span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
                {canApply && <a
                  href="#internship-application"
                  className={`${styles.primaryButton} ${styles.trackButton}`}
                  onClick={(event) => applyForTrack(event, track.id)}
                >
                  {track.cta} <ArrowRight size={14} aria-hidden="true" />
                </a>}
              </article>
            ))}
          </div>
        </section>

        <section
          className={`${styles.container} ${styles.insights}`}
          id="internship-insights"
          data-theme="light"
          aria-labelledby="insights-title"
        >
          <div className={styles.sectionHeading}>
            <ReferenceArt name="bars" />
            <div>
              <h2 id="insights-title">Our Internship Insights</h2>
              <p>A glimpse into our growing talent community</p>
            </div>
          </div>
          <div className={styles.insightsGrid}>
            <div
              className={styles.metrics}
              aria-label="Illustrative internship statistics"
            >
              {[
                { art: "users", value: "500+", label: "Intern Applications" },
                { art: "rocket", value: "200+", label: "Selected Interns" },
                { art: "star", value: "95%", label: "Satisfaction Rate" },
              ].map((metric) => (
                <div className={styles.metric} key={metric.label}>
                  <ReferenceArt name={metric.art} />
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
            <ApplicationsChart />
            <aside className={styles.journey}>
              <ReferenceArt name="bulb" />
              <div>
                <h3>Be a part of our innovative journey!</h3>
                <p>
                  Gain valuable experience and contribute to cutting-edge
                  projects.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section
          className={`${styles.container} ${styles.bottomGrid}`}
          data-theme="light"
          aria-label="Internship benefits and application"
        >
          <div className={styles.whyChoose}>
            <div className={styles.sectionHeading}>
              <ReferenceArt name="diamond" />
              <div>
                <h2>Why Choose Olentra?</h2>
                <p>
                  More than just an internship — a launchpad for your career.
                </p>
              </div>
            </div>
            <div className={styles.benefitsGrid}>
              {benefits.map((benefit) => (
                <div className={styles.benefit} key={benefit.art}>
                  <ReferenceArt name={benefit.art} />
                  <p>
                    {benefit.lines[0]}
                    <br />
                    {benefit.lines[1]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {canApply ? <div className={styles.application} id="internship-application">
            <div className={styles.applicationContent}>
              <div className={styles.applicationHeading}>
                <ReferenceArt name="plane" />
                <div>
                  <h2>Apply Now</h2>
                  <p>
                    Take the first step towards an exciting career with Olentra.
                  </p>
                </div>
              </div>
              <form
                className={`${styles.form} ${showValidation ? styles.validationAttempted : ""}`}
                onSubmit={submitPreview}
                onChange={() => {
                  setPreviewComplete(false);
                  setShowValidation(false);
                  setSubmitError("");
                }}
                onInvalidCapture={() => {
                  setPreviewComplete(false);
                  setShowValidation(true);
                  setValidationAttempt((attempt) => attempt + 1);
                }}
                aria-busy={submitting || launchPhase === "launching"}
              >
                <fieldset
                  className={styles.formBody}
                  disabled={submitting || launchPhase === "launching"}
                >
                  <div className={styles.formFields}>
                    <label htmlFor="intern-full-name">
                      Full Name <span>*</span>
                      <input
                        ref={nameInput}
                        id="intern-full-name"
                        name="fullName"
                        placeholder="Enter your name"
                        autoComplete="name"
                        required
                        maxLength={120}
                        onInput={(event) =>
                          event.currentTarget.setCustomValidity("")
                        }
                      />
                    </label>
                    <label htmlFor="intern-email">
                      Email Address <span>*</span>
                      <input
                        id="intern-email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        autoComplete="email"
                        required
                        maxLength={254}
                      />
                    </label>
                    <label htmlFor="intern-track">
                      Select Internship Track <span>*</span>
                      <select
                        id="intern-track"
                        name="track"
                        value={selectedTrack}
                        onChange={(event) =>
                          setSelectedTrack(event.target.value)
                        }
                        required
                      >
                        <option value="" disabled>
                          Choose a track
                        </option>
                        {tracks.map((track) => (
                          <option key={track.id} value={track.id}>
                            {track.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className={styles.profileField}>
                      <label htmlFor="intern-linkedin">
                        LinkedIn Profile <span>(optional)</span>
                      </label>
                      <input
                        ref={linkedInInput}
                        id="intern-linkedin"
                        name="linkedin"
                        type="url"
                        placeholder="https://www.linkedin.com/in/your-name"
                        autoComplete="url"
                        maxLength={500}
                        spellCheck={false}
                        aria-describedby={
                          linkedInError ? "intern-linkedin-error" : undefined
                        }
                        aria-invalid={Boolean(linkedInError)}
                        onBlur={(event) =>
                          validateLinkedIn(event.currentTarget)
                        }
                        onInput={(event) => {
                          event.currentTarget.setCustomValidity("");
                          setLinkedInError("");
                        }}
                      />
                      {linkedInError && (
                        <p
                          className={styles.fieldError}
                          id="intern-linkedin-error"
                          role="alert"
                        >
                          {linkedInError}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={styles.resumeField}>
                    <label htmlFor="intern-resume">
                      Upload Resume <span>*</span>
                    </label>
                    <div
                      className={`${styles.resumeDropzone} ${resumeDragging ? styles.resumeDragging : ""} ${resumeError ? styles.invalidControl : ""}`}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "copy";
                        setResumeDragging(true);
                      }}
                      onDragLeave={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget))
                          setResumeDragging(false);
                      }}
                      onDrop={dropResume}
                    >
                      <div className={styles.resumePicker}>
                        <input
                          ref={resumeInput}
                          className={styles.resumeInput}
                          id="intern-resume"
                          name="resume"
                          type="file"
                          required
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          aria-describedby={`intern-resume-hint intern-resume-name${resumeError ? " intern-resume-error" : ""}`}
                          aria-invalid={Boolean(resumeError)}
                          onChange={selectResume}
                          onInvalid={() => {
                            setResumeError(
                              (message) =>
                                message || "Please upload your resume.",
                            );
                            setPreviewComplete(false);
                          }}
                        />
                        <span className={styles.resumeDisplay}>
                          <span
                            className={styles.resumeIcon}
                            aria-hidden="true"
                          >
                            {resumeName ? (
                              <FileText size={19} />
                            ) : (
                              <Upload size={19} />
                            )}
                          </span>
                          <strong
                            id="intern-resume-name"
                            title={resumeName || undefined}
                          >
                            {resumeName || "Click to upload or drag and drop"}
                          </strong>
                          <span
                            className={styles.fieldHint}
                            id="intern-resume-hint"
                          >
                            {resumeName ? "Click to replace · " : ""}PDF, DOC or
                            DOCX · Max 5 MB
                          </span>
                        </span>
                      </div>
                      {(resumeName || resumeError) && (
                        <button
                          type="button"
                          className={styles.removeResume}
                          aria-label="Remove resume selection"
                          onClick={removeResume}
                        >
                          <X size={13} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    <div className={styles.resumeTools}>
                      <button
                        type="button"
                        onClick={useSampleResume}
                        disabled={sampleBusy || submitting}
                      >
                        {sampleBusy ? "Preparing sample…" : "Use Sample Resume"}
                      </button>
                      <span>Try the demo with a sample PDF.</span>
                    </div>
                    {resumeError && (
                      <p
                        className={styles.fieldError}
                        id="intern-resume-error"
                        role="alert"
                      >
                        {resumeError}
                      </p>
                    )}
                  </div>
                </fieldset>
                <button
                  ref={submitButtonRef}
                  className={`${styles.primaryButton} ${styles.submitButton}`}
                  type="submit"
                  disabled={
                    !ready ||
                    !sessionReady ||
                    submitting ||
                    sampleBusy ||
                    launchPhase === "launching"
                  }
                >
                  {submitting || launchPhase === "launching" ? (
                    <>
                      <span
                        className={styles.submitSpinner}
                        aria-hidden="true"
                      />
                      {submitting
                        ? "Saving your application…"
                        : "Preparing your launch…"}
                    </>
                  ) : (
                    <>
                      Submit Application{" "}
                      <ArrowRight size={14} aria-hidden="true" />
                    </>
                  )}
                </button>
                {showValidation && (
                  <p
                    className={styles.submitValidation}
                    key={validationAttempt}
                    role="alert"
                  >
                    <AlertCircle size={16} aria-hidden="true" />
                    Check the highlighted fields before submitting your
                    application.
                  </p>
                )}
                {submitError && (
                  <div className={styles.applicationError} role="alert">
                    <AlertCircle size={16} />
                    <div>
                      {submitError}
                      <Link href="/intern/login?role=intern">
                        Already applied? Sign in to your account{" "}
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                )}
                <div
                  className={styles.formStatus}
                  role="status"
                  aria-live="polite"
                >
                  {previewComplete && savedApplication && (
                    <span className={styles.previewReady}>
                      <Check size={17} aria-hidden="true" />
                      <span>
                        Your demo application is saved.
                        <strong className={styles.savedApplicationId}>
                          Application ID: {savedApplication.id}
                        </strong>
                        <Link
                          className={styles.createAccountLink}
                          href="/intern/register"
                        >
                          Create your account <ArrowRight size={12} />
                        </Link>
                      </span>
                    </span>
                  )}
                </div>
              </form>
            </div>
            <aside
              className={styles.applicationAside}
              aria-label="Launch your career with Olentra"
            >
              <LaunchAnimation />
            </aside>
          </div> : featuresReady && <div className={styles.applicationClosed} id="internship-application" role="status">
            <h2>Applications are currently closed</h2>
            <p>New internship applications and account registration are unavailable at the moment.</p>
            {features.portal && <Link href="/intern/login?role=intern" className={styles.secondaryButton}>Existing intern? Sign in <ArrowRight size={15} /></Link>}
          </div>}
        </section>
      </main>
      {canApply && launchPhase !== "idle" && (
        <ApplicationLaunch
          phase={launchPhase}
          applicationId={savedApplication?.id}
          accountHref="/intern/register"
          onDismiss={() => setLaunchPhase("idle")}
        />
      )}
    </div>
  );
}
