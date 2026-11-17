import { companyInfo } from "./company";

export const legalPages = {
  privacy: {
    title: "Privacy Policy",
    eyebrow: "Privacy & Data Protection",
    effectiveDate: "January 1, 2026",
    lastUpdated: "November 17, 2026",
    version: "2.4",
    description:
      "This Privacy Policy outlines how Olentra Ltd. (operating as Olentra Technologies) collects, processes, stores, and safeguards personal information across our website, client platforms, enterprise services, and communications.",
    summaryNotice:
      "At Olentra Technologies, data privacy and operational security are foundational to our engineering methodology. We strictly do not sell personal data, and we do not utilize client proprietary code or confidential datasets to train public or foundational artificial intelligence models.",
    sections: [
      {
        id: "introduction",
        number: "1",
        heading: "Introduction & Scope of Policy",
        summary:
          "Defines the scope of this policy and Olentra's regulatory commitments.",
        body: [
          "This Privacy Policy (\"Policy\") governs the collection, processing, transfer, storage, and protection of personal data by Olentra Ltd., trading as Olentra Technologies (\"Olentra\", \"we\", \"us\", or \"our\"), having its primary engineering and operating presence in Hyderabad, Telangana, India.",
          "This Policy applies to individuals who visit our website (https://www.olentratechnologies.com), submit commercial inquiries, request technical demonstrations, participate in our internship and talent initiatives, access client collaboration portals, or engage with our enterprise technology engineering services.",
          "By accessing or using our website or services, you acknowledge that you have read and understood the data practices set forth in this Policy. If you do not agree with these practices, please refrain from submitting personal data or interacting with our digital touchpoints."
        ]
      },
      {
        id: "data-fiduciary",
        number: "2",
        heading: "Data Fiduciary & Controller Capacity",
        summary:
          "Explains Olentra's legal capacity under international data protection laws.",
        body: [
          "Under applicable data protection frameworks—including the Digital Personal Data Protection Act, 2023 (DPDP Act, India), the General Data Protection Regulation (Regulation (EU) 2016/679 - GDPR), the UK Data Protection Act 2018, and relevant United States privacy statutes—Olentra functions in distinct capacities:",
          "1. As a Data Fiduciary / Data Controller: Olentra determines the purposes and means of processing personal data collected directly through our public website, marketing communications, demo scheduling workflows, job and internship applications, and supplier engagements.",
          "2. As a Data Processor / Commercial Service Provider: When Olentra engineers custom software, operates cloud infrastructure, or deploys AI pipelines for enterprise clients, client-provided datasets and end-user data are processed strictly in accordance with executed Master Services Agreements (MSAs), Statements of Work (SOWs), and Data Processing Agreements (DPAs)."
        ]
      },
      {
        id: "data-we-collect",
        number: "3",
        heading: "Information We Collect",
        summary:
          "Itemizes the categories of personal data collected directly, automatically, and through third parties.",
        body: [
          "We collect personal information necessary to deliver enterprise engineering solutions, maintain infrastructure security, and fulfill commercial requests. The categories of data collected include:"
        ],
        subsections: [
          {
            title: "A. Information Provided Directly by You",
            body: [
              "We collect information submitted through contact forms, meeting reservation links (e.g. Calendly), demo inquiries, direct email correspondence, and portal registration.",
              "This data includes: full legal name, business email address, corporate telephone number, job title, company name, geographic location, project requirements, architectural specifications, and any documentation voluntarily attached."
            ]
          },
          {
            title: "B. Technical & Telemetry Data Collected Automatically",
            body: [
              "When you navigate our website, our servers and monitoring tools automatically log technical telemetry to ensure security, latency optimization, and platform stability.",
              "This data includes: Internet Protocol (IP) address, approximate geolocation, browser type and version, operating system, device hardware identifiers, referring and exit URLs, session duration, and page interaction telemetry."
            ]
          },
          {
            title: "C. Recruitment and Internship Information",
            body: [
              "For candidates applying to our engineering internships, fellowship programs, or career opportunities, we collect: curriculum vitae (CV/resume), educational credentials, portfolio repositories (e.g., GitHub), LinkedIn profiles, interview assessments, and identification verification records required by local labor regulations."
            ]
          }
        ]
      },
      {
        id: "legal-bases",
        number: "4",
        heading: "Lawful Bases for Processing",
        summary:
          "Identifies the specific legal grounds under which we process personal information.",
        body: [
          "We process personal information only when authorized by applicable statutory legal grounds, specifically:",
          "• Performance of a Contract: Necessary to execute agreements, deliver technical deliverables, provision development environments, or take pre-contractual steps at your request.",
          "• Legitimate Business Interests: Operating, evaluating, and enhancing our services, maintaining enterprise security controls, investigating fraud or unauthorized access, and conducting legitimate B2B commercial outreach.",
          "• Explicit Consent: Where you have provided clear, affirmative consent for specific purposes, such as receiving technical whitepapers, marketing newsletters, or non-essential cookies.",
          "• Legal and Regulatory Compliance: Fulfilling obligations under corporate governance, tax, export control, anti-money laundering, or court mandates."
        ]
      },
      {
        id: "processing-purposes",
        number: "5",
        heading: "How We Utilize Your Information",
        summary:
          "Specifies the commercial and technical purposes for which data is processed.",
        body: [
          "We utilize collected data exclusively for authorized business and engineering operations, including:",
          "1. Evaluating project scopes, scheduling architecture discovery workshops, and providing custom technical proposals.",
          "2. Designing, implementing, verifying, and maintaining custom enterprise software, AI systems, and cloud infrastructure.",
          "3. Operating and administering applicant portals, verified credential systems, and intern onboarding workflows.",
          "4. Enforcing our Terms of Service, detecting anomalous platform behavior, mitigating denial-of-service threats, and protecting network integrity.",
          "5. Complying with statutory audits, financial accounting requirements, and regulatory requests from competent legal authorities."
        ]
      },
      {
        id: "ai-data-protection",
        number: "6",
        heading: "Artificial Intelligence & Client Data Confidentiality",
        summary:
          "Outlines our strict protocols regarding artificial intelligence, proprietary code, and training sets.",
        body: [
          "As an engineering organization building modern AI platforms and enterprise software, Olentra maintains rigorous boundaries regarding artificial intelligence data handling:",
          "• No Public AI Model Training: Olentra does not sell, license, or feed any client proprietary code, architecture designs, business communications, or confidential personal information into public or foundational AI model training sets (including models from OpenAI, Anthropic, Google, or Meta).",
          "• Enterprise-Grade AI Invocations: Where generative AI APIs or Large Language Model (LLM) agents are integrated into client systems, processing occurs under zero-data-retention (ZDR) commercial enterprise agreements, dedicated private VPC deployments, or self-hosted models that guarantee client data is neither retained nor used for model training.",
          "• Synthetic & Sanitized Testing: Engineering evaluations, unit testing, and sandbox simulations are conducted exclusively using synthesized or anonymized mock datasets unless express written client authorization dictates otherwise."
        ],
        callout: {
          type: "info",
          title: "Enterprise AI Security Guarantee",
          text: "Client intellectual property, private source code, and enterprise database records are strictly isolated. Olentra never uses client assets to train third-party public machine learning models."
        }
      },
      {
        id: "cookies-and-tracking",
        number: "7",
        heading: "Cookies, Web Storage & Telemetry",
        summary:
          "Explains the deployment of functional, analytics, and security storage technologies.",
        body: [
          "Our digital properties employ cookies, local storage, and cryptographic session tokens. We categorize these into:",
          "• Essential & Security Cookies: Necessary for navigation, CSRF defense, API route authentication, and load balancing across our infrastructure. These cannot be disabled without impairing site functionality.",
          "• Operational Telemetry & Analytics: Aggregate, anonymized performance measurement (such as network latency, asset load times, and feature engagement metrics) that help us diagnose performance bottlenecks.",
          "You can configure your browser to reject all or some browser cookies, or to alert you when websites set or access cookies. Note that disabling essential storage may impact certain portal functionalities."
        ]
      },
      {
        id: "data-sharing",
        number: "8",
        heading: "Information Sharing & Third-Party Disclosure",
        summary:
          "Details the limited circumstances under which data is disclosed to trusted sub-processors.",
        body: [
          "Olentra does not sell, lease, or monetize personal information. We disclose personal data solely to trusted categories of service providers who are bound by strict confidentiality and data protection covenants:",
          "• Cloud Infrastructure & Hosting: Hyperscale hosting, serverless computing, and edge network providers (e.g., Amazon Web Services, Google Cloud Platform, Vercel, Cloudflare).",
          "• Transactional Communication Providers: Enterprise mail relays and calendar automation services (e.g., Google Workspace, Calendly) utilized solely to facilitate scheduled appointments and inquiry responses.",
          "• Professional Advisors & Statutory Authorities: Independent auditors, legal counsel, and law enforcement agencies when compelled by valid subpoena, court order, or mandatory statutory obligation."
        ]
      },
      {
        id: "international-transfers",
        number: "9",
        heading: "Cross-Border International Data Transfers",
        summary:
          "Describes legal safeguards governing cross-border transfers between jurisdictions.",
        body: [
          "Olentra delivers engineering services to clients across North America, the European Union, the United Kingdom, the Middle East, and the Asia-Pacific region. Consequently, your data may be transferred to, and processed in, jurisdictions other than your country of residence, including India and the United States.",
          "Whenever we transfer personal information across international borders, we ensure adequate legal protections are implemented in compliance with applicable law, including standard contractual clauses (SCCs) approved by the European Commission, relevant international transfer addenda, and strict technical encryption during transit and at rest."
        ]
      },
      {
        id: "data-retention",
        number: "10",
        heading: "Data Retention & Disposal Schedules",
        summary:
          "Outlines criteria for data retention periods and secure cryptographic deletion.",
        body: [
          "We retain personal data only for the period necessary to fulfill the purposes for which it was collected, including the satisfaction of legal, accounting, dispute resolution, and contractual requirements.",
          "• Commercial Inquiries & Demo Data: Retained for up to twenty-four (24) months following the last meaningful communication, after which it is archived or securely purged.",
          "• Client Project Records & Invoices: Retained for seven (7) years following project completion in compliance with statutory financial and taxation audit mandates.",
          "• Internship & Recruitment Submissions: Retained for twelve (12) months following candidate assessment, unless the applicant requests earlier deletion or consents to inclusion in our future talent pool.",
          "Upon expiration of applicable retention periods, data is permanently erased using industry-standard cryptographic sanitization techniques."
        ]
      },
      {
        id: "security-safeguards",
        number: "11",
        heading: "Technical & Organizational Security Safeguards",
        summary:
          "Highlights multi-layered defense controls protecting client data against compromise.",
        body: [
          "Olentra deploys rigorous technical and organizational measures designed to protect personal information against accidental or unlawful destruction, loss, alteration, unauthorized disclosure, or access:",
          "• Cryptographic Controls: Enforced Transport Layer Security (TLS 1.3) for all web traffic in transit, and Advanced Encryption Standard (AES-256) for data at rest.",
          "• Access Governance: Principle of least privilege (PoLP), role-based access control (RBAC), multi-factor authentication (MFA) on all developer repositories and infrastructure consoles.",
          "• Continuous Monitoring: Automated vulnerability management, dependency scanning, runtime anomaly detection, and periodic penetration assessments.",
          "While we implement robust enterprise security protocols, no digital transmission or electronic storage mechanism is entirely impenetrable. In the event of a verified data breach impacting personal rights, Olentra will promptly notify affected parties and regulatory authorities as required by applicable law."
        ]
      },
      {
        id: "privacy-rights",
        number: "12",
        heading: "Your Statutory Privacy Rights",
        summary:
          "Enumerates individual rights under the DPDP Act 2023, GDPR, CCPA, and global privacy frameworks.",
        body: [
          "Depending on your geographic jurisdiction, you are entitled to exercise specific statutory rights regarding your personal data:",
          "• Right to Access / Confirmation: Request confirmation of whether your personal data is being processed, and obtain a copy of such data along with processing details.",
          "• Right to Correction / Rectification: Require correction or completion of inaccurate, incomplete, or out-of-date personal information.",
          "• Right to Erasure ('Right to be Forgotten'): Request the permanent deletion of your personal data where retention is no longer legally justified.",
          "• Right to Restrict or Object to Processing: Restrict the processing of your data under certain circumstances, or object to processing conducted on the basis of legitimate interests.",
          "• Right to Data Portability: Receive your personal data in a structured, commonly used, machine-readable format.",
          "• Right to Withdraw Consent: Withdraw consent at any time without affecting the lawfulness of processing based on consent before its withdrawal.",
          "• DPDP Act Rights (India): Indian residents additionally have the right to grievance redressal and the right to nominate another individual to exercise privacy rights in the event of death or incapacity.",
          `To exercise any of these statutory rights, please submit a formal request to our privacy team at ${companyInfo.email}. We respond to verified requests within thirty (30) days without undue charge.`
        ]
      },
      {
        id: "childrens-privacy",
        number: "13",
        heading: "Children's Privacy Protection",
        summary:
          "States our age restriction regarding enterprise services and web properties.",
        body: [
          "Our website and enterprise engineering services are directed strictly at corporate enterprises, commercial partners, and individuals of legal working age (18 years or older).",
          "We do not knowingly collect, solicit, or maintain personal information from individuals under the age of 18. If we discover that personal data of a minor has been inadvertently collected without verifiable parental consent, we will take immediate measures to delete such data from our records."
        ]
      },
      {
        id: "grievance-officer",
        number: "14",
        heading: "Data Protection & Grievance Redressal Officer",
        summary:
          "Designates our official statutory contact for privacy inquiries and legal complaints.",
        body: [
          "In compliance with the Information Technology Act, 2000, the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and the Digital Personal Data Protection Act, 2023, Olentra has designated a Grievance & Data Protection Officer.",
          "If you have inquiries, complaints, or require grievance redressal regarding the processing of your personal data, you may reach our designated officer:",
          `• Organization: Olentra Ltd. (trading as Olentra Technologies)`,
          `• Attention: Data Protection & Grievance Redressal Officer`,
          `• Primary Email: ${companyInfo.email}`,
          `• Registered Jurisdiction: Hyderabad, Telangana, India`,
          "We will acknowledge receipt of your grievance within forty-eight (48) hours and work to resolve the issue within the statutory timeframes established by law."
        ]
      },
      {
        id: "policy-updates",
        number: "15",
        heading: "Modifications to this Privacy Policy",
        summary:
          "Explains how updates to this document are versioned and communicated.",
        body: [
          "We may periodically revise this Privacy Policy to reflect advancements in our technology systems, service offerings, regulatory amendments, or statutory standards.",
          "Whenever updates are made, we will update the \"Last Updated\" timestamp at the top of this document. For material modifications that substantially alter your privacy rights, we will provide prominent notice on our website or notify registered clients directly via email prior to the changes taking effect. Continued interaction with our website and services following notice constitutes acceptance of the amended Policy."
        ]
      },
      {
        id: "contact-us",
        number: "16",
        heading: "Contact & Legal Communication",
        summary:
          "Official contact channels for general privacy correspondence.",
        body: [
          "For general questions, formal legal notices, or feedback regarding our privacy practices and security posture, please contact our legal and compliance desk:",
          `• General & Privacy Inquiries: ${companyInfo.email}`,
          `• Corporate Website: ${companyInfo.domain}`,
          `• Operating Headquarters: Hyderabad, Telangana, India`
        ]
      }
    ]
  },
  terms: {
    title: "Terms of Service",
    eyebrow: "Legal & Regulatory Framework",
    effectiveDate: "January 1, 2026",
    lastUpdated: "November 17, 2026",
    version: "2.4",
    description:
      "These Terms of Service constitute a legally binding agreement between you and Olentra Ltd. governing access to our website, technology demonstrations, software engineering engagements, and digital services.",
    summaryNotice:
      "These Terms set out the legal framework governing your interactions with Olentra Technologies. They define commercial boundaries, intellectual property allocations, acceptable use standards, warranty disclaimers, and mandatory binding arbitration.",
    sections: [
      {
        id: "introduction",
        number: "1",
        heading: "Introduction & Acceptance of Terms",
        summary:
          "Establishes the binding contract between users/clients and Olentra Ltd.",
        body: [
          "These Terms of Service (\"Terms\", \"Agreement\") constitute a legally binding contract between you (either as an individual or on behalf of the commercial entity you represent, \"Client\", \"User\", or \"you\") and Olentra Ltd., trading as Olentra Technologies (\"Olentra\", \"we\", \"us\", or \"our\"), having its primary engineering and operating operations in Hyderabad, Telangana, India.",
          "By accessing our website (https://www.olentratechnologies.com), submitting inquiries, testing software demonstrations, downloading materials, or contracting for our engineering services, you unconditionally agree to be bound by these Terms and our Privacy Policy.",
          "If you are entering into this Agreement on behalf of a corporation, partnership, or other legal entity, you represent and warrant that you possess the full legal authority to bind that entity to these Terms. If you lack such authority, or if you do not agree with any provision of these Terms, you must not access our website or engage our services."
        ]
      },
      {
        id: "definitions",
        number: "2",
        heading: "Definitions & Interpretation",
        summary:
          "Defines the technical and legal terminology used throughout this agreement.",
        body: [
          "In this Agreement, capitalized terms shall have the following meanings:",
          "• \"Client Materials\" means all data, documentation, designs, software, APIs, credentials, and proprietary assets provided by you to Olentra for the purpose of receiving services.",
          "• \"Deliverables\" means the bespoke software code, system architectures, technical documentation, and digital products specifically developed by Olentra for Client pursuant to an executed Statement of Work.",
          "• \"Olentra IP\" means all pre-existing technologies, development frameworks, architectural patterns, reusable code libraries, algorithms, developer tooling, trademarks, and documentation owned or licensed by Olentra prior to or independent of this Agreement.",
          "• \"Services\" means the technology engineering, AI development, cloud architecture, product design, consulting, and maintenance services furnished by Olentra.",
          "• \"Statement of Work\" or \"SOW\" means an executed formal project agreement, order schedule, or proposal detailing specific project requirements, timelines, milestones, deliverables, and commercial compensation."
        ]
      },
      {
        id: "commercial-inquiries",
        number: "3",
        heading: "Website Use & Commercial Inquiries",
        summary:
          "Clarifies the legal status of website materials, demos, and pricing estimates.",
        body: [
          "This website and its associated content, demonstrations, calculators, and architectural overviews are provided solely for informational and commercial inquiry purposes.",
          "Information presented on this website does not constitute a formal commercial offer, binding warranty, or implementation guarantee. Olentra reserves the unilateral right to update, modify, or discontinue any feature, documentation, or showcase without prior notice.",
          "All commercial commitments, delivery timelines, Service Level Agreements (SLAs), and engineering warranties are established exclusively through executed formal agreements between Olentra and the Client."
        ]
      },
      {
        id: "enterprise-engagements",
        number: "4",
        heading: "Relationship to Master Services Agreements & SOWs",
        summary:
          "Explains order of precedence between website terms and signed commercial contracts.",
        body: [
          "When you engage Olentra for commercial software development, platform engineering, or enterprise AI implementation, the specific scope of work, fees, intellectual property transfers, and warranties will be governed by a separately executed Master Services Agreement (MSA) or Statement of Work (SOW).",
          "Order of Precedence: In the event of any direct conflict or inconsistency between these Terms of Service and an executed MSA or SOW signed by authorized signatories of both parties, the terms of the executed MSA or SOW shall prevail to the extent of such conflict."
        ]
      },
      {
        id: "acceptable-use",
        number: "5",
        heading: "Acceptable Use Policy & System Integrity",
        summary:
          "Strict prohibitions against unauthorized security testing, scraping, and malicious behavior.",
        body: [
          "You agree to use our website, developer environments, and digital portals in full compliance with all applicable local, national, and international laws. You expressly agree that you shall NOT, directly or indirectly:",
          "1. Probe, scan, or test the vulnerability of our websites, APIs, servers, or networks, nor breach or circumvent any authentication, encryption, or security protocols without explicit prior written authorization from Olentra's security team.",
          "2. Utilize automated scripts, scrapers, crawlers, data mining bots, or extraction mechanisms to scrape or harvest site content, developer documentation, or employee profiles.",
          "3. Introduce viruses, Trojan horses, ransomware, worms, logic bombs, or any malicious code intended to disrupt, degrade, or damage Olentra infrastructure or client environments.",
          "4. Engage in denial-of-service (DoS/DDoS) attacks, automated form spamming, or fraudulent inquiry submissions that impose unreasonable loads on our systems.",
          "5. Reverse-engineer, decompile, disassemble, or derive the source code of any proprietary software, demo applications, or platform interfaces made accessible to you.",
          "6. Impersonate Olentra, its officers, employees, or another client, or misrepresent your affiliation with our organization."
        ],
        callout: {
          type: "warning",
          title: "Zero Tolerance Security Enforcement",
          text: "Violations of system integrity or unauthorized penetration attempts will result in immediate termination of access and will be referred to law enforcement and cybersecurity authorities for statutory prosecution."
        }
      },
      {
        id: "intellectual-property",
        number: "6",
        heading: "Intellectual Property Rights & Deliverables",
        summary:
          "Delineates ownership between Olentra pre-existing assets and client bespoke deliverables.",
        body: [
          "Intellectual property rights are strictly allocated as follows:",
          "• Olentra Background IP: Olentra retains exclusive ownership of all right, title, and interest—including all patents, copyrights, trade secrets, trademarks, and know-how—in and to Olentra IP, our website design, branding, internal tooling, reusable software frameworks, and algorithmic architectures.",
          "• Client Foreground Deliverables: Upon full and final payment of all agreed fees specified in an executed SOW, Olentra assigns to Client all right, title, and interest in the bespoke code and visual assets specifically authored for Client as agreed Deliverables, excluding any embedded Olentra Background IP or third-party open-source libraries.",
          "• Embedded Tools & Reusable Libraries: To the extent Olentra incorporates any Olentra Background IP into Client Deliverables, Olentra grants Client a perpetual, worldwide, non-exclusive, fully paid-up license to use, execute, reproduce, and internally modify such embedded IP solely as part of and for the operation of the Deliverable.",
          "• Feedback License: If you provide suggestions, feedback, or improvement ideas to Olentra, you grant us an irrevocable, perpetual, royalty-free, worldwide license to utilize and incorporate such feedback into our products and services without compensation or attribution."
        ]
      },
      {
        id: "ai-systems",
        number: "7",
        heading: "Enterprise AI Systems & Output Disclaimers",
        summary:
          "Specific legal parameters regarding generative AI, algorithmic outputs, and human oversight.",
        body: [
          "Olentra designs, develops, and deploys high-performance artificial intelligence workflows, autonomous agents, and machine learning models. Regarding AI systems:",
          "• Nature of Probabilistic Models: You acknowledge that generative AI models, machine learning heuristics, and autonomous agents operate probabilistically. While Olentra enforces rigorous validation, prompt engineering, and guardrails, algorithmic outputs may occasionally contain inaccuracies, hallucinations, or unexpected variations.",
          "• Human Review Requirement: Client agrees to institute appropriate human-in-the-loop (HITL) oversight and verification before deploying AI outputs into safety-critical, legally binding, clinical, or high-risk operational environments.",
          "• Client Data Boundaries: As set forth in our Privacy Policy, Olentra does not utilize Client confidential data or source code to train public foundational models. Private model fine-tuning or retrieval-augmented generation (RAG) is conducted exclusively within Client-dedicated environments.",
          "• Third-Party AI Providers: Where solutions leverage third-party foundation models (such as Anthropic Claude, OpenAI, Google Cloud Vertex, or AWS Bedrock), availability and performance are subject to the respective third-party vendor's terms and operational uptimes."
        ]
      },
      {
        id: "client-responsibilities",
        number: "8",
        heading: "Client Responsibilities & Data Representations",
        summary:
          "Client warranties concerning data ownership, regulatory authorization, and technical collaboration.",
        body: [
          "To enable Olentra to deliver engineering services effectively, Client represents and warrants that:",
          "1. Client owns or possesses all necessary licenses, permissions, and consents required to furnish Client Materials, APIs, and credentials to Olentra for project execution.",
          "2. Client Materials do not infringe upon any third-party copyright, patent, trademark, trade secret, or privacy right, and do not violate applicable laws.",
          "3. Client will designate authorized technical and commercial representatives to provide timely specifications, review milestones, and furnish deployment approvals.",
          "4. Client is solely responsible for maintaining adequate security, credentials governance, and backup protocols for all systems under Client's direct operational control."
        ]
      },
      {
        id: "fees-and-payment",
        number: "9",
        heading: "Commercial Invoicing, Payment & Taxes",
        summary:
          "Standard commercial terms governing milestone invoicing, currency, and tax obligations.",
        body: [
          "• Invoicing & Milestone Payments: Fees for professional engineering services are invoiced according to the milestone schedule, retainer intervals, or time-and-materials rates set forth in the applicable SOW. Invoices are payable within the net payment terms specified therein (standard Net 15 or Net 30 days).",
          "• Late Payments: Overdue balances may accrue interest at the rate of 1.5% per month (or the maximum statutory rate permitted by law) from the due date until paid in full.",
          "• Suspension for Non-Payment: Olentra reserves the right, following written notice, to pause ongoing engineering sprints, withhold production releases, or suspend access to staging environments if uncontested invoices remain delinquent.",
          "• Taxes: Quoted fees are exclusive of applicable taxes. Client is responsible for all Goods and Services Tax (GST), value-added taxes (VAT), withholding taxes, sales taxes, or duties levied by relevant tax jurisdictions, excluding taxes based solely on Olentra's net corporate income."
        ]
      },
      {
        id: "confidentiality",
        number: "10",
        heading: "Confidentiality & Non-Disclosure",
        summary:
          "Mutual commitments to protect proprietary code, trade secrets, and technical architectures.",
        body: [
          "\"Confidential Information\" means all non-public technical, commercial, financial, or strategic information disclosed by one party (\"Disclosing Party\") to the other (\"Receiving Party\"), whether orally or in writing, that is designated as confidential or reasonably should be understood as confidential given the nature of the information.",
          "• Standard of Care: The Receiving Party agrees to protect Confidential Information with the same degree of care it uses for its own confidential information of like kind (but not less than reasonable care).",
          "• Exclusions: Confidential Information does not include information that: (a) is or becomes publicly available without breach of this Agreement; (b) was known to the Receiving Party prior to disclosure without restriction; (c) is independently developed without reference to the Disclosing Party's Confidential Information; or (d) is rightfully received from a third party without duty of confidentiality.",
          "• Compelled Disclosure: A Receiving Party may disclose Confidential Information to the extent required by applicable law or judicial subpoena, provided it gives prompt written notice to enable the Disclosing Party to seek a protective order."
        ]
      },
      {
        id: "third-party-services",
        number: "11",
        heading: "Third-Party Cloud Services & Open Source",
        summary:
          "Allocation of responsibility regarding cloud hosting, external APIs, and open-source libraries.",
        body: [
          "• Third-Party Cloud Infrastructure: Our software solutions and deployed systems depend on enterprise third-party infrastructure (such as AWS, Google Cloud, Azure, Cloudflare, Vercel, and GitHub). Olentra is not liable for upstream service disruptions, latency spikes, or modifications instigated by third-party cloud hosting providers.",
          "• Open-Source Software (OSS): Certain Deliverables may incorporate open-source libraries licensed under standard permissive licenses (e.g., MIT, Apache 2.0, BSD). Such software is governed by its respective open-source licensing terms, and Olentra assigns no proprietary rights in such external components beyond the scope of those licenses."
        ]
      },
      {
        id: "warranty-disclaimers",
        number: "12",
        heading: "Warranties & Statutory Disclaimers",
        summary:
          "Mandatory legal disclaimer of implied warranties to the fullest extent permitted by law.",
        body: [
          "Olentra warrants that it will perform engineering services with professional diligence, in a good and workmanlike manner, in substantial conformity with executed project specifications.",
          "EXCEPT AS EXPRESSLY STIPULATED IN AN EXECUTED STATEMENT OF WORK, THIS WEBSITE, DEMONSTRATIONS, PLATFORMS, AND ALL SERVICES ARE PROVIDED STRICTLY ON AN \"AS IS\" AND \"AS AVAILABLE\" BASIS.",
          "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE JURISDICTIONAL LAW, OLENTRA DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING WITHOUT LIMITATION ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, QUIET ENJOYMENT, SYSTEM INTEGRATION, OR ACCURACY OF DATA.",
          "OLENTRA DOES NOT WARRANT THAT THE WEBSITE OR SERVICES WILL BE ENTIRELY UNINTERRUPTED, BUG-FREE, SECURE FROM ALL MALICIOUS THREATS, OR THAT SYSTEM DEFECTS WILL BE REMEDIED INSTANTANEOUSLY."
        ],
        callout: {
          type: "legal",
          title: "Conspicuous Warranty Disclaimer",
          text: "ALL DIGITAL CONTENT, ARCHITECTURAL PATTERNS, DEMOS, AND GENERAL SERVICES ARE DELIVERED 'AS IS' WITHOUT ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR ERROR-FREE CONTINUITY."
        }
      },
      {
        id: "limitation-of-liability",
        number: "13",
        heading: "Limitation of Liability",
        summary:
          "Establishes statutory liability caps and mutual waivers of consequential damages.",
        body: [
          "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL OLENTRA, ITS AFFILIATES, DIRECTORS, OFFICERS, EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE UNDER ANY CONTRACT, NEGLIGENCE, STRICT LIABILITY, OR OTHER LEGAL OR EQUITABLE THEORY FOR:",
          "1. ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES;",
          "2. ANY LOSS OF REVENUE, ANTICIPATED PROFITS, CONTRACTS, BUSINESS REPUTATION, GOODWILL, OR OPPORTUNITY;",
          "3. ANY LOSS, DAMAGE, CORRUPTION, OR RECOVERY COSTS ASSOCIATED WITH DATA, DATABASES, OR TECHNICAL DOWNTIME;",
          "EVEN IF OLENTRA HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES IN ADVANCE.",
          "AGGREGATE LIABILITY CAP: IN NO EVENT SHALL OLENTRA'S TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THIS AGREEMENT, THE WEBSITE, OR SERVICES EXCEED THE GREATER OF: (A) ONE HUNDRED UNITED STATES DOLLARS ($100 USD) FOR WEBSITE BROWSERS AND INQUIRERS; OR (B) THE TOTAL FEES ACTUALLY PAID BY CLIENT TO OLENTRA UNDER THE SPECIFIC STATEMENT OF WORK GIVING RISE TO LIABILITY IN THE TWELVE (12) MONTH PERIOD PRECEDING THE INCIDENT GIVING RISE TO THE CLAIM."
        ],
        callout: {
          type: "legal",
          title: "Statutory Limitation of Liability",
          text: "OLENTRA'S CUMULATIVE LIABILITY FOR ALL CLAIMS IS STRICTLY CAPPED AT THE FEES PAID BY CLIENT UNDER THE APPLICABLE SOW IN THE PRECEDING 12 MONTHS (OR $100 USD FOR WEBSITE VISITORS). CONSEQUENTIAL AND INDIRECT LOSSES ARE EXPRESSLY WAIVED."
        }
      },
      {
        id: "indemnification",
        number: "14",
        heading: "Indemnification Obligations",
        summary:
          "Defines mutual obligations to indemnify against third-party intellectual property or compliance claims.",
        body: [
          "• Client Indemnification: Client shall defend, indemnify, and hold harmless Olentra and its officers, directors, employees, and agents from and against all third-party claims, liabilities, damages, losses, and reasonable legal expenses arising out of: (a) Client's breach of this Agreement; (b) Client Materials infringing or misappropriating third-party IP or privacy rights; or (c) Client's unlawful use or deployment of Deliverables.",
          "• Olentra IP Defense: Olentra shall defend Client against any third-party claim alleging that the bespoke code authored by Olentra in a Deliverable directly infringes any registered copyright or patent, provided Client gives prompt written notice, grants sole defense control, and provides reasonable cooperation."
        ]
      },
      {
        id: "term-and-termination",
        number: "15",
        heading: "Term, Suspension & Termination",
        summary:
          "Procedures for contract termination, service suspension, and post-termination survival.",
        body: [
          "• Term: This Agreement remains effective until terminated by either party in accordance with these Terms or the provisions of an executed SOW.",
          "• Termination for Cause: Either party may terminate an engagement or this Agreement immediately upon written notice if the other party: (a) materially breaches this Agreement and fails to cure such breach within thirty (30) days of receiving written notice; or (b) becomes insolvent, files for bankruptcy, or ceases operations.",
          "• Immediate Suspension: Olentra reserves the right to immediately suspend website access, API tokens, or portal accounts if we detect security threats, abuse, or unauthorized reverse-engineering attempts.",
          "• Survival: Sections regarding Definitions, Intellectual Property, AI Systems, Confidentiality, Warranty Disclaimers, Limitation of Liability, Indemnification, Dispute Resolution, and Governing Law shall survive any termination or expiration of this Agreement."
        ]
      },
      {
        id: "dispute-resolution",
        number: "16",
        heading: "Dispute Resolution & Binding Arbitration",
        summary:
          "Mandatory good-faith negotiations followed by binding arbitration in Hyderabad, India.",
        body: [
          "• Informal Executive Negotiation: Before initiating formal arbitration, the parties agree to seek an amicable resolution through good-faith executive consultations. Either party may provide written notice of a dispute, whereupon designated executives shall convene within fifteen (15) business days to attempt resolution.",
          "• Binding Arbitration: Any dispute, controversy, or claim arising out of or relating to this Agreement, including its formation, validity, breach, or termination, that cannot be resolved amicably within thirty (30) days of initial notice, shall be referred to and finally resolved by binding arbitration in accordance with the Arbitration and Conciliation Act, 1996 of India.",
          "• Arbitral Seat & Language: The seat and legal venue of arbitration shall be Hyderabad, Telangana, India. The tribunal shall consist of a sole arbitrator appointed by mutual agreement of both parties (or, failing agreement, pursuant to the rules of the Arbitration Act). The proceedings shall be conducted exclusively in the English language.",
          "• Equitable Relief: Nothing in this section prevents either party from seeking preliminary injunctive relief or emergency equitable remedies in a court of competent jurisdiction to protect intellectual property or confidential information."
        ]
      },
      {
        id: "export-compliance",
        number: "17",
        heading: "Export Controls & Regulatory Compliance",
        summary:
          "Ensures compliance with international trade sanctions, export laws, and anti-corruption regulations.",
        body: [
          "Software code, cloud environments, and cryptographic architectures engineered by Olentra may be subject to export control laws and international trade sanctions regulations.",
          "You agree that you will not export, re-export, transfer, or release any software, technical data, or direct product thereof to any destination, entity, or individual subject to international embargoes or sanctions administered by the Government of India, the United Nations, or relevant international authorities without proper governmental licensing."
        ]
      },
      {
        id: "general-provisions",
        number: "18",
        heading: "Amendments & General Provisions",
        summary:
          "Standard contractual boilerplate covering severability, assignment, and entire agreement.",
        body: [
          "• Entire Agreement: These Terms, together with our Privacy Policy and any executed MSAs or SOWs, constitute the entire agreement between you and Olentra regarding your use of the website and services, superseding all prior oral or written discussions.",
          "• Amendments: Olentra reserves the right to update these Terms at any time. Changes will be posted on this page with an updated \"Last Updated\" timestamp. Your continued use of the website following such updates constitutes affirmative acceptance of the revised Terms.",
          "• Severability: If any provision of these Terms is determined to be unlawful, void, or unenforceable by an arbitral tribunal or competent court, that provision shall be enforced to the maximum extent permissible, and the remaining provisions shall continue in full force and effect.",
          "• No Waiver: Failure by Olentra to enforce any right or provision of these Terms shall not be construed as a waiver of such right or future enforcement."
        ]
      },
      {
        id: "contact-notices",
        number: "19",
        heading: "Official Legal Notices & Contact",
        summary:
          "Designated channels for formal notices and inquiries.",
        body: [
          "All formal legal notices, contractual notices, or inquiries concerning these Terms of Service must be directed in writing to:",
          `• Legal Entity: Olentra Ltd. (trading as Olentra Technologies)`,
          `• Compliance & Legal Desk: ${companyInfo.email}`,
          `• Primary Location: Hyderabad, Telangana, India`,
          `• Website: ${companyInfo.domain}`
        ]
      }
    ]
  },
  cookies: {
    title: "Cookie Policy",
    eyebrow: "Cookie & Tracking Disclosures",
    effectiveDate: "January 1, 2026",
    lastUpdated: "November 17, 2026",
    version: "2.1",
    description:
      "Cookie and analytics disclosure for the Olentra Technologies website and client platforms.",
    summaryNotice:
      "We use necessary and functional storage technologies to ensure website performance, security, and session management. We do not sell tracking profiles to data brokers.",
    sections: [
      {
        id: "purpose",
        number: "1",
        heading: "What We Use Cookies For",
        summary: "Overview of cookie usage for performance and reliability.",
        body: [
          "We use essential and analytics-related technologies to understand website performance, improve navigation, and monitor operational reliability.",
          "These technologies help us measure visits, understand high-level usage patterns, and detect abuse or service issues across our global infrastructure."
        ]
      },
      {
        id: "third-parties",
        number: "2",
        heading: "Third-Party Services & Analytics",
        summary: "Disclosure of third-party telemetry tools.",
        body: [
          "Some analytics or performance monitoring tools may set their own identifiers subject to their own privacy policies. We limit usage strictly to services that support product improvement, security monitoring, and platform reliability."
        ]
      },
      {
        id: "choices",
        number: "3",
        heading: "Your Cookie Choices & Controls",
        summary: "Instructions for managing browser preferences.",
        body: [
          "You can manage cookies through browser settings and privacy tools. Note that some website functionality or security validation may be affected if essential storage is disabled."
        ]
      }
    ]
  },
  security: {
    title: "Security Posture",
    eyebrow: "Security & Trust Controls",
    effectiveDate: "January 1, 2026",
    lastUpdated: "November 17, 2026",
    version: "2.1",
    description:
      "How Olentra approaches delivery security, operational controls, and responsible handling of modern product and infrastructure work.",
    summaryNotice:
      "Security is an intrinsic discipline across all Olentra engineering sprints. We practice environment separation, zero-trust access, and continuous automated verification.",
    sections: [
      {
        id: "posture",
        number: "1",
        heading: "Enterprise Security Posture",
        summary: "Fundamental principles guiding our engineering defenses.",
        body: [
          "Olentra emphasizes least-privilege access, environment separation, secure credential handling, and production-minded delivery practices from the start of each engagement.",
          "We design solutions with reliability, monitoring, and recoverability in mind so that security is part of execution rather than an afterthought."
        ]
      },
      {
        id: "delivery-controls",
        number: "2",
        heading: "Delivery & Infrastructure Controls",
        summary: "Technical boundaries protecting client deployments.",
        body: [
          "Typical delivery controls include repository access boundaries, protected deployment workflows, audit-friendly operational patterns, and staged release practices tailored to the client environment."
        ]
      },
      {
        id: "responsible-disclosure",
        number: "3",
        heading: "Responsible Disclosure Protocol",
        summary: "Reporting mechanism for security researchers.",
        body: [
          `If you believe you have discovered a security issue related to our website or public materials, contact ${companyInfo.email}. Please include sufficient detail for us to investigate responsibly without publicly disclosing the vulnerability.`
        ]
      }
    ]
  },
  accessibility: {
    title: "Accessibility",
    eyebrow: "Inclusive Design Standards",
    effectiveDate: "January 1, 2026",
    lastUpdated: "November 17, 2026",
    version: "2.1",
    description:
      "Olentra's commitment to making our digital presence more usable, understandable, and accessible across devices and user needs.",
    summaryNotice:
      "We design and build with semantic HTML, keyboard accessibility, and WCAG 2.1 guidelines in mind to guarantee an inclusive digital experience.",
    sections: [
      {
        id: "approach",
        number: "1",
        heading: "Our Accessibility Approach",
        summary: "Commitment to readable, navigable, and assistive experiences.",
        body: [
          "We aim to create digital experiences that are readable, navigable, and usable across screen sizes, input methods, and assistive contexts.",
          "Accessibility is treated as a practical quality standard alongside performance, resilience, and design consistency."
        ]
      },
      {
        id: "improvements",
        number: "2",
        heading: "Ongoing Improvements",
        summary: "Continual enhancements to contrast and semantics.",
        body: [
          "We continue improving contrast, semantic structure, keyboard usability, meaningful link text, and responsive behavior across our site and product work."
        ]
      },
      {
        id: "feedback",
        number: "3",
        heading: "Feedback & Remediation",
        summary: "Direct channel to report accessibility barriers.",
        body: [
          `If you encounter an accessibility barrier on our website or portals, contact ${companyInfo.email} and our engineering team will review the issue and work toward an appropriate fix.`
        ]
      }
    ]
  }
};
