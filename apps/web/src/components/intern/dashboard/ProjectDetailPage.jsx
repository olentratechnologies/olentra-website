"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Check, Github, Users } from "lucide-react";
import ProjectPlan from "../ProjectPlan";
import { StaffProjectLinks } from "../ProjectLinks";
import { useDashboard } from "./DashboardProvider";
import { hasStaffPermission } from "./staffAccess";
import { useInternQuery } from "../useInternQuery";
import QueryStatus from "./QueryStatus";
import { ProjectWorkflow } from "./CompanyWorkflow";
import { TeamPicker } from "./ProjectsPage";
import { Avatar, Button, EmptyState, Panel, RowMenu, StatusBadge, Tabs, TrackBadge, formatDate } from "./DashboardUI";
import common from "./pages.module.css";
import styles from "./project-detail.module.css";

const TABS = ["overview", "resources", "team", "tasks"];
const STATUSES = ["Planning", "In progress", "In review", "Completed"];
const detailsOf = project => ({ name: project.name, program: project.program, description: project.description, dueOn: project.dueOn, status: project.status, progress: project.progress });

/** Full-page view of one project. Each part of the project lives in its own tab. */
export default function ProjectDetailPage({ projectId, initialTab = "overview" }) {
  const router = useRouter();
  const { data, notify, updateProject, deleteProject, account } = useDashboard();
  const canManage = hasStaffPermission(account, "projects.manage");
  const canReadTasks = hasStaffPermission(account, "tasks.read");
  const [tab, setTab] = useState(TABS.includes(initialTab) ? initialTab : "overview");
  const query = useInternQuery("project.list", { id: projectId, page: 1, pageSize: 1 });
  // Only accept the requested project (an older server ignores the id filter and returns the first one).
  const project = query.data?.items?.find(item => item.id === projectId) || null;
  const [peopleCache, setPeopleCache] = useState({});
  const rememberPeople = useCallback(records => setPeopleCache(previous => {
    const next = { ...previous };
    for (const record of records) if (record?.id) next[record.id] = record;
    return next;
  }), []);
  const people = useMemo(() => {
    const map = new Map(data.applications.map(person => [person.id, person]));
    Object.values(peopleCache).forEach(person => map.set(person.id, person));
    for (const member of project?.members || []) map.set(member.id, member);
    return map;
  }, [data.applications, peopleCache, project]);
  const activeIds = useMemo(() => {
    const ids = new Set(data.interns.filter(intern => intern.status === "Active").map(intern => intern.applicationId));
    Object.values(peopleCache).forEach(person => { if (person.internshipStatus === "Active") ids.add(person.id); });
    for (const intern of project?.teamInterns || []) if (intern.status === "Active") ids.add(intern.applicationId);
    return ids;
  }, [data.interns, peopleCache, project]);

  function selectTab(next) {
    setTab(next);
    router.replace(`/intern/dashboard/projects/${encodeURIComponent(projectId)}${next === "overview" ? "" : `?tab=${next}`}`, { scroll: false });
  }

  if (!project) {
    return <div className={common.page}>
      <Link className={styles.backLink} href="/intern/dashboard/projects"><ArrowLeft size={15} /> Projects</Link>
      <QueryStatus query={query} label="project" />
      {query.data && <Panel><EmptyState title="Project not found" description="This project was deleted or you no longer have access to it." /></Panel>}
    </div>;
  }

  const members = project.team.map(id => people.get(id)).filter(Boolean);
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "resources", label: "Resources", count: (project.links || []).length },
    { id: "team", label: "Team", count: project.team.length },
    ...(canReadTasks ? [{ id: "tasks", label: "Tasks & reviews" }] : []),
  ];
  const current = tabs.some(item => item.id === tab) ? tab : "overview";

  return <div className={common.page}>
    <Link className={styles.backLink} href="/intern/dashboard/projects"><ArrowLeft size={15} /> Projects</Link>
    <header className={styles.header}>
      <div className={styles.titleBlock}>
        <div className={styles.badges}>
          <StatusBadge status={project.status} />
          <TrackBadge programId="software-engineer" label={project.program || "Software Engineer Intern"} />
        </div>
        <h1>{project.name}</h1>
        <div className={styles.facts}>
          <span><CalendarDays size={14} aria-hidden="true" /> Due {formatDate(project.dueOn)}</span>
          <span><Users size={14} aria-hidden="true" /> {project.team.length} {project.team.length === 1 ? "member" : "members"}</span>
          <span className={styles.progress}>
            <span className={styles.progressTrack} role="progressbar" aria-label="Project progress" aria-valuenow={project.progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${project.progress}%` }} /></span>
            {project.progress}%
          </span>
        </div>
      </div>
      {canManage && <DeleteProject project={project} deleteProject={deleteProject} notify={notify} onDeleted={() => router.push("/intern/dashboard/projects")} />}
    </header>
    <Tabs items={tabs} value={current} onChange={selectTab} label="Project sections" />
    <div role="tabpanel" aria-label={tabs.find(item => item.id === current)?.label} className={styles.panel}>
      {current === "overview" && <Overview key={project.id} project={project} canManage={canManage} data={data} updateProject={updateProject} notify={notify} />}
      {current === "resources" && <Panel><StaffProjectLinks project={project} members={members} canEdit={canManage} onNotify={notify} /></Panel>}
      {current === "team" && <Team key={project.id} project={project} people={people} activeIds={activeIds} canManage={canManage} rememberPeople={rememberPeople} updateProject={updateProject} notify={notify} />}
      {current === "tasks" && canReadTasks && <ProjectWorkflow projectId={project.id} projectRecord={project} directoryPeople={people} activeMemberIds={activeIds} />}
    </div>
  </div>;
}

function DeleteProject({ project, deleteProject, notify, onDeleted }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  return <div className={styles.headerActions}>
    <RowMenu items={[{ label: "Delete project", danger: true, onClick: () => setConfirming(true) }]} />
    {confirming && <div role="alert" className={styles.deleteConfirm}>
      <p>Delete “{project.name}”? This permanently removes the project and all its tasks and submissions. This cannot be undone.</p>
      <div className={common.formActions}>
        <Button variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>Keep project</Button>
        <Button variant="danger" disabled={busy} onClick={async () => {
          if (busy) return;
          setBusy(true);
          try {
            const result = await deleteProject(project.id);
            if (result === false) return;
            notify("Project deleted.");
            onDeleted();
          } finally { setBusy(false); }
        }}>{busy ? "Deleting…" : "Permanently delete"}</Button>
      </div>
    </div>}
  </div>;
}

function Overview({ project, canManage, data, updateProject, notify }) {
  const [values, setValues] = useState(() => detailsOf(project));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  // Pick up saves made elsewhere while there are no unsaved edits here.
  const saved = detailsOf(project);
  const dirty = Object.keys(saved).some(key => String(saved[key] ?? "") !== String(values[key] ?? ""));
  useEffect(() => { if (!saving) setValues(detailsOf(project)); }, [project.name, project.program, project.description, project.dueOn, project.status, project.progress]);
  const set = (name, value) => setValues(current => ({ ...current, [name]: value }));

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    const progress = Number(values.progress);
    if (values.name.trim().length < 3) return setError("Enter a project name with at least 3 characters.");
    if (values.description.trim().length < 12) return setError("Describe the project in at least 12 characters.");
    if (!data.programs.some(program => program.name === values.program)) return setError("Choose a valid internship program.");
    if (!values.dueOn) return setError("Choose a project due date.");
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) return setError("Progress must be between 0 and 100.");
    setError(""); setSaving(true);
    try {
      const result = await updateProject(project.id, { name: values.name.trim(), description: values.description.trim(), program: values.program, dueOn: values.dueOn, status: values.status, progress: values.status === "Completed" ? 100 : progress });
      if (result !== false) notify("Project details saved.");
    } finally { setSaving(false); }
  }

  return <div className={styles.overview}>
    <Panel className={styles.summary}>
      <h2>About this project</h2>
      <p className={styles.description}>{project.description}</p>
      <ProjectPlan project={project} canEdit={canManage} />
      <dl className={styles.keyFacts}>
        <div><dt>Status</dt><dd><StatusBadge status={project.status} /></dd></div>
        <div><dt>Due date</dt><dd>{formatDate(project.dueOn)}</dd></div>
        <div><dt>Progress</dt><dd>{project.progress}%</dd></div>
        <div><dt>Resources</dt><dd>{(project.links || []).length}</dd></div>
      </dl>
    </Panel>
    <Panel>
      <h2>{canManage ? "Edit details" : "Details"}</h2>
      <form onSubmit={save} className={styles.form}>
        <div className={common.formGrid}>
          <label className={`${common.field} ${common.fullWidth}`}>Project name
            <input disabled={!canManage || saving} value={values.name} maxLength={200} required onChange={event => set("name", event.target.value)} />
          </label>
          <label className={`${common.field} ${common.fullWidth}`}>Description
            <textarea disabled={!canManage || saving} value={values.description} maxLength={5000} required rows={5} onChange={event => set("description", event.target.value)} />
          </label>
          <label className={common.field}>Program
            <select disabled={!canManage || saving} value={values.program} onChange={event => set("program", event.target.value)}>
              {data.programs.map(program => <option key={program.id} value={program.name}>{program.name}</option>)}
            </select>
          </label>
          <label className={common.field}>Due date
            <input disabled={!canManage || saving} type="date" required value={values.dueOn} onChange={event => set("dueOn", event.target.value)} />
          </label>
          <label className={common.field}>Status
            <select disabled={!canManage || saving} value={values.status} onChange={event => set("status", event.target.value)}>
              {STATUSES.map(status => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label className={common.field}>Progress (%)
            <input disabled={!canManage || saving || values.status === "Completed"} type="number" min="0" max="100" required value={values.status === "Completed" ? 100 : values.progress} onChange={event => set("progress", event.target.value)} />
          </label>
        </div>
        {error && <p role="alert" className={common.error}>{error}</p>}
        {canManage && <div className={common.formActions}>
          <Button variant="ghost" disabled={!dirty || saving} onClick={() => { setValues(detailsOf(project)); setError(""); }}>Discard changes</Button>
          <Button type="submit" disabled={!dirty || saving}><Check size={15} /> {saving ? "Saving…" : "Save details"}</Button>
        </div>}
      </form>
    </Panel>
  </div>;
}

function Team({ project, people, activeIds, canManage, rememberPeople, updateProject, notify }) {
  const [team, setTeam] = useState(project.team);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const teamKey = project.team.join(",");
  useEffect(() => { if (!saving) setTeam(project.team); }, [teamKey]);
  const dirty = team.join(",") !== teamKey;
  // Teams assigned to this project; members they added are labelled with the team.
  const teamsQuery = useInternQuery("team.list", { projectId: project.id, status: "all", page: 1, pageSize: 50 }, { enabled: (project.teamIds || []).length > 0 });
  const teamNames = new Map((teamsQuery.data?.items || []).map(item => [item.id, item.name]));

  async function save() {
    if (saving) return;
    const original = new Set(project.team);
    if (team.some(id => !people.has(id) || (!activeIds.has(id) && !original.has(id)))) return setError("New team members must be active interns.");
    setError(""); setSaving(true);
    try {
      const result = await updateProject(project.id, { team: [...new Set(team)] });
      if (result !== false) notify("Team saved.");
    } finally { setSaving(false); }
  }

  return <div className={styles.teamLayout}>
    <Panel>
      {teamsQuery.data?.items.length > 0 && <div className={styles.teamsOnProject}>
        <h2>Teams on this project</h2>
        <ul>{teamsQuery.data.items.map(item => <li key={item.id}><Link href={`/intern/dashboard/teams/${encodeURIComponent(item.id)}`}>{item.name}</Link><span>{item.memberCount} {item.memberCount === 1 ? "member" : "members"}{item.status === "Archived" ? " · archived" : ""}</span></li>)}</ul>
        <p>Add or remove these members from the team’s page. People you add here directly aren’t part of a team.</p>
      </div>}
      <div className={styles.panelHeading}><h2>Assigned team</h2><span>{team.length}</span></div>
      {team.length ? <ul className={styles.memberList}>
        {team.map(id => {
          const person = people.get(id);
          if (!person) return null;
          const login = person.githubAccount?.login;
          return <li key={id}>
            <Avatar person={person} size={34} />
            <div className={styles.memberText}>
              <strong>{person.name}{project.teamSources?.[id] && teamNames.get(project.teamSources[id]) && <span className={styles.teamTag}>{teamNames.get(project.teamSources[id])}</span>}</strong>
              <span>{login ? <><Github size={12} aria-hidden="true" /> @{login}</> : person.email || person.program}</span>
            </div>
            {!project.team.includes(id) && <span className={styles.newBadge}>New</span>}
            {canManage && <Button variant="ghost" disabled={saving} onClick={() => setTeam(team.filter(member => member !== id))}>Remove<span className={styles.srOnly}> {person.name}</span></Button>}
          </li>;
        })}
      </ul> : <p className={common.muted}>No team members assigned yet.</p>}
      {error && <p role="alert" className={common.error}>{error}</p>}
      {canManage && <div className={common.formActions}>
        <Button variant="ghost" disabled={!dirty || saving} onClick={() => { setTeam(project.team); setError(""); }}>Discard changes</Button>
        <Button disabled={!dirty || saving} onClick={save}><Check size={15} /> {saving ? "Saving…" : "Save team"}</Button>
      </div>}
    </Panel>
    {canManage && <Panel>
      <TeamPicker onPeople={rememberPeople} selected={team} onChange={setTeam} label="Add active interns" />
    </Panel>}
  </div>;
}
