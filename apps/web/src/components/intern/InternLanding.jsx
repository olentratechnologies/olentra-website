"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLenis } from "lenis/react";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  FileText,
  Globe2,
  Clock3,
  Upload,
  Lock,
  X,
} from "lucide-react";
import ApplicationLaunch from "./ApplicationLaunch";
import LaunchAnimation from "./LaunchAnimation";
import LoadingIndicator from "@olentra/ui/LoadingIndicator";
import { useInternship } from "./InternshipProvider";
import { authorizeResumeUpload, saveAttachment } from "@/lib/intern-attachments.mjs";
import ResumeSecurityCheck, { resumeSecuritySiteKey } from "./ResumeSecurityCheck";
import { isProgramAvailable, matchesCompensationMode, resolveProgramSelection } from "@/lib/intern/program-availability.mjs";
import styles from "./intern.module.css";
import ExtendedWindowBanner from "./ExtendedWindowBanner";
import InternInsights from "./InternInsights";
import SuccessStories from "./SuccessStories";
import InternFaq from "./InternFaq";
import InternPrerequisites from "./InternPrerequisites";
import ApplicationCountdown, { useDeadlineClosed } from "./ApplicationCountdown";
import { REVIEW_DAYS, deadlineTime, formatDay, resultsBy } from "@/lib/intern/application-deadline.mjs";
import { Feature, useSiteFeatures } from "@olentra/site-features/react";
import { DRAFT_FIELDS, clearApplyDraft, readApplyDraft, writeApplyDraft } from "@/lib/intern/apply-draft.mjs";
import { INTERNSHIP_OPPORTUNITIES } from "@/lib/intern/opportunities.mjs";

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

const commonTrackBenefits = [
  "Gain practical project experience",
  "Receive mentorship and project feedback",
  "Learn from experienced professionals",
  "Build practical software engineering skills",
  "Access to AI tools, including Claude, Codex, and Gemini",
];

const paidTrackBenefits = [
  "Earn a monthly stipend",
  "Contribute to live company projects",
  "Collaborate with the development team",
  "Access premium AI and development tools",
];

const tracks = [
  {
    id: "software-engineer",
    name: "Software Engineer Intern",
    subtitle: "Internship program",
    description:
      "Build production-minded software and AI-powered products through hands-on engineering, mentorship, and real-world projects.",
    art: "book",
    cta: "Apply now",
  },
];
const WORK_MODE = "100% remote";
const SCHEDULE = "Part-time/full-time";

const benefits = [
  { art: "benefitRocket", lines: ["Real-world", "projects"] },
  { art: "benefitUsers", lines: ["Expert", "mentorship"] },
  { art: "chip", lines: ["AI-powered", "tools"] },
  { art: "growth", lines: ["Career", "development"] },
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
  const { commands, ready, sessionReady, connected, data } = useInternship();
  const { features, ready: featuresReady } = useSiteFeatures();
  const opportunities = data.opportunities || INTERNSHIP_OPPORTUNITIES;
  const workAreas = opportunities.workAreas || INTERNSHIP_OPPORTUNITIES.workAreas;
  const helpfulSkills = opportunities.helpfulSkills || INTERNSHIP_OPPORTUNITIES.helpfulSkills;
  const internshipDuration = (data.settings.duration || opportunities.duration || INTERNSHIP_OPPORTUNITIES.duration).replace(/\bcalendar\s+/gi, "").trim();
  const visibleTracks = tracks.filter((track) => matchesCompensationMode(data.programs.find((program) => program.id === track.id), data.settings.compensationMode));
  const availablePrograms = useMemo(() => data.programs.filter((program) => isProgramAvailable(program, data.settings)), [data.programs, data.settings]);
  const availableTrackIds = useMemo(() => availablePrograms.map((program) => program.id), [availablePrograms]);
  const soleAvailableProgram = availablePrograms.length === 1 ? availablePrograms[0] : null;
  const availableTrackIdsRef = useRef(availableTrackIds);
  availableTrackIdsRef.current = availableTrackIds;
  const deadlineClosed = useDeadlineClosed(data.settings.applicationDeadline);
  const canApply = Boolean(featuresReady && features.internships && features.applications && connected && data.opportunities && availablePrograms.length && !deadlineClosed);
  // Applications were closed on purpose (deadline passed, applications switched off or no track open),
  // as opposed to the service being unavailable or the form still loading.
  const reviewing = Boolean(connected && data.opportunities && (deadlineClosed || !features.applications || !availablePrograms.length));
  // An admin extended the window and it's still open: show the "extended window" banner.
  const extendedWindow = Boolean(canApply && data.settings.deadlineExtension && data.settings.deadlineExtension.deadline === data.settings.applicationDeadline);
  const canApplyRef = useRef(canApply);
  canApplyRef.current = canApply;
  const [trackChoice, setTrackChoice] = useState("");
  const [scheduleChoice, setScheduleChoice] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const selectedTrack = resolveProgramSelection(trackChoice, availableTrackIds);
  const [previewComplete, setPreviewComplete] = useState(false);
  const [launchPhase, setLaunchPhase] = useState("idle");
  const [showValidation, setShowValidation] = useState(false);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [resumeName, setResumeName] = useState("");
  const [resumeError, setResumeError] = useState("");
  const [resumeDragging, setResumeDragging] = useState(false);
  const [linkedInError, setLinkedInError] = useState("");
  const [githubError, setGithubError] = useState("");
  const [videoError, setVideoError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [alreadyAppliedEmail, setAlreadyAppliedEmail] = useState("");
  const [savedApplication, setSavedApplication] = useState(null);
  const submissionLock = useRef(false);
  const uploadedResume = useRef(null);
  const resumeGrant = useRef(null);
  const nameInput = useRef(null);
  // Unfinished applications are kept in this browser only (never sent until
  // submitted), restored on the next visit and cleared after applying.
  const formRef = useRef(null);
  useEffect(() => {
    if (!canApply) { setDraftReady(false); return; }
    const draft = readApplyDraft();
    const form = formRef.current;
    if (!form) return;
    for (const field of draft ? DRAFT_FIELDS : []) {
      const input = form.elements.namedItem(field);
      if (input && "value" in input && !input.value && typeof draft[field] === "string") input.value = draft[field];
    }
    if (typeof draft?.track === "string") setTrackChoice(draft.track);
    setScheduleChoice(draft?.schedule || "");
    setDraftReady(true);
  }, [canApply]);
  // Save controlled choices after rendering, including restored answers.
  useEffect(() => { if (draftReady) saveDraft(); }, [draftReady, trackChoice, scheduleChoice]);
  function saveDraft() {
    const form = formRef.current;
    if (!form) return;
    if (!draftReady) return;
    const draft = {};
    for (const field of [...DRAFT_FIELDS, "track", "schedule"]) draft[field] = String(form.elements.namedItem(field)?.value || "");
    writeApplyDraft(draft);
  }
  const resumeInput = useRef(null);
  const linkedInInput = useRef(null);
  const githubInput = useRef(null);
  const videoInput = useRef(null);
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
    const nextTrack = resolveProgramSelection(trackChoice, availableTrackIds);
    if (nextTrack === trackChoice) return;
    setTrackChoice(nextTrack);
    if (trackChoice && !availableTrackIds.includes(trackChoice)) {
      setLaunchPhase("idle");
      setPreviewComplete(false);
      setSubmitError(nextTrack ? "Available internships changed. Please review your selected track." : "That track is no longer accepting applications. Choose an available track.");
    } else setSubmitError("");
  }, [trackChoice, availableTrackIds]);

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
    if (submissionLock.current || launchPhase === "launching" || !canApplyRef.current || !availableTrackIdsRef.current.includes(track)) { event.preventDefault(); return; }
    setTrackChoice(track);
    setPreviewComplete(false);
    scrollToSection(event, "internship-application");
    // Focusing without a second scroll keeps the anchor below the shared navbar.
    nameInput.current?.focus({ preventScroll: true });
  }

  function resetApplicationForm() {
    const form = formRef.current;
    form?.reset();
    for (const field of Array.from(form?.elements || [])) field.setCustomValidity?.("");
    setTrackChoice("");
    setScheduleChoice("");
    uploadedResume.current = null;
    setResumeName("");
    setResumeError("");
    setResumeDragging(false);
    setLinkedInError("");
    setGithubError("");
    setVideoError("");
    setSubmitError("");
    setAlreadyAppliedEmail("");
    setShowValidation(false);
    setValidationAttempt(0);
    clearApplyDraft();
  }

  async function submitPreview(event) {
    event.preventDefault();
    if (!canApplyRef.current) {
      setSubmitError("New internship applications are currently closed.");
      return;
    }
    if (!availableTrackIdsRef.current.includes(selectedTrack)) {
      setSubmitError("Choose an internship track that is accepting applications.");
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
    if (githubInput.current && !validateGitHub(githubInput.current)) {
      githubInput.current.reportValidity();
      return;
    }
    if (videoInput.current && !validateVideo(videoInput.current)) {
      videoInput.current.reportValidity();
      return;
    }
    const formData = new FormData(event.currentTarget);
    const input = {
      name: String(formData.get("fullName") || "").trim(),
      email: String(formData.get("email") || "")
        .trim()
        .toLowerCase(),
      programId: selectedTrack,
      schedule: scheduleChoice,
      linkedin: String(formData.get("linkedin") || "").trim(),
      github: String(formData.get("github") || "").trim(),
      videoUrl: String(formData.get("videoUrl") || "").trim(),
    };
    const file = resumeInput.current?.files?.[0];
    if (!file) {
      setResumeError("Please upload your resume.");
      return;
    }
    submissionLock.current = true;
    setSubmitting(true);
    setSubmitError("");
    setAlreadyAppliedEmail("");
    setPreviewComplete(false);
    setShowValidation(false);
    try {
      let attachment = uploadedResume.current;
      if (!attachment) {
        if (!canApplyRef.current || !availableTrackIdsRef.current.includes(input.programId)) {
          setSubmitError("That track is no longer accepting applications. Choose an available track.");
          return;
        }
        if (resumeSecuritySiteKey && (!resumeGrant.current || resumeGrant.current.expiresAt <= Date.now())) {
          const challenge = String(formData.get("cf-turnstile-response") || "");
          if (!challenge) throw new Error("Complete the security check before uploading your resume.");
          const widget = event.target.querySelector("[data-resume-security-check]");
          try {
            resumeGrant.current = await authorizeResumeUpload(challenge);
          } finally {
            widget?.dispatchEvent(new Event("resume-challenge-reset"));
          }
        }
        try {
          attachment = await saveAttachment(file, "resume", { publicUpload: true, resumeGrant: resumeGrant.current?.token });
        } catch (error) {
          if (error.status === 403 || error.status === 429) resumeGrant.current = null;
          throw error;
        }
      }
      uploadedResume.current = attachment;
      if (!canApplyRef.current || !availableTrackIdsRef.current.includes(input.programId)) {
        setSubmitError("That track is no longer accepting applications. Choose an available track.");
        return;
      }
      const result = await commands.submitApplication({
        ...input,
        resumeAttachmentId: attachment.id,
        resumeAccessToken: attachment.accessToken,
      });
      if (!result.ok) {
        const msg = typeof result.error === "string" ? result.error : result.error?.message || "Unable to save your application. Please try again.";
        setSubmitError(msg);
        if (msg.toLowerCase().includes("already exists") || result.errorCode === "ALREADY_APPLIED") {
          setAlreadyAppliedEmail(input.email);
        }
        return;
      }
      // Only a newly accepted application reaches the success screen.
      setSavedApplication({ ...input, applicationId: result.data?.applicationId, message: result.data?.message });
      resumeGrant.current = null;
      resetApplicationForm();
      if (!canApplyRef.current || !availableTrackIdsRef.current.includes(input.programId)) return;
      setLaunchPhase("launching");
    } catch (error) {
      const msg = error?.message || "Unable to save your application. Please try again.";
      setSubmitError(msg);
      if (msg.toLowerCase().includes("already exists")) {
        setAlreadyAppliedEmail(input.email);
      }
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  }

  function selectResume(event) {
    updateResume(event.currentTarget);
  }

  function updateResume(input, rejectedMessage = "") {
    uploadedResume.current = null;
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
    uploadedResume.current = null;
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
    if (!value) {
      message = "Please enter your LinkedIn profile URL.";
    } else {
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

  function validateGitHub(input) {
    const value = input.value.trim();
    let message = "";
    if (value) {
      try {
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      } catch {
        message =
          "Enter a valid profile URL, starting with https:// (e.g. https://github.com/your-name).";
      }
    }
    input.setCustomValidity(message);
    setGithubError(message);
    return !message;
  }

  function validateVideo(input) {
    const value = input.value.trim();
    let message = "";
    if (value) {
      try {
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      } catch {
        message =
          "Enter the full video link, starting with https:// (YouTube, Google Drive, Loom, etc.).";
      }
    }
    input.setCustomValidity(message);
    setVideoError(message);
    return !message;
  }

  return (
    <div className={styles.page}>
      <BackgroundWaves />
      <main className={styles.main}>
        {extendedWindow && <ExtendedWindowBanner extension={data.settings.deadlineExtension} deadline={data.settings.applicationDeadline} />}
        <Feature name="careers.hero"><section
          className={`${styles.hero} ${extendedWindow ? styles.heroAfterNotice : ""}`}
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
                career through practical experience, mentorship, and real-world
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
                  Explore opportunities{" "}
                  <ArrowRight size={15} aria-hidden="true" />
                </a>
                <a
                  className={styles.secondaryButton}
                  href="#internship-insights"
                  onClick={(event) =>
                    scrollToSection(event, "internship-insights")
                  }
                >
                  <ReferenceArt name="bars" /> View insights
                </a>
              </div>
              <ul className={styles.programFacts} aria-label="Internship details">
                <li><Globe2 size={15} aria-hidden="true" /><span>{WORK_MODE}</span></li>
                <li><CalendarDays size={15} aria-hidden="true" /><span>{internshipDuration}</span></li>
                <li><Clock3 size={15} aria-hidden="true" /><span>{SCHEDULE}</span></li>
              </ul>
            </div>
            <ReferenceArt name="hero" className={styles.heroArt} />
          </div>
        </section></Feature>

        <Feature name="careers.tracks"><section
          className={`${styles.container} ${styles.tracks}`}
          id="internship-tracks"
          data-theme="light"
          aria-label="Internship opportunities"
        >
          {visibleTracks.length ? <div className={styles.trackGrid}>
            {visibleTracks.map((track) => {
              const program = data.programs.find((item) => item.id === track.id);
              const trackBenefits = program?.stipend > 0 ? [...commonTrackBenefits, ...paidTrackBenefits] : commonTrackBenefits;
              return (
              <article
                key={track.id}
                className={styles.trackCard}
              >
                <header className={styles.trackHeader}>
                  <ReferenceArt name={track.art} className={styles.trackArt} />
                  <div className={styles.trackIntro}>
                    <h2>{track.name}</h2>
                    <p>{track.description}</p>
                    {canApply && availableTrackIds.includes(track.id) && (
                      <a href="#internship-application" className={styles.trackButton}
                        onClick={(event) => applyForTrack(event, track.id)}>
                        {track.cta} <ArrowRight size={16} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </header>
                <div className={styles.trackContent}>
                  <div className={styles.trackPanel}>
                    <h3>Program details</h3>
                    <dl className={styles.trackDetails}>
                      <div>
                        <dt>Duration</dt>
                        <dd>{internshipDuration}</dd>
                      </div>
                      <div>
                        <dt>Work mode</dt>
                        <dd>{WORK_MODE}</dd>
                      </div>
                      <div>
                        <dt>Schedule</dt>
                        <dd>{SCHEDULE}</dd>
                      </div>
                      <div>
                        <dt>Stipend</dt>
                        <dd>{program?.stipend == null ? "To be announced" : program.stipend === 0 ? "Unpaid" : <><span>₹{program.stipend.toLocaleString("en-IN")}</span><span className={styles.trackPeriod}>/ month</span></>}</dd>
                      </div>
                      <div>
                        <dt>Program fee</dt>
                        <dd>{program?.fee == null ? "To be announced" : program.fee === 0 ? "No fee" : `₹${program.fee.toLocaleString("en-IN")}`}</dd>
                      </div>
                      <div>
                        <dt>Certificate</dt>
                        <dd>Free</dd>
                      </div>
                    </dl>
                  </div>
                  <div className={styles.trackPanel}>
                    <h3>What you'll gain</h3>
                    <ul className={styles.trackBenefits} role="list">
                      {trackBenefits.map((benefit) => (
                        <li key={benefit}>
                          <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={`${styles.trackPanel} ${styles.trackPanelWide}`}>
                    <h3>What you'll work on</h3>
                    <ul className={styles.trackWorkAreas} role="list">
                      {workAreas.map((area) => (
                        <li key={area}><Check size={14} strokeWidth={2.5} aria-hidden="true" />{area}</li>
                      ))}
                    </ul>
                    <h4 className={styles.trackSkillsHeading}>Helpful skills <span>Optional</span></h4>
                    <ul className={styles.trackSkills} role="list">
                      {helpfulSkills.map((skill) => <li key={skill}>{skill}</li>)}
                    </ul>
                  </div>
                </div>
              </article>
              );
            })}
          </div> : ready ? <p className={styles.tracksEmpty} role="status">Internship opportunities will be announced soon.</p> : <LoadingIndicator label="Loading internship opportunities…" />}
        </section></Feature>

        <Feature name="careers.prerequisites"><div className={styles.container}>
          <InternPrerequisites />
        </div></Feature>

        <Feature name="careers.insights"><section
          className={`${styles.container} ${styles.insights}`}
          id="internship-insights"
          data-theme="light"
          aria-labelledby="insights-title"
        >
          <InternInsights />
        </section></Feature>

        <Feature name="careers.stories"><div className={styles.container}>
          <SuccessStories
            heading={
              <div className={styles.sectionHeading}>
                <ReferenceArt name="star" />
                <div>
                  <h2 id="stories-title">Stories from our interns</h2>
                  <p>Experiences shared by interns who completed the program</p>
                </div>
              </div>
            }
          />
        </div></Feature>

        <section
          className={`${styles.container} ${styles.bottomGrid}`}
          data-theme="light"
          aria-label="Internship benefits and application"
        >
          <Feature name="careers.why"><div className={styles.whyChoose}>
            <div className={styles.sectionHeading}>
              <ReferenceArt name="diamond" />
              <div>
                <h2>Why choose Olentra?</h2>
                <p>
                  Build practical skills with projects, mentorship, and collaboration.
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
          </div></Feature>

          <Feature name="careers.faq">
            <InternFaq
              duration={internshipDuration}
              deadline={data.settings.applicationDeadline}
              tracks={visibleTracks.map((track) => {
                const program = data.programs.find((item) => item.id === track.id);
                return { name: track.name, stipend: program?.stipend, fee: program?.fee };
              })}
            />
          </Feature>

          {canApply ? <div className={styles.application} id="internship-application">
            <div className={styles.applicationContent}>
              <div className={styles.applicationHeading}>
                <ReferenceArt name="plane" />
                <div>
                  <h2>Apply for an internship</h2>
                </div>
              </div>
              <form
                className={`${styles.form} ${showValidation ? styles.validationAttempted : ""}`}
                ref={formRef}
                onSubmit={submitPreview}
                onInput={saveDraft}
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
                      Full name <span>*</span>
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
                      Email address <span>*</span>
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
                    {!soleAvailableProgram ? (
                      <label htmlFor="intern-track">
                        Internship program <span>*</span>
                        <select
                          id="intern-track"
                          name="track"
                          value={selectedTrack}
                          onChange={(event) =>
                            setTrackChoice(event.target.value)
                          }
                          required
                        >
                          <option value="" disabled>
                            Choose a program
                          </option>
                          {tracks
                            .filter((track) => availableTrackIds.includes(track.id))
                            .map((track) => (
                              <option key={track.id} value={track.id}>
                                {track.name}
                              </option>
                            ))}
                        </select>
                      </label>
                    ) : (
                      <input type="hidden" name="track" value={selectedTrack} />
                    )}
                    <div className={styles.profileField}>
                      <label htmlFor="intern-linkedin">
                        LinkedIn profile <span className={styles.requiredMark}>*</span>
                      </label>
                      <input
                        ref={linkedInInput}
                        id="intern-linkedin"
                        name="linkedin"
                        type="url"
                        placeholder="https://www.linkedin.com/in/your-name"
                        autoComplete="url"
                        required
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
                    <div className={styles.profileField}>
                      <label htmlFor="intern-github">
                        GitHub profile or portfolio (optional)
                      </label>
                      <input
                        ref={githubInput}
                        id="intern-github"
                        name="github"
                        type="url"
                        placeholder="https://github.com/your-username"
                        autoComplete="url"
                        maxLength={500}
                        spellCheck={false}
                        aria-describedby={
                          githubError ? "intern-github-error" : undefined
                        }
                        aria-invalid={Boolean(githubError)}
                        onBlur={(event) =>
                          validateGitHub(event.currentTarget)
                        }
                        onInput={(event) => {
                          event.currentTarget.setCustomValidity("");
                          setGithubError("");
                        }}
                      />
                      {githubError && (
                        <p
                          className={styles.fieldError}
                          id="intern-github-error"
                          role="alert"
                        >
                          {githubError}
                        </p>
                      )}
                    </div>
                    <fieldset className={styles.scheduleField}>
                      <legend>Schedule <span>*</span></legend>
                      <div className={styles.scheduleOptions}>
                        {opportunities.schedules.map((schedule) => (
                          <label className={styles.scheduleOption} key={schedule.id}>
                            <input type="radio" name="schedule" value={schedule.id} checked={scheduleChoice === schedule.id} onChange={(event) => setScheduleChoice(event.target.value)} required />
                            <span>{schedule.label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <div className={`${styles.profileField} ${styles.profileFieldWide}`}>
                      <label htmlFor="intern-video">
                        Introduction video link <span className={styles.preferredTag}>Optional · preferred</span>
                      </label>
                      <input
                        ref={videoInput}
                        id="intern-video"
                        name="videoUrl"
                        type="url"
                        placeholder="YouTube, Google Drive, or Loom URL"
                        maxLength={500}
                        spellCheck={false}
                        aria-describedby={`intern-video-hint${videoError ? " intern-video-error" : ""}`}
                        aria-invalid={Boolean(videoError)}
                        onBlur={(event) => validateVideo(event.currentTarget)}
                        onInput={(event) => {
                          event.currentTarget.setCustomValidity("");
                          setVideoError("");
                        }}
                      />
                      <p className={styles.fieldHint} id="intern-video-hint">
                        Share a 1–2 minute introduction to help us get to know you. Applications with a video are usually reviewed for shortlisting first. Ensure the link is accessible without signing in.
                      </p>
                      {videoError && (
                        <p
                          className={styles.fieldError}
                          id="intern-video-error"
                          role="alert"
                        >
                          {videoError}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={styles.resumeField}>
                    <label htmlFor="intern-resume">
                      Upload resume <span>*</span>
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
                <ResumeSecurityCheck />
                <button
                  ref={submitButtonRef}
                  className={`${styles.primaryButton} ${styles.submitButton}`}
                  type="submit"
                  disabled={
                    !ready ||
                    !sessionReady ||
                    submitting ||
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
                        : "Preparing your application…"}
                    </>
                  ) : (
                    <>
                      Submit application{" "}
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
                  <div
                    className={styles.applicationError}
                    role="alert"
                    style={
                      alreadyAppliedEmail
                        ? {
                            background: "rgba(30, 41, 59, 0.9)",
                            borderColor: "rgba(96, 165, 250, 0.3)",
                            color: "#e2e8f0",
                          }
                        : undefined
                    }
                  >
                    {alreadyAppliedEmail ? (
                      <CheckCircle2 size={18} style={{ color: "#60a5fa", flexShrink: 0 }} />
                    ) : (
                      <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    )}
                    <div>
                      {alreadyAppliedEmail ? (
                        <>
                          <strong style={{ color: "#ffffff" }}>Application already on file</strong>
                          <p style={{ margin: "4px 0 10px", fontSize: "13px", color: "#cbd5e1" }}>
                            {submitError}
                          </p>
                          <Link href="/intern/login?role=intern" style={{ fontSize: "12px", color: "#60a5fa" }}>
                            Already selected? Sign in <ArrowRight size={11} />
                          </Link>
                        </>
                      ) : (
                        <>
                          {submitError}
                          <Link href="/intern/login?role=intern">
                            Already applied? Sign in to your account{" "}
                            <ArrowRight size={12} />
                          </Link>
                        </>
                      )}
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
                        Thanks for applying.
                        <span style={{ display: "block", fontSize: "12px", color: "#94a3b8", margin: "4px 0 8px" }}>
                          Check {savedApplication.email} for your confirmation email and reference ID. Our team will review your application within 3–5 business days.
                        </span>
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
          </div> : featuresReady && reviewing ? <ApplicationsUnderReview deadline={deadlineClosed ? deadlineTime(data.settings.applicationDeadline) : null} portal={features.portal} /> : featuresReady && <div className={styles.applicationClosed} id="internship-application" role="status">
            <h2>Applications are currently closed</h2>
            <p>{deadlineClosed && connected ? "The application deadline for this internship cycle has passed. Follow Olentra for the next intake." : !connected ? "The internship service is unavailable. Please try again shortly." : !data.opportunities ? "The application form is being updated. Please try again shortly." : "Please check back for the next internship intake."}</p>
            {features.portal && <Link href="/intern/login?role=intern" className={styles.secondaryButton}>Existing intern? Sign in <ArrowRight size={15} /></Link>}
          </div>}
        </section>
      </main>
      {/* The extended-window banner has its own countdown, so the floating one would only cover it. */}
      {data.settings.programEnabled && features.applications && !extendedWindow && (
        <ApplicationCountdown deadline={data.settings.applicationDeadline} />
      )}
      {canApply && launchPhase !== "idle" && (
        <ApplicationLaunch
          phase={launchPhase}
          applicationId={savedApplication?.applicationId}
          accountHref="/"
          onDismiss={() => setLaunchPhase("idle")}
        />
      )}
    </div>
  );
}

/**
 * Shown once applications close: they're being reviewed and results follow within REVIEW_DAYS.
 * With a deadline, the dates are shown and, after the review window, it says results were shared.
 * Closed by a switch there's no closing date, so no dates are shown.
 * Dates use the viewer's own time zone, so they're filled in after the page loads.
 */
export function ApplicationsUnderReview({ deadline, portal }) {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(Date.now());
    if (deadline === null) return undefined;
    const until = resultsBy(deadline) - Date.now();
    if (until <= 0 || until > 2 ** 31 - 1) return undefined;
    const timer = setTimeout(() => setNow(Date.now()), until + 50);
    return () => clearTimeout(timer);
  }, [deadline]);
  const dated = deadline !== null && now !== null;
  const closedOn = dated ? formatDay(deadline) : "", resultsDay = dated ? formatDay(resultsBy(deadline)) : "";
  const shared = dated && now >= resultsBy(deadline);
  return <div className={`${styles.applicationClosed} ${styles.underReview}`} id="internship-application" role="status">
    <span className={styles.closedBadge}><Lock size={13} aria-hidden="true" /> Applications closed</span>
    <h2>{shared ? "Results have been shared" : "We’re reviewing applications"}</h2>
    <p>{shared
      ? "Thank you to everyone who applied for this internship cycle. Results were shared by email. If you applied and haven’t heard from us, check your spam folder or write to intern.support@olentratechnologies.com."
      : `Thank you to everyone who applied for this internship cycle. Our team is now reviewing every application, and results will be shared by email within ${REVIEW_DAYS} days.`}</p>
    <ol className={styles.reviewSteps} aria-label="What happens next">
      <li data-state="done">
        <span className={styles.reviewMarker} aria-hidden="true"><Check size={14} /></span>
        <span><strong>Applications closed</strong><small>{deadline === null ? "Complete" : closedOn}</small></span>
      </li>
      <li data-state={shared ? "done" : "current"} aria-current={shared ? undefined : "step"}>
        <span className={styles.reviewMarker} aria-hidden="true">{shared && <Check size={14} />}</span>
        <span><strong>Under review</strong><small>{shared ? "Complete" : "In progress"}</small></span>
      </li>
      <li data-state={shared ? "done" : "next"} aria-current={shared ? "step" : undefined}>
        <span className={styles.reviewMarker} aria-hidden="true">{shared && <Check size={14} />}</span>
        <span><strong>Results shared</strong><small>{shared ? "By email" : resultsDay ? `By ${resultsDay}` : `Within ${REVIEW_DAYS} days`}</small></span>
      </li>
    </ol>
    {!shared && <p className={styles.reviewNote}>Applied already? Watch the inbox of the email you applied with. There’s nothing more you need to do.</p>}
    {portal && <Link href="/intern/login?role=intern" className={styles.secondaryButton}>Existing intern? Sign in <ArrowRight size={15} /></Link>}
  </div>;
}
