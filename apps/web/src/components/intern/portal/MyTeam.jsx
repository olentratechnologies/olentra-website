"use client";

import Link from "next/link";
import { Crown, Github, UsersRound } from "lucide-react";
import { Panel } from "./PortalUI";
import styles from "./portal.module.css";

/** The intern's team: teammates' names and GitHub usernames, the lead and the team's projects. No contact details. */
export function MyTeamCard({ team, projectId }) {
  if (!team) return null;
  if (projectId && !team.projects.some(project => project.id === projectId)) return null;
  const others = team.members.filter(member => !member.isYou);
  return (
    <Panel className={`${styles.sectionGap} ${styles.myTeam}`}>
      <div className={styles.panelHeader}>
        <h2><UsersRound size={16} aria-hidden="true" /> {projectId ? `Your team · ${team.name}` : team.name}</h2>
        <span className={styles.muted}>{team.members.length} {team.members.length === 1 ? "member" : "members"}</span>
      </div>
      {!projectId && <p className={styles.myTeamIntro}>
        {team.projects.length
          ? <>Your team works on {team.projects.map((project, index) => <span key={project.id}>{index > 0 && ", "}<Link href={`/intern/portal/projects/${encodeURIComponent(project.id)}`}>{project.name}</Link></span>)}.</>
          : "Your team’s project will appear here once it’s assigned."}
      </p>}
      <ul className={styles.teamList}>
        {[...team.members.filter(member => member.isYou), ...others].map(member => (
          <li key={member.id}>
            <span className={styles.teamAvatar} style={{ background: member.avatarColor || undefined }} aria-hidden="true">{(member.initials || member.name.slice(0, 2)).toUpperCase()}</span>
            <span className={styles.teamName}>
              <strong>{member.name}{member.isYou && " (you)"}</strong>
              <small>{member.githubLogin ? <><Github size={11} aria-hidden="true" /> @{member.githubLogin}</> : "GitHub not connected"}</small>
            </span>
            {member.isLead && <span className={styles.teamLead}><Crown size={11} aria-hidden="true" /> Team lead</span>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
