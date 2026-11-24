"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BellRing, ClipboardList, Crown, FolderKanban, Github, GraduationCap, Plus, UsersRound } from "lucide-react";
import { useInternship } from "../InternshipProvider";
import { useInternQuery, useInternSearch } from "../useInternQuery";
import { canManageTeams, hasStaffPermission } from "./staffAccess";
import { TaskEditor } from "./CompanyWorkflow";
import QueryStatus from "./QueryStatus";
import { Avatar, Button, EmptyState, Modal, Panel, RowMenu, StatusBadge, Tabs, formatDate } from "./DashboardUI";
import { UnassignedPicker } from "./TeamsPage";
import common from "./pages.module.css";
import styles from "./teams.module.css";

const TABS = ["overview", "members", "projects", "tasks"];

export default function TeamDetailPage({ teamId, initialTab = "overview" }) {
  const router = useRouter();
  const { account, commands, notify } = useInternship();
  const canManage = canManageTeams(account);
  const [tab, setTab] = useState(TABS.includes(initialTab) ? initialTab : "overview");
  const [renaming, setRenaming] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [busy, setBusy] = useState("");
  const query = useInternQuery("team.get", { id: teamId });
  const team = query.data;

  async function run(method, params, success, key = method) {
    setBusy(key);
    const result = await commands.teamCommand(method, { id: teamId, ...params });
    setBusy("");
    if (!result.ok) { notify(result.error); return false; }
    if (success) notify(success);
    return true;
  }
  function selectTab(next) {
    setTab(next);
    router.replace(`/intern/dashboard/teams/${encodeURIComponent(teamId)}${next === "overview" ? "" : `?tab=${next}`}`, { scroll: false });
  }

  if (!team) return <div className={common.page}>
    <Link className={styles.backLink} href="/intern/dashboard/teams"><ArrowLeft size={15} /> Teams</Link>
    <QueryStatus query={query} label="team" />
  </div>;

  const active = team.status === "Active", editable = canManage && active;
  const lead = team.members.find(member => member.id === team.leadId);
  return <div className={common.page}>
    <Link className={styles.backLink} href="/intern/dashboard/teams"><ArrowLeft size={15} /> Teams</Link>
    <header className={styles.header}>
      <div className={styles.titleBlock}>
        <div className={styles.badges}><StatusBadge status={team.status} />{team.batch && <span className={styles.chip}>{team.batch}</span>}{team.program && <span className={styles.chip}>{team.program}</span>}</div>
        <h1>{team.name}</h1>
        <div className={styles.facts}>
          <span><UsersRound size={14} aria-hidden="true" /> {team.memberCount} {team.memberCount === 1 ? "member" : "members"}</span>
          <span><FolderKanban size={14} aria-hidden="true" /> {team.projects.length ? team.projects.map(project => project.name).join(", ") : "No project yet"}</span>
          {lead && <span><Crown size={14} aria-hidden="true" /> Lead: {lead.name}</span>}
          {team.mentorName && <span><GraduationCap size={14} aria-hidden="true" /> Mentor: {team.mentorName}</span>}
          {team.progress?.total > 0 && <span><ClipboardList size={14} aria-hidden="true" /> {team.progress.approved} of {team.progress.total} tasks approved</span>}
          {team.archivedOn && <span>Archived {formatDate(team.archivedOn)}</span>}
        </div>
      </div>
      {canManage && <RowMenu items={[
        ...(active ? [{ label: "Rename team", onClick: () => setRenaming(true) }, { label: "Archive team", danger: true, onClick: () => setConfirmArchive(true) }] : [{ label: "Restore team", onClick: () => run("team.restore", {}, `${team.name} restored.`) }]),
      ]} />}
    </header>
    {!active && <p className={styles.archivedNote}>This team is archived. Its members are free to join other teams. Restore it to make changes.</p>}
    {confirmArchive && <div role="alert" className={styles.confirm}>
      <p>Archive {team.name}? The team and its projects stay on record, and its {team.memberCount} members become free to join another team. Nobody is removed from a project.</p>
      <div className={common.formActions}>
        <Button variant="ghost" onClick={() => setConfirmArchive(false)}>Keep active</Button>
        <Button variant="danger" disabled={busy === "team.archive"} onClick={async () => { if (await run("team.archive", {}, `${team.name} archived.`)) setConfirmArchive(false); }}>Archive team</Button>
      </div>
    </div>}
    <Tabs items={[{ id: "overview", label: "Overview" }, { id: "members", label: "Members", count: team.memberCount }, { id: "projects", label: "Projects", count: team.projects.length }, ...(hasStaffPermission(account, "tasks.read") ? [{ id: "tasks", label: "Tasks" }] : [])]} value={tab} onChange={selectTab} label="Team sections" />
    <div role="tabpanel" aria-label={tab}>
      {tab === "overview" && <Overview team={team} editable={editable} run={run} busy={busy} onTab={selectTab} isAdmin={account?.staffRole === "admin" && active} />}
      {tab === "members" && <Members team={team} editable={editable} run={run} busy={busy} />}
      {tab === "projects" && <Projects team={team} editable={editable} run={run} busy={busy} />}
      {tab === "tasks" && hasStaffPermission(account, "tasks.read") && <TeamTasks team={team} canAssign={active && hasStaffPermission(account, "tasks.manage")} />}
    </div>
    {renaming && <RenameDialog team={team} onClose={() => setRenaming(false)} run={run} />}
  </div>;
}

function RenameDialog({ team, onClose, run }) {
  const [name, setName] = useState(team.name);
  const [busy, setBusy] = useState(false);
  return <Modal open onOpenChange={open => !open && onClose()} title="Rename team" description="Team names must be unique within a batch.">
    <form className={styles.stack} onSubmit={async event => {
      event.preventDefault();
      if (!name.trim()) return;
      setBusy(true);
      if (await run("team.update", { patch: { name: name.trim() } }, "Team renamed.")) onClose();
      setBusy(false);
    }}>
      <label className={common.field}>Team name<input value={name} maxLength={80} autoFocus onChange={event => setName(event.target.value)} /></label>
      <div className={common.formActions}><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy || !name.trim()}>Save</Button></div>
    </form>
  </Modal>;
}

export function Overview({ team, editable, run, busy, onTab, isAdmin = false }) {
  const mentorsQuery = useInternQuery("staff.mentors", {}, { enabled: isAdmin });
  return <div className={styles.overview}>
    <Panel>
      <h2 className={styles.panelHeading}>Mentor</h2>
      <p className={common.muted}>The team mentor becomes every member’s mentor, including people who join later.</p>
      {isAdmin ? <label className={common.field}><span className={styles.srOnly}>Team mentor</span>
        <select value={team.mentorId || ""} disabled={busy === "team.setMentor" || !mentorsQuery.data} onChange={event => run("team.setMentor", { mentorId: event.target.value || null }, event.target.value ? "Mentor assigned to the whole team." : "Team mentor cleared. Members keep their current mentor.")}>
          <option value="">{mentorsQuery.data ? "No team mentor" : "Loading mentors…"}</option>
          {(mentorsQuery.data || []).map(mentor => <option key={mentor.id} value={mentor.id}>{mentor.name}</option>)}
        </select>
      </label> : <p>{team.mentorName || "No team mentor"}</p>}
      <div className={styles.divider} />
      <h2 className={styles.panelHeading}>Team lead</h2>
      <p className={common.muted}>Optional. The lead is shown to the team; it doesn’t change anyone’s access.</p>
      {editable ? <label className={common.field}><span className={styles.srOnly}>Team lead</span>
        <select value={team.leadId || ""} disabled={busy === "team.update" || !team.members.length} onChange={event => run("team.update", { patch: { leadId: event.target.value || null } }, "Team lead updated.")}>
          <option value="">No lead</option>
          {team.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
        </select>
      </label> : <p>{team.members.find(member => member.id === team.leadId)?.name || "No lead"}</p>}
      <dl className={styles.keyFacts}>
        <div><dt>Members</dt><dd>{team.memberCount}</dd></div>
        <div><dt>Projects</dt><dd>{team.projects.length}</dd></div>
        <div><dt>Tasks approved</dt><dd>{team.progress?.approved ?? 0} of {team.progress?.total ?? 0}</dd></div>
        <div><dt>Open tasks</dt><dd>{team.members.reduce((sum, member) => sum + member.openTasks, 0)}</dd></div>
        <div><dt>Connected GitHub</dt><dd>{team.members.filter(member => member.githubLogin).length} of {team.memberCount}</dd></div>
      </dl>
    </Panel>
    <Panel>
      <div className={styles.panelRow}><h2 className={styles.panelHeading}>Members</h2><Button variant="ghost" onClick={() => onTab("members")}>Manage</Button></div>
      {team.members.length ? <ul className={styles.compactMembers}>{team.members.map(member => <li key={member.id}><Avatar person={member} size={28} /> {member.name}{member.id === team.leadId && <span className={styles.leadBadge}>Lead</span>}</li>)}</ul> : <p className={common.muted}>No members yet.</p>}
      <div className={styles.panelRow}><h2 className={styles.panelHeading}>Projects</h2><Button variant="ghost" onClick={() => onTab("projects")}>{editable ? "Assign" : "View"}</Button></div>
      {team.projects.length ? <ul className={styles.compactMembers}>{team.projects.map(project => <li key={project.id}><FolderKanban size={14} aria-hidden="true" /> <Link href={`/intern/dashboard/projects/${encodeURIComponent(project.id)}`}>{project.name}</Link></li>)}</ul> : <p className={common.muted}>No project yet.</p>}
    </Panel>
  </div>;
}

export function Members({ team, editable, run, busy }) {
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState([]);
  const [removing, setRemoving] = useState(null);
  const others = useInternQuery("team.list", { status: "Active", batch: team.batch || "all", page: 1, pageSize: 100 }, { enabled: editable });
  const targets = (others.data?.items || []).filter(item => item.id !== team.id);
  return <div className={styles.stack}>
    <Panel>
      <div className={styles.panelRow}>
        <h2 className={styles.panelHeading}>Members <span className={styles.count}>{team.memberCount}</span></h2>
        {editable && !adding && <Button variant="secondary" onClick={() => { setAdding(true); setSelected([]); }}><Plus size={14} /> Add members</Button>}
      </div>
      {team.members.length ? <ul className={styles.memberRows}>
        {team.members.map(member => <li key={member.id}>
          <Avatar person={member} size={36} />
          <div className={styles.personText}>
            <strong>{member.name}{member.id === team.leadId && <span className={styles.leadBadge}>Lead</span>}</strong>
            <small>{[member.email, member.college].filter(Boolean).join(" · ")}</small>
            <small className={styles.inlineFacts}>
              <span>{member.githubLogin ? <><Github size={11} aria-hidden="true" /> @{member.githubLogin}</> : "GitHub not connected"}</span>
              <span>{member.openTasks ? `${member.openTasks} open ${member.openTasks === 1 ? "task" : "tasks"}` : "No open tasks"}</span>
              {member.internStatus && member.internStatus !== "Active" && <span className={styles.warn}>{member.internStatus}</span>}
            </small>
          </div>
          {editable && <div className={styles.rowActions}>
            <label className={styles.inlineSelect}><span className={styles.srOnly}>Move {member.name} to another team</span>
              <select value="" disabled={!!busy || !targets.length} onChange={event => event.target.value && run("team.moveMember", { applicationId: member.id, toId: event.target.value }, `${member.name} moved.`, `move:${member.id}`)}>
                <option value="">{targets.length ? "Move to…" : "No other teams"}</option>
                {targets.map(target => <option key={target.id} value={target.id}>{target.name} ({target.memberCount})</option>)}
              </select>
            </label>
            <Button variant="ghost" disabled={!!busy} onClick={() => setRemoving(member)}>Remove</Button>
          </div>}
          {removing?.id === member.id && <div role="alert" className={styles.confirm}>
            <p>Remove {member.name} from {team.name}? {team.projects.length ? `They’ll also leave ${team.projects.map(project => project.name).join(", ")} unless they were added to it directly. Unfinished tasks block this.` : "They’ll be free to join another team."}</p>
            <div className={common.formActions}>
              <Button variant="ghost" onClick={() => setRemoving(null)}>Cancel</Button>
              <Button variant="danger" disabled={busy === `remove:${member.id}`} onClick={async () => { if (await run("team.removeMember", { applicationId: member.id }, `${member.name} removed from ${team.name}.`, `remove:${member.id}`)) setRemoving(null); }}>Remove</Button>
            </div>
          </div>}
        </li>)}
      </ul> : <EmptyState title="No members yet" description={editable ? "Add interns who aren’t in a team yet." : "This team has no members."} />}
    </Panel>
    {adding && <Panel>
      <UnassignedPicker batch={team.batch || "all"} selected={selected} onChange={setSelected} />
      <div className={common.formActions}>
        <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
        <Button disabled={!selected.length || busy === "team.addMembers"} onClick={async () => { if (await run("team.addMembers", { members: selected }, `${selected.length} added to ${team.name}.`)) setAdding(false); }}>Add {selected.length || ""} to team</Button>
      </div>
    </Panel>}
  </div>;
}

export function Projects({ team, editable, run, busy }) {
  const [search, setSearch] = useState("");
  const [choice, setChoice] = useState("");
  const [removing, setRemoving] = useState(null);
  const term = useInternSearch(search);
  const projectQuery = useInternQuery("project.list", { search: term, page: 1, pageSize: 20, status: "all" }, { enabled: editable });
  const available = (projectQuery.data?.items || []).filter(project => !team.projects.some(item => item.id === project.id));
  return <div className={styles.stack}>
    <Panel>
      <h2 className={styles.panelHeading}>Projects <span className={styles.count}>{team.projects.length}</span></h2>
      <p className={common.muted}>Every member joins the team’s projects, including people who join the team later. Tasks, resources and GitHub access then work as usual.</p>
      {team.projects.length ? <ul className={styles.memberRows}>
        {team.projects.map(project => <li key={project.id}>
          <span className={styles.projectIcon} aria-hidden="true"><FolderKanban size={18} /></span>
          <div className={styles.personText}>
            <strong><Link href={`/intern/dashboard/projects/${encodeURIComponent(project.id)}`}>{project.name}</Link></strong>
            <small>{[project.status, project.dueOn && `Due ${formatDate(project.dueOn)}`].filter(Boolean).join(" · ")}</small>
            {project.missing?.length > 0 && <small className={styles.warn}>{project.missing.length} {project.missing.length === 1 ? "member isn’t" : "members aren’t"} on this project (removed from it directly).</small>}
          </div>
          {editable && <Button variant="ghost" disabled={!!busy} onClick={() => setRemoving(project)}>Remove from team</Button>}
          {removing?.id === project.id && <div role="alert" className={styles.confirm}>
            <p>Take {team.name} off {project.name}? Members the team added leave the project. Anyone added to it directly stays. Unfinished tasks block this.</p>
            <div className={common.formActions}>
              <Button variant="ghost" onClick={() => setRemoving(null)}>Cancel</Button>
              <Button variant="danger" disabled={busy === "team.unassignProject"} onClick={async () => { if (await run("team.unassignProject", { projectId: project.id }, `${team.name} removed from ${project.name}.`)) setRemoving(null); }}>Remove</Button>
            </div>
          </div>}
        </li>)}
      </ul> : <p className={common.muted}>No project yet.</p>}
    </Panel>
    {editable && <Panel>
      <h2 className={styles.panelHeading}>Assign a project</h2>
      <div className={common.formGrid}>
        <label className={common.field}>Search projects<input type="search" value={search} placeholder="Project name…" onChange={event => { setSearch(event.target.value); setChoice(""); }} /></label>
        <label className={common.field}>Project
          <select value={choice} onChange={event => setChoice(event.target.value)}>
            <option value="">{projectQuery.data ? (available.length ? "Choose a project" : "No matching projects") : "Loading…"}</option>
            {available.map(project => <option key={project.id} value={project.id}>{project.name} · {project.status}</option>)}
          </select>
        </label>
      </div>
      <div className={common.formActions}>
        <Button disabled={!choice || busy === "team.assignProject"} onClick={async () => { const project = available.find(item => item.id === choice); if (await run("team.assignProject", { projectId: choice }, `${team.name} assigned to ${project?.name || "the project"}.`)) setChoice(""); }}>Assign to {team.name}</Button>
      </div>
    </Panel>}
  </div>;
}

const STATUS_TONE = { Approved: "green", "Under review": "blue", "Changes requested": "amber", "In progress": "blue", Todo: "muted" };
const REMINDABLE = ["Todo", "In progress", "Changes requested"];

/** Tasks given to the whole team: one per member, shown together. Each member still submits and is reviewed on their own. */
export function TeamTasks({ team, canAssign }) {
  const { commands, notify } = useInternship();
  const query = useInternQuery("team.tasks", { id: team.id });
  const [assigning, setAssigning] = useState(false);
  const [projectId, setProjectId] = useState(team.projects[0]?.id || "");
  const [busy, setBusy] = useState("");
  const project = team.projects.find(item => item.id === projectId);
  const onProject = project ? team.members.filter(member => !(project.missing || []).includes(member.id)) : [];
  const defaultDue = team.projects.find(item => item.id === projectId)?.dueOn || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  async function assign(form) {
    if (!onProject.length) { notify("No team members are on this project."); return; }
    setBusy("assign");
    const result = await commands.teamCommand("task.createMany", { ...form, title: form.title.trim(), description: form.description.trim(), projectId, teamId: team.id, applicationIds: onProject.map(member => member.id) });
    setBusy("");
    if (!result.ok) { notify(result.error); return; }
    notify(`Task assigned to ${result.data.length} ${result.data.length === 1 ? "member" : "members"} of ${team.name}.`);
    setAssigning(false);
  }
  async function remind(group) {
    const waiting = group.members.filter(member => REMINDABLE.includes(member.status));
    setBusy(group.teamTaskId);
    let sent = 0;
    for (const member of waiting) { const result = await commands.remindTask(member.taskId); if (result.ok) sent++; }
    setBusy("");
    notify(sent ? `Reminder sent to ${sent} ${sent === 1 ? "member" : "members"}.` : "No reminders could be sent.");
  }

  return <div className={styles.stack}>
    <Panel>
      <div className={styles.panelRow}>
        <h2 className={styles.panelHeading}>Team tasks <span className={styles.count}>{query.data?.items.length ?? ""}</span></h2>
        {canAssign && !assigning && <Button variant="secondary" disabled={!team.projects.length} onClick={() => setAssigning(true)}><Plus size={14} /> Assign team task</Button>}
      </div>
      <p className={common.muted}>{team.projects.length ? "A team task gives every member their own copy. They submit separately and you review each one." : "Assign a project to this team first, then give the team tasks."}</p>
      {assigning && <div className={styles.taskForm}>
        <label className={common.field}>Project
          <select value={projectId} onChange={event => setProjectId(event.target.value)}>
            {team.projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <p className={styles.estimate}>Goes to {onProject.length} {onProject.length === 1 ? "member" : "members"}{project?.missing?.length ? ` (${project.missing.length} not on this project)` : ""}.</p>
        <TaskEditor key={projectId} task={{ title: "", description: "", dueOn: defaultDue, required: true, reminderAfterDays: 1 }} busy={busy === "assign"} onSave={assign} onCancel={() => setAssigning(false)} />
      </div>}
    </Panel>
    <QueryStatus query={query} label="team tasks" />
    {query.data?.items.map(group => <TeamTaskGroup key={group.teamTaskId} group={group} canRemind={canAssign} busy={busy === group.teamTaskId} onRemind={() => remind(group)} />)}
    {query.data && !query.data.items.length && <Panel><EmptyState title="No team tasks yet" description={canAssign && team.projects.length ? "Use Assign team task to give every member the same task." : "Team tasks will appear here."} /></Panel>}
  </div>;
}

/** One team task: overall progress and each member's status. */
export function TeamTaskGroup({ group, canRemind, busy, onRemind }) {
  const waiting = group.members.filter(member => REMINDABLE.includes(member.status)).length;
  const percent = group.total ? Math.round((group.approved / group.total) * 100) : 0;
  return <Panel className={styles.taskGroup}>
    <div className={styles.panelRow}>
      <div className={styles.personText}>
        <strong>{group.title}{group.required && <span className={styles.leadBadge}>Required</span>}</strong>
        <small>{group.projectName} · Due {formatDate(group.dueOn)}</small>
      </div>
      {canRemind && waiting > 0 && <Button variant="ghost" disabled={busy} onClick={onRemind}><BellRing size={14} /> Remind {waiting} unfinished</Button>}
    </div>
    <div className={styles.progressLine}>
      <span className={styles.progressTrack} role="progressbar" aria-label={`${group.title} approved`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percent}%` }} /></span>
      <span>{group.approved} of {group.total} approved{group.underReview ? ` · ${group.underReview} awaiting review` : ""}</span>
    </div>
    <ul className={styles.statusChips}>
      {group.members.map(member => <li key={member.taskId} data-tone={STATUS_TONE[member.status] || "muted"}>{member.name}<span>{member.status}</span></li>)}
    </ul>
  </Panel>;
}
