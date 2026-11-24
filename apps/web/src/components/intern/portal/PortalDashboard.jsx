"use client";

import Link from "next/link";
import {
  ArrowRight,
  Award,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ClipboardCheck,
  Clock3,
  Github,
  Sparkles,
} from "lucide-react";
import { portalRepositoryAccess } from "@/lib/intern/repository-access.mjs";
import { useInternship } from "@/components/intern/InternshipProvider";
import { ALL_BADGES, earnedBadges } from "@/lib/intern/badges.mjs";
import { PlanetArtwork } from "../dashboard/DashboardVisuals";
import {
  EmptyState,
  Heading,
  Loading,
  Notice,
  Panel,
  Progress,
  Status,
  formatDate,
} from "./PortalUI";
import styles from "./portal.module.css";
import { displayDate } from "@/lib/intern/schedule.mjs";
import { portalJourney } from "@/lib/intern/portal-journey.mjs";
import LearningResources from "./LearningResources";
import { MyTeamCard } from "./MyTeam";
import WeeklyCheckin from "./WeeklyCheckin";
import badgeStyles from "./badges.module.css";

function BadgesRow({ my }) {
  const earned = new Map(earnedBadges(my).map((badge) => [badge.id, badge]));
  return (
    <Panel className={styles.sectionGap}>
      <div className={styles.panelHeader}>
        <h2>Your badges</h2>
        <span className={badgeStyles.count}>
          {earned.size} / {ALL_BADGES.length} earned
        </span>
      </div>
      <ul className={badgeStyles.badges}>
        {ALL_BADGES.map((badge) => {
          const won = earned.get(badge.id);
          return (
            <li
              key={badge.id}
              className={badgeStyles.badge}
              data-badge-id={badge.id}
              data-earned={Boolean(won)}
              aria-label={`${badge.title}: ${won ? "earned" : `locked. ${badge.hint}`}`}
            >
              <span className={badgeStyles.medal} aria-hidden="true">
                {badge.icon}
              </span>
              <strong>{badge.title}</strong>
              <small>
                {won
                  ? won.earnedAt
                    ? `Earned ${formatDate(won.earnedAt)}`
                    : badge.description
                  : badge.hint}
              </small>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default function PortalDashboard() {
  const { ready, account, my, data } = useInternship();
  if (!ready) return <Loading />;
  const application = my.application;
  const tasks = my.tasks || [];
  const approved = tasks.filter((task) => task.status === "Approved").length;
  const active =
    application?.status === "Joined" && my.intern?.status === "Active";
  const completed = my.intern?.status === "Completed";
  const canViewWork = active || (application?.status === "Joined" && completed);
  const journey = portalJourney(my);
  const repository = portalRepositoryAccess(my.projects, my.application?.githubAccount, Boolean(data?.githubIntegration?.enabled));
  const steps = journey.steps;
  return (
    <>
      <Heading
        title={`Welcome back, ${account?.name?.split(" ")[0] || "there"}! 👋`}
        description={my.intern?.mentorName ? `Your mentor is ${my.intern.mentorName}. Your next chapter at Olentra, all in one place.` : "Your next chapter at Olentra, all in one place."}
      />
      <section className={styles.welcomeBanner}>
        <div>
          <span className={styles.eyebrow}>
            <Sparkles size={14} /> YOUR OLENTRA JOURNEY
          </span>
          <h2>
            {completed
              ? "Look at everything you’ve built."
              : active
                ? "Big ideas. Real-world impact."
                : journey.pending ? "Your internship offer is ready." : "A little closer to what’s next."}
          </h2>
          <p>
            {completed
              ? "Revisit your work, read your feedback, and celebrate your achievement."
              : active
                ? "Your projects, tasks, and team feedback are ready when you are."
                : journey.pending
                  ? "Your internship offer has arrived. Review and accept it in My application before starting onboarding."
                  : journey.expired
                    ? "Your offer deadline has passed. To ask for more time, write to intern.support@olentratechnologies.com."
                    : journey.accepted
                      ? "Complete your digital agreement and profile to unlock your project workspace."
                      : "Track your application here. Once your offer arrives, review and accept it in My application."}
          </p>
          <Link
            href={
              canViewWork
                ? "/intern/portal/projects"
                : journey.accepted ? "/intern/portal/onboarding" : journey.offerHref
            }
            className={styles.bannerLink}
          >
            {canViewWork ? "Explore my projects" : journey.pending ? "Review and accept offer" : journey.accepted ? "Complete onboarding" : "View my application"}
            <ArrowRight size={15} />
          </Link>
        </div>
        <PlanetArtwork className={styles.bannerPlanet} />
      </section>
      {my.offer?.pendingRevision && <Notice><div><strong>Internship schedule revision {Date.parse(my.offer.pendingRevision.expiresOn)<=Date.now()?"deadline passed":"awaiting your decision"}</strong><p>Your currently accepted dates remain effective. Review the proposed correction and its reason in My application.</p></div><Link href="/intern/portal/application#schedule-revision">Review schedule revision <ArrowRight size={14}/></Link></Notice>}
      {journey.pending && (
        <Notice>
          <div>
            <strong>Your offer is here! 🎉</strong>
            <p>
              Your offer is ready. Review the terms and accept it in My application to unlock onboarding.
            </p>
          </div>
          <Link href={journey.offerHref}>
            Review and accept offer <ArrowRight size={14} />
          </Link>
        </Notice>
      )}
      {journey.accepted && !active && !completed && my.onboarding?.status !== "Approved" && (
        <Notice>
          <div>
            <strong>
              {my.onboarding?.status === "Submitted"
                ? "Your onboarding is under review"
                : "Welcome! Complete your onboarding kickoff"}
            </strong>
            <p>
              {my.onboarding?.status === "Submitted"
                ? "The Olentra team is reviewing your details. We’ll notify you when your workspace opens."
                : "Review the digital agreement and complete your profile to unlock your project workspace."}
            </p>
          </div>
          <Link href="/intern/portal/onboarding">
            Complete onboarding <ArrowRight size={14} />
          </Link>
        </Notice>
      )}
      {canViewWork && repository.stage === "connect" && (
        <Notice>
          <div>
            <strong><Github size={13} aria-hidden="true" /> Connect GitHub to get your project repository</strong>
            <p>{repository.project.name} uses a GitHub repository. Connect your GitHub account once, and you’ll be invited automatically.</p>
          </div>
          <Link href="/intern/portal/profile#github">Connect in Profile settings <ArrowRight size={14} /></Link>
        </Notice>
      )}
      {canViewWork && repository.stage === "accept" && (
        <Notice>
          <div>
            <strong><Github size={13} aria-hidden="true" /> Your GitHub invite is ready</strong>
            <p>Accept the invite to {repository.invite.label} on GitHub to open the {repository.project.name} repository.</p>
          </div>
          <a href={repository.invite.acceptUrl} target="_blank" rel="noopener noreferrer">Accept invite on GitHub <ArrowRight size={14} /></a>
        </Notice>
      )}
      {canViewWork && <MyTeamCard team={data?.myTeam} />}
      <div className={styles.summaryGrid}>
        {[
          {
            label: "Application status",
            value: application?.status || "Not started",
            icon: ClipboardCheck,
            tone: "blue",
          },
          {
            label: "Assigned projects",
            value: canViewWork ? (my.projects || []).length : "—",
            icon: BriefcaseBusiness,
            tone: "purple",
          },
          {
            label: "Approved tasks",
            value: canViewWork ? `${approved} / ${tasks.length}` : "—",
            icon: Check,
            tone: "green",
          },
          {
            label: "Certificates",
            value: (my.certificates || []).length,
            icon: Award,
            tone: "orange",
          },
        ].map(({ label, value, icon: Icon, tone }) => (
          <Panel key={label} className={styles.summaryCard}>
            <span className={styles.summaryIcon} data-tone={tone}>
              <Icon size={22} />
            </span>
            <div>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          </Panel>
        ))}
      </div>
      <div className={styles.twoColumns}>
        <Panel>
          <div className={styles.panelHeader}>
            <h2>Your journey</h2>
            {application && <Status value={application.status} />}
          </div>
          <ol className={styles.journey}>
            {steps.map((step, index) => (
              <li key={step.label} data-complete={step.done}>
                <span>{step.done ? <Check size={16} /> : index + 1}</span>
                <div>
                  <strong>{step.label}</strong>
                  <small>
                    {step.done ? "Complete" : step.status || "Coming up next"}
                  </small>
                  {step.action && <Link href={step.href} className={styles.textLink}>{step.action} <ArrowRight size={13} /></Link>}
                </div>
              </li>
            ))}
          </ol>
          <Link href="/intern/portal/application" className={styles.textLink}>
            View application timeline <ArrowRight size={14} />
          </Link>
        </Panel>
        <Panel>
          <div className={styles.panelHeader}>
            <h2>{canViewWork ? "Up next" : "Your program"}</h2>
            <Clock3 size={18} />
          </div>
          {canViewWork ? (
            tasks
              .filter(
                (task) => !["Approved", "Under review"].includes(task.status),
              )
              .slice(0, 3)
              .map((task) => (
                <Link
                  href={`/intern/portal/projects/${task.projectId}`}
                  className={styles.upNext}
                  key={task.id}
                >
                  <span className={styles.taskCheck}>
                    <ClipboardCheck size={17} />
                  </span>
                  <div>
                    <strong>{task.title}</strong>
                    <small>
                      {task.dueOn
                        ? `Due ${formatDate(task.dueOn)}`
                        : "Ready when you are"}
                    </small>
                  </div>
                  <ArrowRight size={16} />
                </Link>
              ))
          ) : (
            <div className={styles.programOverview}>
              <span className={styles.summaryIcon} data-tone="purple">
                <BriefcaseBusiness size={24} />
              </span>
              <h3>{application?.program || "Olentra Internship Program"}</h3>
              <p>
                Practical experience, meaningful projects, and a community to
                grow with.
              </p>
              {my.offer?.startOn && (
                <span>
                  <CalendarDays size={15} /> Starts{" "}
                  {displayDate(my.offer.startOn)}{my.offer.endOn ? ` · Completes ${displayDate(my.offer.endOn)}` : ""}
                </span>
              )}
            </div>
          )}
          {canViewWork &&
            !tasks.some(
              (task) => !["Approved", "Under review"].includes(task.status),
            ) && (
              <EmptyState
                title="You’re all caught up"
                description="Keep an eye on your notifications for new tasks and feedback."
              />
            )}
        </Panel>
      </div>
      <BadgesRow my={my} />
      {my.intern?.status === "Active" && my.application?.id && <WeeklyCheckin applicationId={my.application.id} />}
      <LearningResources resources={my.resources} />
      {canViewWork && (my.projects || []).length > 0 && (
        <Panel className={styles.sectionGap}>
          <div className={styles.panelHeader}>
            <h2>My projects</h2>
            <Link href="/intern/portal/projects" className={styles.textLink}>
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className={styles.dashboardProjects}>
            {my.projects.slice(0, 3).map((project) => {
              const assigned = tasks.filter(
                (task) => task.projectId === project.id,
              );
              const value = assigned.length
                ? (assigned.filter((task) => task.status === "Approved")
                    .length /
                    assigned.length) *
                  100
                : 0;
              return (
                <Link
                  href={`/intern/portal/projects/${project.id}`}
                  key={project.id}
                >
                  <span className={styles.projectMiniIcon}>
                    <BriefcaseBusiness size={21} />
                  </span>
                  <h3>{project.name}</h3>
                  <p>{assigned.length} assigned tasks</p>
                  <Progress
                    value={value}
                    label={`${project.name} task completion`}
                  />
                  <small>{Math.round(value)}% of your tasks approved</small>
                </Link>
              );
            })}
          </div>
        </Panel>
      )}
    </>
  );
}
