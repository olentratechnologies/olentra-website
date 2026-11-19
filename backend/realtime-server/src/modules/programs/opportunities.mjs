// Public, dependency-free program catalog shared by the browser and service.
// Keep secrets and server-only imports out of this module.
export const INTERN_WORK_AREAS = [
  "Frontend and backend software development",
  "React, Node.js and database driven applications",
  "AI API and large language model integration",
  "AI agents and multi-agent systems",
  "Workflow and business process automation",
  "Tool and API integrations, including AI chatbots",
  "Building real-world software products",
];
export const INTERN_HELPFUL_SKILLS = [
  "HTML, CSS and JavaScript fundamentals",
  "Basic programming in JavaScript or Python",
  "Familiarity with React, Node.js or APIs is helpful",
  "Interest in AI-powered products, agents and automation",
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
export const INTERNSHIP_OPPORTUNITIES = { workAreas: INTERN_WORK_AREAS, helpfulSkills: INTERN_HELPFUL_SKILLS, schedules: INTERN_SCHEDULES, workMode: "remote", duration: DEFAULT_INTERNSHIP_DURATION };
export const isInternSchedule = value => INTERN_SCHEDULES.some(schedule => schedule.id === value);
export const internScheduleLabel = value => INTERN_SCHEDULES.find(schedule => schedule.id === value)?.label || "Not provided";
