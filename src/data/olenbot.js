export const olenbot = {
  hero: {
    title: "Olenbot",
    tagline: "AI outbound calling, WhatsApp follow-up, and lead intelligence in one operating layer.",
    subheading:
      "Olenbot automates lead capture, queued voice outreach, live AI conversations, post-call summarisation, and dashboard reporting for high-volume outbound teams.",
    primaryCta: { label: "Request a Demo", href: "#contact" },
    secondaryCta: { label: "View Architecture", href: "#architecture" },
    heroImage: "/images/products/olen-bot.png",
  },
  overview: {
    summary:
      "Built for SMB growth teams and outbound operators, Olenbot moves from scraped business data to compliant call execution, structured transcript analysis, WhatsApp follow-up, and reporting without breaking the workflow across separate tools.",
    attributes: [
      { label: "Lead Sources", value: "Maps, directories, APIs, and managed scraping actors" },
      { label: "Call Engine", value: "Queued PSTN outreach with live STT, TTS, and LLM control" },
      { label: "Follow-Up Layer", value: "Automated WhatsApp templates triggered by call outcomes" },
      { label: "Analysis", value: "Intent, sentiment, summaries, and callback extraction" },
      { label: "Dashboard", value: "Lead tables, call detail, analytics, and operator settings" },
      { label: "Compliance", value: "Rate limits, DND scrubbing, and role-based access control" },
    ],
    stats: [
      { label: "Processing Flow", value: "9 Layers" },
      { label: "Call Queue", value: "Redis + BullMQ" },
      { label: "Primary AI", value: "GPT-4o" },
      { label: "Target Market", value: "India + Global" },
    ],
  },
  features: [
    {
      title: "Automated Lead Collection",
      description:
        "Scrapes JavaScript-heavy directories, enriches businesses with Google Places, validates Indian phone numbers, and deduplicates records before queueing.",
    },
    {
      title: "Queued Call Orchestration",
      description:
        "Routes leads through Redis-backed workers with scheduling, retry controls, rate limiting, and compliance-aware pacing.",
    },
    {
      title: "Live AI Voice Agent",
      description:
        "Combines PSTN calling, real-time transcription, neural speech synthesis, and objection handling for production outbound conversations.",
    },
    {
      title: "WhatsApp Conversion Layer",
      description:
        "Triggers approved template messages, brochures, and follow-up media after calls based on disposition and lead status.",
    },
    {
      title: "Call Intelligence",
      description:
        "Transforms raw transcripts into summaries, hot-warm-cold classification, sentiment scores, and structured callback data.",
    },
    {
      title: "Operator Dashboard",
      description:
        "Gives teams a central view across leads, active calls, recordings, analytics, templates, settings, and export-ready reports.",
    },
  ],
  pipeline: [
    {
      stage: "Lead Capture",
      model: "Scrapers + Places API",
      output: "Structured business records with validated phone numbers",
    },
    {
      stage: "Queue Orchestration",
      model: "Redis + Workers",
      output: "Ordered call jobs with retries, pacing, and scheduling",
    },
    {
      stage: "AI Voice Session",
      model: "Twilio, Whisper, ElevenLabs, GPT-4o",
      output: "Live outbound call with transcript and call status events",
    },
    {
      stage: "WhatsApp Follow-Up",
      model: "Meta WA Cloud API / BSP",
      output: "Template-based follow-up messages and media delivery",
    },
    {
      stage: "Call Analysis",
      model: "LangChain + GPT-4o + Claude",
      output: "Intent, sentiment, summary, and extracted lead details",
    },
    {
      stage: "Dashboard Delivery",
      model: "FastAPI + Next.js",
      output: "Real-time analytics, playback, exports, and operator controls",
    },
  ],
  systems: [
    "Web Scraping Layer - Playwright, Scrapy, BeautifulSoup, Places API",
    "Queue & Scheduling - Redis, BullMQ, Celery, APScheduler, n8n",
    "Voice Runtime - Twilio / Exotel, Whisper, ElevenLabs, Live streaming",
    "WhatsApp Outreach - Meta Cloud API, WATI, media templates",
    "Analysis Engine - LangChain, GPT-4o, Claude, sentiment prompts",
    "Backend Control Plane - FastAPI, JWT / Clerk, webhooks, WebSockets",
    "Data Layer - PostgreSQL, Redis, pgvector, S3 / R2",
    "Frontend Ops Dashboard - Next.js, Tailwind, shadcn/ui, charts, tables",
  ],
  security: [
    {
      area: "Calling Compliance",
      control: "TRAI DND scrubbing and rate-limited call throughput",
      priority: "Critical",
    },
    {
      area: "Access Control",
      control: "JWT or managed auth with role-based dashboard permissions",
      priority: "High",
    },
    {
      area: "Secrets",
      control: "Central API key storage via AWS Secrets Manager",
      priority: "High",
    },
    {
      area: "Observability",
      control: "Sentry, Datadog, and runtime event monitoring",
      priority: "High",
    },
    {
      area: "Storage",
      control: "Managed Postgres with object storage for recordings and exports",
      priority: "High",
    },
    {
      area: "Auditability",
      control: "Webhook event tracking and persisted call lifecycle data",
      priority: "Medium",
    },
  ],
  techStack: {
    collection: [
      "Playwright",
      "Scrapy",
      "BeautifulSoup4",
      "Google Places API",
      "Bright Data / Apify",
      "libphonenumber",
    ],
    intelligence: [
      "Twilio Voice / Exotel",
      "OpenAI Whisper",
      "ElevenLabs / Azure TTS",
      "GPT-4o",
      "Claude Sonnet",
      "LangChain",
    ],
    delivery: [
      "FastAPI",
      "PostgreSQL / Supabase",
      "Redis / Upstash",
      "Next.js 14",
      "Socket.io",
      "AWS S3 / Cloudflare R2",
    ],
  },
  dashboard: [
    "Lead Database - searchable lead table with city, category, status, and CSV export",
    "Call Centre - active call controls with live transcript and status tracking",
    "Call Detail View - recording playback, transcript, AI summary, and intent badge",
    "Analytics Dashboard - funnel, lead quality, call volume, and WhatsApp performance",
    "WhatsApp Log - delivery status, read receipts, and template usage history",
    "Settings - calling hours, API keys, message templates, users, and compliance rules",
  ],
  pricing: {
    tiers: ["Lean Pilot", "Growth", "Scale", "Enterprise"],
    rows: [
      { label: "Calls / Day", values: ["100", "250", "500", "Custom"] },
      { label: "Voice Runtime", values: ["Shared", "Priority", "Dedicated", "Multi-Region"] },
      { label: "AI Analysis", values: ["Summary", "Intent + Summary", "Full Scoring", "Custom Models"] },
      { label: "WhatsApp Layer", values: ["Manual Trigger", "Auto Templates", "Multi-Flow", "Custom BSP"] },
      { label: "Dashboard Users", values: ["3", "10", "25", "Unlimited"] },
      { label: "Estimated Infra", values: ["~$250/mo", "~$480/mo", "~$764/mo", "Custom Quote"] },
    ],
  },
  roadmap: [
    {
      phase: "Month 1 - Foundation",
      highlights: [
        "Repo, Docker, CI/CD, and Cloudflare edge setup",
        "PostgreSQL schema and migration baseline",
        "FastAPI auth and lead CRUD layer",
        "Initial scraper and deduplicated lead ingestion",
      ],
    },
    {
      phase: "Month 2 - Calling Engine",
      highlights: [
        "Twilio outbound calls and webhook handling",
        "Whisper transcript capture and ElevenLabs playback",
        "GPT-4o conversation loop for outbound pitch flow",
        "Call recording storage with DB references",
      ],
    },
    {
      phase: "Month 3-4 - Analysis and WhatsApp",
      highlights: [
        "Transcript cleaning, intent scoring, and summary generation",
        "Callback time and key-info extraction",
        "Meta WhatsApp templates and post-call triggers",
        "Message delivery status tracking in the dashboard",
      ],
    },
    {
      phase: "Month 5-6 - Dashboard and Launch",
      highlights: [
        "Lead tables, analytics charts, waveform playback, and live updates",
        "Settings, user roles, and exports",
        "TRAI DND compliance and security hardening",
        "Soft launch with real lead batches and quality review",
      ],
    },
  ],
};
