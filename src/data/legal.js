import { companyInfo } from "./company";

export const legalPages = {
  privacy: {
    title: "Privacy Policy",
    description:
      "How Olentra Technologies collects, uses, stores, and protects personal information across our website, products, and business communications.",
    sections: [
      {
        heading: "Information we collect",
        body: [
          "We collect information you submit through contact forms, demo requests, scheduling links, and direct email communication. This may include your name, company name, business email, phone number, and details about your project or operational requirements.",
          "We also collect basic usage and device information through website analytics and hosting logs to understand site performance, security posture, and general user behavior.",
        ],
      },
      {
        heading: "How we use information",
        body: [
          "We use submitted information to respond to inquiries, schedule discovery calls, prepare proposals, support product demonstrations, and improve our service delivery.",
          "We may also use information to maintain website reliability, monitor abuse, understand demand for our services, and support lawful business operations.",
        ],
      },
      {
        heading: "Data sharing",
        body: [
          "We do not sell personal data. We may share limited information with trusted vendors involved in analytics, communications, scheduling, hosting, and infrastructure operations when needed to run our business.",
          "Where required, we may disclose information to comply with legal obligations, protect our systems, or enforce our agreements.",
        ],
      },
      {
        heading: "Retention and rights",
        body: [
          "We retain business contact and inquiry information only as long as reasonably necessary to operate our business, maintain records, fulfill legal obligations, and support ongoing client relationships.",
          `To request access, correction, or deletion of your personal information, contact ${companyInfo.email}.`,
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    description:
      "Terms governing access to the Olentra Technologies website, marketing materials, and business communications.",
    sections: [
      {
        heading: "Use of this website",
        body: [
          "This website is provided for informational and commercial inquiry purposes. You agree not to misuse the site, attempt unauthorized access, interfere with its operation, or use submitted materials for unlawful activity.",
          "We may update, suspend, or remove content at any time to maintain quality, security, and accuracy.",
        ],
      },
      {
        heading: "Intellectual property",
        body: [
          "Unless otherwise stated, all website content, branding, copy, visuals, and product descriptions are the property of Olentra Technologies or its licensors.",
          "You may not reproduce, republish, modify, or redistribute site content for commercial use without written permission.",
        ],
      },
      {
        heading: "No binding offer",
        body: [
          "Website content does not constitute a binding commercial offer, statement of work, or implementation guarantee. Commercial commitments are defined only in executed agreements.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "This website is provided on an as-is basis. To the maximum extent permitted by law, Olentra disclaims implied warranties and is not liable for indirect, incidental, or consequential damages arising from use of the site.",
        ],
      },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    description:
      "Cookie and analytics disclosure for the Olentra Technologies website.",
    sections: [
      {
        heading: "What we use cookies for",
        body: [
          "We use essential and analytics-related technologies to understand website performance, improve navigation, and monitor operational reliability.",
          "These technologies may help us measure visits, understand high-level usage patterns, and detect abuse or service issues.",
        ],
      },
      {
        heading: "Third-party services",
        body: [
          "Some analytics or performance tools may set their own identifiers subject to their own privacy terms. We limit usage to services that support product improvement, monitoring, and growth analysis.",
        ],
      },
      {
        heading: "Your choices",
        body: [
          "You can manage cookies through browser settings and privacy tools. Some website functionality or analytics visibility may be affected if non-essential storage is disabled.",
        ],
      },
    ],
  },
  security: {
    title: "Security",
    description:
      "How Olentra approaches delivery security, operational controls, and responsible handling of modern product and infrastructure work.",
    sections: [
      {
        heading: "Security posture",
        body: [
          "Olentra emphasizes least-privilege access, environment separation, secure credential handling, and production-minded delivery practices from the start of each engagement.",
          "We design solutions with reliability, monitoring, and recoverability in mind so that security is part of execution rather than an afterthought.",
        ],
      },
      {
        heading: "Delivery controls",
        body: [
          "Typical delivery controls include repository access boundaries, protected deployment workflows, audit-friendly operational patterns, and staged release practices tailored to the client environment.",
        ],
      },
      {
        heading: "Responsible disclosure",
        body: [
          `If you believe you have discovered a security issue related to our website or public materials, contact ${companyInfo.email}. Please include enough detail for us to investigate responsibly.`,
        ],
      },
    ],
  },
  accessibility: {
    title: "Accessibility",
    description:
      "Olentra's commitment to making our digital presence more usable, understandable, and accessible across devices and user needs.",
    sections: [
      {
        heading: "Our approach",
        body: [
          "We aim to create digital experiences that are readable, navigable, and usable across screen sizes, input methods, and assistive contexts.",
          "Accessibility is treated as a practical quality standard alongside performance, resilience, and design consistency.",
        ],
      },
      {
        heading: "Ongoing improvements",
        body: [
          "We continue improving contrast, semantic structure, keyboard usability, meaningful link text, and responsive behavior across our site and product work.",
        ],
      },
      {
        heading: "Feedback",
        body: [
          `If you encounter an accessibility barrier, contact ${companyInfo.email} and we will review the issue and work toward an appropriate fix.`,
        ],
      },
    ],
  },
};
