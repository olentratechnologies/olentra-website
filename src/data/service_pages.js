import { serviceGroups } from "./services";

export const servicePageContent = [
  {
    slug: "platform-engineering",
    name: "Platform Engineering",
    heroTitle: "Platform engineering for teams that need reliability at speed.",
    heroDescription:
      "We design backend systems, real-time services, internal platforms, and workflow automation that reduce operational drag and increase release confidence.",
    intro:
      "Olentra helps teams replace fragile delivery paths with production-ready engineering systems built for scale, observability, and maintainability.",
    outcomes: [
      "Faster delivery through reusable platform foundations",
      "Cleaner APIs and service boundaries for long-term scalability",
      "More reliable release workflows and operational automation",
    ],
    delivery: [
      "Architecture review and system boundary definition",
      "API and service implementation planning",
      "Automation, developer workflow, and operational rollout",
    ],
  },
  {
    slug: "data-ai",
    name: "Data & AI",
    heroTitle: "Data pipelines and AI systems built for real production use.",
    heroDescription:
      "We help companies operationalize analytics, LLM workflows, model delivery, and data infrastructure in ways that create measurable business leverage.",
    intro:
      "Our data and AI work focuses on reliability, observability, and business usefulness rather than demo-only intelligence.",
    outcomes: [
      "Production-grade AI workflows with governance and monitoring",
      "Data systems that improve visibility and decision-making",
      "Faster movement from experimentation to scalable operations",
    ],
    delivery: [
      "Use-case framing and data architecture planning",
      "Pipeline, analytics, and AI workflow implementation",
      "Operational monitoring, rollout, and refinement",
    ],
  },
  {
    slug: "cloud-security",
    name: "Cloud & Security",
    heroTitle: "Cloud architecture and security built for serious operations.",
    heroDescription:
      "We design cloud environments, deployment systems, and security controls that support enterprise expectations without slowing product velocity.",
    intro:
      "This practice is built for teams that need stronger infrastructure, better controls, and more confidence in production environments.",
    outcomes: [
      "Safer deployment and infrastructure patterns",
      "Higher-confidence releases and operational recovery paths",
      "Security controls aligned with business-critical systems",
    ],
    delivery: [
      "Infrastructure and risk posture assessment",
      "Cloud architecture and control design",
      "Environment hardening, automation, and operational guidance",
    ],
  },
  {
    slug: "product-engineering",
    name: "Product Engineering",
    heroTitle: "Product engineering that connects experience quality to system depth.",
    heroDescription:
      "We build web apps, mobile products, commerce systems, and design foundations that translate product strategy into launch-ready software.",
    intro:
      "Olentra combines interface quality, engineering rigor, and deployment readiness so product teams can move from concept to market with confidence.",
    outcomes: [
      "Higher-quality digital products with less rework",
      "A stronger bridge between design and engineering",
      "Systems built for growth, usability, and maintainability",
    ],
    delivery: [
      "Discovery and product framing",
      "Interface and application implementation",
      "Release preparation and post-launch hardening",
    ],
  },
  {
    slug: "seo-organic-growth",
    name: "SEO & Organic Growth",
    heroTitle: "Organic growth systems that connect discoverability to conversion.",
    heroDescription:
      "We improve crawlability, information architecture, content positioning, and search performance so companies can attract and convert higher-intent traffic.",
    intro:
      "This work is designed for businesses that want search to become a durable acquisition channel rather than a side task.",
    outcomes: [
      "Better indexability and search visibility",
      "Clearer content hierarchy aligned to buyer intent",
      "More conversion-ready landing experiences",
    ],
    delivery: [
      "Technical SEO and content structure audit",
      "Landing page and content architecture build-out",
      "Measurement, refinement, and growth iteration",
    ],
  },
  {
    slug: "branding-creative",
    name: "Branding & Creative",
    heroTitle: "Brand and creative systems that make technical companies look as strong as they build.",
    heroDescription:
      "We create positioning, visual systems, and creative assets that sharpen market perception and support higher-trust digital experiences.",
    intro:
      "Our branding work is built to support growth, sales, and product storytelling rather than existing only as a visual layer.",
    outcomes: [
      "Clearer market positioning and credibility",
      "More consistent visual systems across touchpoints",
      "Creative assets that support product and growth initiatives",
    ],
    delivery: [
      "Brand diagnosis and positioning direction",
      "Identity, messaging, and asset system creation",
      "Website and campaign-ready rollout guidance",
    ],
  },
  {
    slug: "sales-growth",
    name: "Sales Growth",
    heroTitle: "Growth systems for teams that need stronger acquisition and follow-through.",
    heroDescription:
      "We build funnels, lifecycle operations, CRM workflows, and conversion infrastructure that help revenue teams move with more consistency.",
    intro:
      "This practice connects outbound systems, lifecycle messaging, and commercial operations into repeatable growth execution.",
    outcomes: [
      "Cleaner lead flow and follow-up systems",
      "Better visibility into conversion performance",
      "Stronger coordination between growth and operations",
    ],
    delivery: [
      "Acquisition and lifecycle workflow mapping",
      "Funnel and CRM systems implementation",
      "Measurement, optimization, and operating rhythm support",
    ],
  },
];

export const servicePages = servicePageContent.map((page) => {
  const group = serviceGroups.find((item) => item.category === page.name);
  return {
    ...page,
    group,
    services: group?.services ?? [],
  };
});

export function getServicePageBySlug(slug) {
  return servicePages.find((page) => page.slug === slug);
}
