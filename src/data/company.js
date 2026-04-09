import { contactInfo } from "./contact";

export const companyInfo = {
  name: "Olentra Technologies",
  legalName: "Olentra Ltd.",
  shortName: "Olentra",
  domain: "https://olentratechnologies.com",
  email: contactInfo.email,
  phone: contactInfo.phone,
  phoneHref: contactInfo.phoneFull,
  emailHref: contactInfo.emailFull,
  calendlyUrl: contactInfo.calendlyUrl,
  logo: "/images/branding/Logo/Olentra-Logo-Without-Background.png",
  defaultOgImage: "/images/products/ai-studio-new.png",
  foundedLabel: "2026",
  tagline: "Enterprise engineering, AI systems, and launch-ready digital products.",
  description:
    "Olentra Technologies designs, builds, and operates enterprise-grade software platforms, AI systems, cloud infrastructure, and high-performance digital experiences for ambitious teams.",
  primaryLocation: "Harrisburg, PA, USA",
  serviceArea: "Global",
  locations: contactInfo.addresses.map((address) => address.value),
  socials: contactInfo.socials,
  navCtaLabel: "Book a Discovery Call",
  trustHighlights: [
    "Security-first delivery",
    "Milestone-based execution",
    "Cross-timezone product teams",
    "Enterprise-grade engineering quality",
  ],
  differentiators: [
    {
      title: "Product and platform depth",
      description:
        "We combine frontend quality, backend architecture, data systems, AI workflows, and production infrastructure in one delivery model.",
    },
    {
      title: "Execution over theater",
      description:
        "Olentra is designed for teams that need a partner who can move from concept to shipped systems with clear accountability.",
    },
    {
      title: "Enterprise discipline",
      description:
        "We prioritize reliability, governance, security, and maintainability from the first sprint rather than bolting them on later.",
    },
  ],
};
