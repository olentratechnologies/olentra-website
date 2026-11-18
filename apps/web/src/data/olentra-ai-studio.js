// Content source: Olentra AI Video Generator — Architecture & Tech Stack workbook (research checked 15 Oct 2026).
export const olentraAiStudio = {
  hero: {
    title: "Olentra AI Studio",
    titleAccent: "AI Studio",
    tagline: "Turn a creative brief into publish-ready cinematic video.",
    taglineHighlight: "publish-ready cinematic video",
    subheading:
      "Storyboard, generate, edit and publish short-form video for brands, agencies and creators, with consistent characters, fast turnaround and cost you control.",
    primaryCta: { label: "Request a Demo", href: "#contact" },
    secondaryCta: { label: "See How It Works", href: "#architecture" },
    heroImage: "/images/products/ai-studio-new.png",
  },
  overview: {
    eyebrow: "Product Goal",
    heading: ["Built for", "Publish-Ready Video"],
    summary:
      "Most AI video tools give you one model and one clip at a time. Olentra AI Studio plans the whole video first, routes every shot to the best-fit video model, keeps characters and products consistent across scenes, then composes, captions, scores and exports a finished video ready for Reels, Shorts and TikTok.",
    stats: [
      { label: "Best For", value: "Brands & Agencies" },
      { label: "Output", value: "1080p Video" },
      { label: "Formats", value: "9:16 · 16:9 · 1:1" },
      { label: "Models", value: "Multi-Model" },
    ],
    attributes: [
      {
        label: "Core Promise",
        value: "Brief to approved, downloadable video in one guided flow",
      },
      {
        label: "Visual Quality",
        value: "Premium cinematic clips with native, synchronised audio",
      },
      {
        label: "Consistency",
        value: "Same character, brand and product held across every shot",
      },
      {
        label: "Speed",
        value: "Parallel shot generation with live progress, no full rebuilds",
      },
      {
        label: "Cost Control",
        value: "Per-shot cost estimates, credit wallet and spend caps",
      },
      {
        label: "Safe Publishing",
        value: "Licensed audio, consent records and approved platform APIs",
      },
    ],
  },
  featuresIntro: {
    heading: ["Cinematic", "Video Engine"],
    blurb:
      "A creative control plane on top of the strongest video models, so every shot is planned, routed, checked and composed before you publish.",
  },
  features: [
    {
      title: "Script & Storyboard AI",
      description:
        "Turn a brief and brand kit into a script, shot list and typed storyboard with timings, framing and narrative constraints.",
    },
    {
      title: "Multi-Model Routing",
      description:
        "Each shot is sent to the best-fit video model by style, cost, resolution and availability, with automatic fallback when a provider is busy.",
    },
    {
      title: "Character & Product Lock",
      description:
        "Reference boards, first/last frames and scene lock keep the same actor, logo and SKU consistent across linked shots.",
    },
    {
      title: "Voice, Music & Captions",
      description:
        "Expressive narration, original or licensed music beds, word-timed captions and loudness-normalised mixing in one pass.",
    },
    {
      title: "Timeline Editor",
      description:
        "Preview, trim, cut and reorder in the browser, then regenerate only the scene you rejected instead of rebuilding the whole video.",
    },
    {
      title: "One-Click Publishing",
      description:
        "Export 9:16, 16:9 and 1:1 in parallel, then post to YouTube, Instagram Reels and TikTok through official APIs or download.",
    },
  ],
  pipelineIntro: {
    eyebrow: "Generation Pipeline",
    heading: ["From Brief", "To Publish"],
  },
  aiPipeline: [
    {
      stage: "Brief & Brand Kit",
      model: "Next.js project editor",
      output: "Brief, references, brand assets and target channels",
    },
    {
      stage: "Script & Shot List",
      model: "Gemini 3.1 Pro / GPT-5.4",
      output: "Typed storyboard JSON with scenes and timings",
    },
    {
      stage: "Reference Board",
      model: "Gemini 3.1 Flash Image / FLUX.2",
      output: "Consistent style, character sheets and product frames",
    },
    {
      stage: "Shot Generation",
      model: "Veo / Runway / Seedance / Kling",
      output: "Short cinematic clips with native sound, routed per shot",
    },
    {
      stage: "Quality Gates",
      model: "Computer vision + editorial review",
      output: "Continuity, text and policy checks with selective re-renders",
    },
    {
      stage: "Audio, Compose & Publish",
      model: "ElevenLabs + FFmpeg / Remotion",
      output: "Mixed, captioned 1080p export posted or downloaded",
    },
  ],
  microservices: [
    "Typed scene manifest for every video",
    "Per-shot model routing with fallback",
    "Selective scene regeneration",
    "Durable jobs that resume after failures",
    "Version history and undo on the timeline",
    "Cost per accepted minute tracked per project",
  ],
  confidenceBlurb:
    "Commercial video needs rights you can prove. Every production carries its licences, consent records and approvals.",
  security: [
    {
      area: "Rights",
      control: "Licensed audio and authorised likeness",
      priority: "Critical",
    },
    {
      area: "Privacy",
      control: "Tenant-isolated media and signed URLs",
      priority: "Critical",
    },
    {
      area: "Billing",
      control: "No double charges on retries",
      priority: "Critical",
    },
    {
      area: "Moderation",
      control: "Prompt, upload and output policy checks",
      priority: "Critical",
    },
    {
      area: "Publishing",
      control: "Official platform APIs with AI-content disclosure",
      priority: "High",
    },
    {
      area: "Recovery",
      control: "Backups and point-in-time restore for projects",
      priority: "High",
    },
  ],
  stackIntro: {
    eyebrow: "Built For",
    heading: ["Creator Types", "& Outcomes"],
  },
  creatorTypes: [
    {
      title: "Brands",
      description: "Product videos, ads and social content at scale",
      outcomes: [
        "Launch campaigns in hours",
        "Brand-consistent output",
        "Multi-format exports"
      ]
    },
    {
      title: "Agencies",
      description: "Faster client turnarounds with reusable assets",
      outcomes: [
        "Rapid iterations",
        "Template libraries",
        "Client portals"
      ]
    },
    {
      title: "Creators",
      description: "Professional output without production overhead",
      outcomes: [
        "Broadcast-ready quality",
        "Licensed audio included",
        "One-click publishing"
      ]
    }
  ],
  creativeOutcomes: [
    {
      metric: "Hours",
      label: "Brief to video",
      detail: "From days to hours"
    },
    {
      metric: "80%",
      label: "Cost reduction",
      detail: "vs traditional production"
    },
    {
      metric: "1080p",
      label: "Broadcast quality",
      detail: "With licensed audio"
    },
    {
      metric: "3x",
      label: "Format multiplier",
      detail: "9:16, 16:9, 1:1 from one brief"
    },
    {
      metric: "100%",
      label: "Character consistency",
      detail: "Across every shot"
    },
    {
      metric: "Zero",
      label: "Surprise bills",
      detail: "Transparent per-shot pricing"
    }
  ],
  roadmapIntro: "Rollout Path",
  roadmap: [
    {
      phase: "Prototype · Days 0–30",
      highlights: [
        "Next.js studio, brand kits and secure uploads",
        "Script and storyboard JSON generator",
        "Veo, Runway and Seedance/Kling adapters",
        "First reproducible 30s 9:16 1080p video",
      ],
    },
    {
      phase: "Sellable MVP · Days 30–60",
      highlights: [
        "Editable shot list and timeline preview",
        "Economy / balanced / premium model routing",
        "Narration, licensed music and captions",
        "Credit wallet, subscriptions and paid design partners",
      ],
    },
    {
      phase: "Production Beta · Days 60–90",
      highlights: [
        "Human approvals and version history",
        "YouTube, Instagram Reels and TikTok publishing",
        "Rights, consent and likeness verification",
        "Provider fallback drills and load testing",
      ],
    },
  ],
  pricingIntro: {
    eyebrow: "Plans",
    heading: "Fit By Production Volume",
    labelHeader: "Plan Detail",
  },
  pricing: {
    tiers: ["Economy", "Balanced", "Premium", "Enterprise"],
    rows: [
      { label: "Best For", values: ["Template ads & reels", "Creator studios", "Cinematic brand films", "Agencies at scale"] },
      { label: "Video Models", values: ["High-volume models", "Routed best-fit models", "Top cinematic models", "Custom routing + volume deals"] },
      { label: "Consistency", values: ["Template-based", "Reference boards", "Reference lock + QA", "Brand kits per client"] },
      { label: "Editing", values: ["Template edits", "Timeline editor", "Timeline + scene redo", "Multi-workspace approvals"] },
      { label: "Publishing", values: ["Download", "Download + social APIs", "Scheduled publishing", "Bulk campaigns + analytics"] },
      { label: "Support", values: ["Self-serve", "Priority", "High-touch", "SSO, SLAs and dedicated"] },
    ],
  },
  cta: {
    heading: ["Launch Your", "AI Studio"],
    body: "Book a walkthrough to see a brief turn into a publish-ready video with consistent characters, licensed audio and controlled cost.",
  },
};
