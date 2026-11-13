export const olenbot = {
  hero: {
    title: "Olenbot",
    titleAccent: "bot",
    tagline: "More leads. Less busywork.",
    taglineHighlight: "",
    subheading:
      "Automate conversations and follow-ups. Track results in one place.",
    primaryCta: { label: "Request a Demo", href: "#contact" },
    secondaryCta: { label: "See The Workflow", href: "#architecture" },
    heroImage: "/images/products/olen-bot.png",
  },
  overview: {
    summary:
      "Built for outbound and growth teams, Olenbot brings lead capture, calling, follow-up, and reporting into one product flow so teams can spend less time managing tools and more time closing qualified opportunities.",
    attributes: [
      { label: "Lead Capture", value: "Bring prospects into one workflow instead of scattered sources" },
      { label: "AI Calling", value: "Run consistent outbound conversations at scale" },
      { label: "Follow-Up Layer", value: "Trigger WhatsApp outreach based on real call outcomes" },
      { label: "Analysis", value: "See intent, sentiment, and next steps without manual review" },
      { label: "Dashboard", value: "Give teams one place to manage outreach performance" },
      { label: "Compliance", value: "Operate with controlled pacing and outreach safeguards" },
    ],
    stats: [
      { label: "Best Fit", value: "Outbound Teams" },
      { label: "Core Value", value: "Faster Follow-Up" },
      { label: "Team Benefit", value: "Less Tool Switching" },
      { label: "Reach", value: "India + Global" },
    ],
  },
  features: [
    {
      title: "Automated Lead Collection",
      description:
        "Collect leads faster and keep outreach lists cleaner before the team starts calling.",
    },
    {
      title: "Queued Call Orchestration",
      description:
        "Keep outbound activity organized with controlled scheduling, retries, and paced call flow.",
    },
    {
      title: "Live AI Voice Agent",
      description:
        "Run consistent AI-assisted conversations that help teams qualify interest at scale.",
    },
    {
      title: "WhatsApp Conversion Layer",
      description:
        "Follow up automatically after calls so interested leads don’t go cold between touchpoints.",
    },
    {
      title: "Call Intelligence",
      description:
        "Turn conversations into simple decisions, summaries, and next actions your team can use immediately.",
    },
    {
      title: "Operator Dashboard",
      description:
        "Manage the full outbound process from one dashboard instead of stitching together disconnected tools.",
    },
  ],
  pipeline: [
    {
      stage: "Collect Leads",
      model: "Lead Intake",
      output: "Qualified prospects entering one shared system",
    },
    {
      stage: "Prepare Outreach",
      model: "Queue Management",
      output: "Organized calling flow for the team",
    },
    {
      stage: "Run Conversations",
      model: "AI Calling",
      output: "Consistent outreach with live response handling",
    },
    {
      stage: "Send Follow-Up",
      model: "WhatsApp Automation",
      output: "Timely post-call outreach",
    },
    {
      stage: "Review Outcomes",
      model: "Call Intelligence",
      output: "Intent, summary, and next-step clarity",
    },
    {
      stage: "Track Performance",
      model: "Team Dashboard",
      output: "Visibility into outreach and conversion progress",
    },
  ],
  systems: [
    "A cleaner path from lead collection to first contact",
    "Fewer manual handoffs between calling and follow-up",
    "More consistent outreach quality across operators",
    "Faster review of what happened on every call",
    "One dashboard for conversations, follow-up, and reporting",
    "Better visibility into team performance and lead quality",
    "Less tool switching for outbound teams",
    "A workflow designed for repeatable conversion activity",
  ],
  security: [
    {
      area: "Calling Compliance",
      control: "Guardrails around compliant outreach activity",
      priority: "Critical",
    },
    {
      area: "Access Control",
      control: "Controlled access for managers and operators",
      priority: "High",
    },
    {
      area: "Secrets",
      control: "Safer handling of platform credentials",
      priority: "High",
    },
    {
      area: "Observability",
      control: "Clear visibility into system and team activity",
      priority: "High",
    },
    {
      area: "Storage",
      control: "Reliable storage for call history and reporting",
      priority: "High",
    },
    {
      area: "Auditability",
      control: "Audit-ready records across the outreach lifecycle",
      priority: "Medium",
    },
  ],
  techStack: {
    collection: [
      "Find and organize leads faster",
      "Keep business data cleaner before outreach",
      "Reduce duplicates in calling queues",
      "Build stronger lead lists from multiple sources",
      "Improve outbound readiness before the first call",
      "Support a more reliable top-of-funnel workflow",
    ],
    intelligence: [
      "Run AI-assisted voice conversations at scale",
      "Capture what prospects actually said",
      "Create more natural calling experiences",
      "Handle objections and qualification more consistently",
      "Generate summaries and intent signals automatically",
      "Help teams act on conversations faster",
    ],
    delivery: [
      "Manage outreach from one dashboard",
      "Track performance and call history in one place",
      "Keep operators aligned on lead status",
      "Review recordings, summaries, and next steps easily",
      "Give managers visibility into conversion flow",
      "Support daily outbound operations with less friction",
    ],
  },
  dashboard: [
    "Lead workspace - keep prospect activity organized in one place",
    "Call workspace - follow live activity without scattered tabs",
    "Conversation review - understand what happened and what comes next",
    "Performance view - see lead quality, call activity, and team momentum",
    "Follow-up tracking - stay on top of message delivery and response flow",
    "Team controls - manage working hours, access, and outreach settings cleanly",
  ],
  pricing: {
    tiers: ["Lean Pilot", "Growth", "Scale", "Enterprise"],
    rows: [
      { label: "Best For", values: ["Small Pilots", "Growing Teams", "High-Volume Outreach", "Custom Operations"] },
      { label: "Daily Activity", values: ["Starter", "Steady", "Scaled", "Custom"] },
      { label: "Conversation Support", values: ["Core", "Enhanced", "Advanced", "Custom"] },
      { label: "Follow-Up Depth", values: ["Basic", "Automated", "Multi-Step", "Custom"] },
      { label: "Team Access", values: ["Small Team", "Manager + Reps", "Cross-Team", "Unlimited"] },
      { label: "Commercial Model", values: ["Entry", "Growth", "Scale", "Custom Quote"] },
    ],
  },
  roadmap: [
    {
      phase: "Launch A Pilot",
      highlights: [
        "Get the team into one shared outbound workflow",
        "Start testing lead quality and outreach patterns quickly",
        "Reduce manual effort in early outreach cycles",
        "Build confidence around how the team will use the product",
      ],
    },
    {
      phase: "Increase Team Throughput",
      highlights: [
        "Handle more conversations without increasing coordination chaos",
        "Create more consistent outreach across the team",
        "Improve response handling during active calling",
        "Keep call outcomes easier to review and act on",
      ],
    },
    {
      phase: "Improve Follow-Up Quality",
      highlights: [
        "Send faster follow-up after real conversations happen",
        "Help the team act on interest signals more consistently",
        "Make callbacks and next steps easier to manage",
        "Keep prospects warmer between touchpoints",
      ],
    },
    {
      phase: "Scale Outreach Operations",
      highlights: [
        "Give managers clearer visibility into team performance",
        "Support higher outbound volume with less friction",
        "Maintain control as more operators join the workflow",
        "Create a more repeatable conversion process",
      ],
    },
  ],
};
