// Public, dependency-free catalog shared by the browser and the service.
// Keep secrets and server-only imports out of this module.
export const INTERN_ROLES = [
  {
    id: "build", tag: "Build", title: "AI Full Stack Engineering Intern", short: "AI Full Stack Engineering",
    summary: "Build AI-powered websites, web applications and software products.",
    focusLabel: "What you’ll work on",
    focus: ["Frontend and backend development", "React, Node.js and databases", "AI API and LLM integration", "Building real-world software products"],
    skills: ["HTML, CSS and JavaScript basics", "Familiarity with React or Node.js is a plus", "Interest in AI-powered products"],
  },
  {
    id: "automate", tag: "Automate", title: "Agentic AI Engineer Intern", short: "Agentic AI Engineering",
    subtitle: "AI Agent & Automation Engineering Intern",
    summary: "Design, develop and manage intelligent AI agents and automated workflows.",
    focusLabel: "What you’ll work on",
    focus: ["Agentic AI development", "AI agents and multi-agent systems", "Workflow automation", "Tool and API integrations", "Business process automation", "AI chatbot development"],
    skills: ["Basic programming in Python or JavaScript", "Understanding of APIs", "Curiosity about AI agents and automation"],
  },
  {
    id: "grow", tag: "Grow", title: "Growth & Partnerships Intern", short: "Growth & Partnerships",
    summary: "Drive growth across marketing, sales, partnerships and client relations.",
    focusLabel: "Areas you can cover",
    areas: [
      ["Marketing", "Digital marketing, social media, campaigns and brand awareness"],
      ["Sales", "Product pitching, client conversion and closing deals"],
      ["Lead generation", "Finding potential customers and qualifying leads"],
      ["Business development", "Identifying new business opportunities"],
      ["Partnerships", "Building strategic partnerships and collaborations"],
      ["Client relations", "Customer communication and relationship management"],
      ["Market research", "Competitor analysis and identifying target markets"],
    ],
    skills: ["Strong communication and people skills", "Interest in marketing, sales or business", "Comfort with research and outreach"],
  },
];

export const INTERN_SCHEDULES = [
  { id: "part_time", label: "Part-time" },
  { id: "full_time", label: "Full-time" },
];
export const DEFAULT_INTERNSHIP_DURATION = "2 months";
export const MAX_DURATION_LENGTH = 120;
export const isInternshipDuration = value => typeof value === "string" && value.trim().length > 0 && value.trim().length <= MAX_DURATION_LENGTH && !/[\u0000-\u001f\u007f]/.test(value.trim());
export const normalizeInternshipDuration = value => isInternshipDuration(value) ? value.trim() : DEFAULT_INTERNSHIP_DURATION;
export function applicationDurationLabel(application) {
  if (isInternshipDuration(application?.duration)) return application.duration.trim();
  const months = application?.durationMonths;
  return typeof months === "number" && Number.isFinite(months) && months > 0 ? `${months} month${months === 1 ? "" : "s"}` : "Not provided";
}
export const INTERNSHIP_OPPORTUNITIES = { roles: INTERN_ROLES, schedules: INTERN_SCHEDULES, workMode: "remote", duration: DEFAULT_INTERNSHIP_DURATION };
export const isInternRole = value => INTERN_ROLES.some(role => role.id === value);
export const isInternSchedule = value => INTERN_SCHEDULES.some(schedule => schedule.id === value);
export const internRoleLabel = value => INTERN_ROLES.find(role => role.id === value)?.title || "Not provided";
export const internScheduleLabel = value => INTERN_SCHEDULES.find(schedule => schedule.id === value)?.label || "Not provided";
