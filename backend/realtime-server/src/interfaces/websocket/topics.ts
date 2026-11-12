import { realtimeTopic } from "./topic-registry";

export const INTERN_TOPICS = {
  public: realtimeTopic("internship", "public"),
  company: realtimeTopic("internship", "company"),
  applications: realtimeTopic("internship", "updates", "applications"),
  work: realtimeTopic("internship", "updates", "work"),
  applicantMessages: realtimeTopic("internship", "updates", "applicant-messages"),
  internMessages: realtimeTopic("internship", "updates", "intern-messages"),
  /** Aggregate-only public numbers for the careers page; sockets opt in via insights.subscribe. */
  insights: realtimeTopic("internship", "insights"),
} as const;

export const STAFF_TOPICS = [
  INTERN_TOPICS.company,
  INTERN_TOPICS.applications,
  INTERN_TOPICS.work,
  INTERN_TOPICS.applicantMessages,
  INTERN_TOPICS.internMessages,
] as const;

export const applicationTopic = (applicationId: string) => realtimeTopic("internship", "application", applicationId);
