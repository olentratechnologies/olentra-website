"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  FolderKanban,
  Plus,
  Users,
  X,
} from "lucide-react";
import { useDashboard } from "./DashboardProvider";
import { hasStaffPermission } from "./staffAccess";
import { useInternQuery, useInternSearch } from "../useInternQuery";
import QueryStatus from "./QueryStatus";
import { ProjectWorkflow } from "./CompanyWorkflow";
import {
  Avatar,
  Button,
  EmptyState,
  FilterMenu,
  Modal,
  PageHeader,
  Pagination,
  Panel,
  SearchBox,
  StatusBadge,
  Tabs,
  TrackBadge,
  formatDate,
} from "./DashboardUI";
import { PlanetArtwork } from "./DashboardVisuals";
import common from "./pages.module.css";
import styles from "./portfolio.module.css";

function GeometricArtwork({ kind }) {
  const uniqueId = useId().replaceAll(":", "");
  const id = `project-art-${uniqueId}`;
  return (
    <svg
      viewBox="0 0 300 200"
      fill="none"
      aria-hidden="true"
      className={styles.geometricArt}
    >
      <defs>
        <linearGradient
          id={`${id}-face`}
          x1="85"
          y1="40"
          x2="210"
          y2="160"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#bcadff" />
          <stop offset=".45" stopColor="#7750ef" />
          <stop offset="1" stopColor="#263b94" />
        </linearGradient>
        <linearGradient
          id={`${id}-left`}
          x1="90"
          y1="50"
          x2="150"
          y2="165"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#bf7aff" />
          <stop offset="1" stopColor="#452aa4" />
        </linearGradient>
        <linearGradient
          id={`${id}-right`}
          x1="155"
          y1="45"
          x2="222"
          y2="150"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#9ee7ff" />
          <stop offset=".5" stopColor="#4a90ff" />
          <stop offset="1" stopColor="#232a80" />
        </linearGradient>
        <radialGradient id={`${id}-sphere`} cx="30%" cy="20%" r="85%">
          <stop stopColor="#e1f4ff" />
          <stop offset=".25" stopColor="#79c8ff" />
          <stop offset=".55" stopColor="#4d7bdf" />
          <stop offset="1" stopColor="#24265f" />
        </radialGradient>
        <radialGradient id={`${id}-halo`}>
          <stop
            stopColor={kind === "cube" ? "#a174ff" : "#62baff"}
            stopOpacity=".55"
          />
          <stop offset="1" stopColor="#4c7aff" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-blur`}>
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <ellipse
        cx="150"
        cy="163"
        rx="68"
        ry="12"
        fill="#101736"
        opacity=".55"
        filter={`url(#${id}-blur)`}
      />
      <ellipse cx="150" cy="100" rx="130" ry="90" fill={`url(#${id}-halo)`} />
      {kind === "cube" ? (
        <g>
          <path
            d="m150 29 65 36-65 38-65-38 65-36Z"
            fill={`url(#${id}-face)`}
            stroke="#d5c6ff"
            strokeWidth="1.5"
          />
          <path
            d="m85 65 65 38v71l-65-38V65Z"
            fill={`url(#${id}-left)`}
            stroke="#bd8cff"
            strokeWidth="1.5"
          />
          <path
            d="m150 103 65-38v71l-65 38v-71Z"
            fill={`url(#${id}-right)`}
            stroke="#b1d0ff"
            strokeWidth="1.5"
          />
          <path
            d="m150 42 43 24-43 25-43-25 43-24Z"
            stroke="#e3d6ff"
            strokeOpacity=".55"
          />
          <path
            d="m97 86 41 24v42l-41-24V86Z"
            stroke="#e0acff"
            strokeOpacity=".6"
          />
          <path
            d="m162 110 41-24v42l-41 24v-42Z"
            stroke="#bceaff"
            strokeOpacity=".55"
          />
          <path
            d="m85 65 65 38 65-38M150 103v71"
            stroke="#e0dbff"
            strokeWidth="2"
          />
          <circle cx="85" cy="65" r="3" fill="#ecbfff" />
          <circle cx="215" cy="65" r="3" fill="#bdeaff" />
          <circle cx="150" cy="103" r="3" fill="#fff" />
        </g>
      ) : (
        <g>
          <circle
            cx="150"
            cy="99"
            r="61"
            fill={`url(#${id}-sphere)`}
            stroke="#a9d5ff"
            strokeOpacity=".7"
          />
          <ellipse
            cx="150"
            cy="99"
            rx="61"
            ry="20"
            stroke="#b6d7ff"
            strokeOpacity=".55"
            transform="rotate(-25 150 99)"
          />
          <ellipse
            cx="150"
            cy="99"
            rx="22"
            ry="61"
            stroke="#a5d6ff"
            strokeOpacity=".5"
            transform="rotate(-25 150 99)"
          />
          <ellipse
            cx="150"
            cy="99"
            rx="47"
            ry="61"
            stroke="#b7d9ff"
            strokeOpacity=".35"
            transform="rotate(-25 150 99)"
          />
          <path
            d="M98 68c29 16 68 11 95-13M103 139c27-28 68-42 107-33"
            stroke="#c5ddff"
            strokeOpacity=".45"
          />
          <ellipse
            cx="150"
            cy="100"
            rx="97"
            ry="31"
            stroke="#9caeff"
            strokeWidth="2"
            transform="rotate(-25 150 100)"
          />
          <ellipse
            cx="150"
            cy="100"
            rx="104"
            ry="34"
            stroke="#6786ff"
            strokeOpacity=".45"
            transform="rotate(-25 150 100)"
          />
          <circle cx="69" cy="130" r="5" fill="#ba8cff" />
          <circle cx="230" cy="68" r="4" fill="#aff0ff" />
        </g>
      )}
      <path
        d="M54 56h8m-4-4v8M239 138h7m-3.5-3.5v7"
        stroke="#c4d9ff"
        strokeOpacity=".6"
        strokeLinecap="round"
      />
      <circle cx="225" cy="36" r="2" fill="#a7caff" />
      <circle cx="59" cy="157" r="1.5" fill="#c0b0ff" />
    </svg>
  );
}

function TeamPicker({ selected, onChange, onPeople, label = "Assign team members" }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useInternSearch(search);
  const peopleQuery = useInternQuery("intern.list", { status: "Active", search: debouncedSearch, page, pageSize: 20 });
  const listing = peopleQuery.data || { items: [], total: 0 };
  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => {
    if (peopleQuery.data) onPeople(peopleQuery.data.items.map(item => ({ ...item.application, internshipStatus: item.status })).filter(item => item.id));
  }, [peopleQuery.data, onPeople]);
  useEffect(() => {
    if (!peopleQuery.data || page <= 1) return;
    const lastPage = Math.max(1, Math.ceil(peopleQuery.data.total / 20));
    if (page > lastPage) setPage(lastPage);
  }, [peopleQuery.data, page]);
  const displayed = listing.items.map(item => ({ ...item.application, internshipStatus: item.status })).filter(item => item.id);
  return <fieldset className={styles.teamPicker} aria-busy={peopleQuery.loading || peopleQuery.refreshing}><legend>{label} <span>{selected.length} selected</span></legend><SearchBox value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="Search active interns..."/><QueryStatus query={peopleQuery} label="active interns"/><div className={styles.pickerList}>{displayed.map(person => <label className={styles.pickerPerson} key={person.id}><input type="checkbox" checked={selected.includes(person.id)} onChange={event => onChange(event.target.checked ? [...new Set([...selected, person.id])] : selected.filter(id => id !== person.id))}/><Avatar person={person} size={30}/><span><strong>{person.name}</strong><small>{person.program}</small></span><TrackBadge programId={person.programId}/></label>)}{peopleQuery.data && !displayed.length && <p className={styles.pickerEmpty}>No active interns match this search.</p>}</div>{peopleQuery.data && <Pagination page={page} pageSize={20} total={listing.total} onChange={setPage}/>}</fieldset>;
}

export function ProjectsPage() {
  const { data, query, notify, createProject, updateProject, deleteProject, account } = useDashboard();
  const canManage = hasStaffPermission(account, "projects.manage");
  const canReadTasks = hasStaffPermission(account, "tasks.read");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [track, setTrack] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    program: "Tech Innovator",
    dueOn: "",
    art: "planet",
    team: [],
  });
  const [formError, setFormError] = useState("");
  const [detail, setDetail] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [contributionSearch, setContributionSearch] = useState("");
  const [allContributions, setAllContributions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page,setPage] = useState(1), pageSize = 9;
  const [peopleCache, setPeopleCache] = useState({});
  const rememberPeople = useCallback((records) => setPeopleCache(previous => { const next = { ...previous }; for (const record of records) if (record?.id) next[record.id] = record; return next; }), []);
  const debouncedSearch = useInternSearch(search);
  const debouncedQuery = useInternSearch(query);
  const programId = data.programs.find(program => program.name === track)?.id || "all";
  const params = { search: debouncedSearch, query: debouncedQuery, programId };
  const listQuery = useInternQuery("project.list", { ...params, status: tab, page, pageSize });
  const summaryQuery = useInternQuery("project.list", { ...params, status: "all", page: 1, pageSize: 1 });
  const listing = listQuery.data || { items: [], total: 0 };
  const summary = summaryQuery.data;
  useEffect(() => { setPage(1); }, [tab, search, query, track]);
  useEffect(() => {
    if (!listQuery.data || page <= 1) return;
    const lastPage = Math.max(1, Math.ceil(listQuery.data.total / pageSize));
    if (page > lastPage) setPage(lastPage);
  }, [listQuery.data, page, pageSize]);
  const projects = listing.items;
  const people = useMemo(()=>{const map=new Map(data.applications.map(person=>[person.id,person]));Object.values(peopleCache).forEach(person=>map.set(person.id,person));for(const project of projects) for(const member of project.members || []) map.set(member.id,member);return map},[data.applications,peopleCache,projects]);
  const activeIds = useMemo(()=>{const ids=new Set(data.interns.filter(intern=>intern.status==="Active").map(intern=>intern.applicationId));Object.values(peopleCache).forEach(person=>{if(person.internshipStatus==="Active")ids.add(person.id)});for(const project of projects)for(const intern of project.teamInterns || [])if(intern.status==="Active")ids.add(intern.applicationId);return ids},[data.interns,peopleCache,projects]);
  const filtered = projects;
  const selectedProject = detail ? projects.find(project=>project.id===detail.id) : null;
  const contributions = (data.contributions || []).filter((contribution) => {
    const project = projects.find((item) => item.id === contribution.projectId);
    const person = people.get(contribution.applicationId);
    const haystack =
      `${person?.name} ${project?.name} ${contribution.description}`.toLowerCase();
    return (
      (!query || haystack.includes(query.toLowerCase())) &&
      (!contributionSearch ||
        haystack.includes(contributionSearch.toLowerCase()))
    );
  });
  const openProject = (project) => {
    setDetail({
      id: project.id,
      name: project.name,
      description: project.description,
      program: project.program,
      dueOn: project.dueOn,
      progress: project.progress,
      status: project.status,
      team: [...project.team],
    });
    setDetailError("");
    setDeleteConfirm(false);
  };
  const saveNewProject = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (form.name.trim().length < 3)
      return setFormError("Enter a project name with at least 3 characters.");
    if (form.description.trim().length < 12)
      return setFormError("Describe the project in at least 12 characters.");
    if (!data.programs.some((program) => program.name === form.program))
      return setFormError("Choose a valid internship track.");
    if (form.team.some((id) => !activeIds.has(id)))
      return setFormError(
        "Team members must be active interns. Review your selection.",
      );
    if (!form.dueOn) return setFormError("Choose a project due date.");
    setSaving(true);
    try {
      const project = await createProject({
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        team: [...new Set(form.team)],
        progress: 0,
        status: "In progress",
      });
      if (!project) return;
      setCreateOpen(false);
      setForm({
        name: "",
        description: "",
        program: "Tech Innovator",
        dueOn: "",
        art: "planet",
        team: [],
      });
      setFormError("");
      notify(`${project.name} created.`);
    } finally {
      setSaving(false);
    }
  };
  const saveProject = async (event) => {
    event.preventDefault();
    if (!selectedProject || saving) return;
    if (
      !Number.isFinite(Number(detail.progress)) ||
      Number(detail.progress) < 0 ||
      Number(detail.progress) > 100
    )
      return setDetailError("Progress must be between 0 and 100.");
    if (detail.name.trim().length < 3) return setDetailError("Enter a project name with at least 3 characters.");
    if (detail.description.trim().length < 12) return setDetailError("Describe the project in at least 12 characters.");
    if (!data.programs.some(program => program.name === detail.program)) return setDetailError("Choose a valid internship track.");
    if (!detail.dueOn) return setDetailError("Choose a project due date.");
    setDetailError("");
    const originalIds = new Set(selectedProject.team);
    if (
      detail.team.some(
        (id) => !people.has(id) || (!activeIds.has(id) && !originalIds.has(id)),
      )
    )
      return setDetailError("New team members must be active interns.");
    setSaving(true);
    try {
      const saved = await updateProject(detail.id, {
        name: detail.name.trim(),
        description: detail.description.trim(),
        program: detail.program,
        dueOn: detail.dueOn,
        status: detail.status,
        progress: detail.status === "Completed" ? 100 : Number(detail.progress),
        team: [...new Set(detail.team)],
      });
      if (saved === false) return;
      setDetail(null);
      notify("Project changes saved.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className={common.page}>
      <PageHeader
        title="Projects"
        description="Build together. Learn by doing. Make an impact."
      >
        {canManage && <Button
          onClick={() => {
            setCreateOpen(true);
            setFormError("");
          }}
        >
          <Plus size={16} /> Create Project
        </Button>}
      </PageHeader>
      <div className={styles.projectToolbar}>
        <Tabs
          items={[
            { id: "all", label: "All Projects", count: summary?.total },
            {
              id: "In progress",
              label: "In Progress",
              count: summary ? summary.counts?.statuses?.["In progress"] || 0 : undefined,
            },
            {
              id: "Completed",
              label: "Completed",
              count: summary ? summary.counts?.statuses?.Completed || 0 : undefined,
            },
          ]}
          value={tab}
          onChange={value => { setTab(value); setPage(1); }}
        />
        <div className={common.filters}>
          <SearchBox
            value={search}
            onChange={value => { setSearch(value); setPage(1); }}
            placeholder="Search projects..."
          />
          <FilterMenu>
            <label>
              Internship track
              <select
                value={track}
                onChange={(event) => { setTrack(event.target.value); setPage(1); }}
              >
                <option value="all">All tracks</option>
                {data.programs.map((program) => (
                  <option key={program.id} value={program.name}>
                    {program.name}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="ghost"
              onClick={() => {
                setTrack("all");
                setSearch("");
                setTab("all");
              }}
            >
              Clear filters
            </Button>
          </FilterMenu>
        </div>
      </div>
      <QueryStatus query={summaryQuery} label="project totals" compact/>
      <QueryStatus query={listQuery} label="projects"/>
      {filtered.length ? (
        <div className={styles.projectGrid} aria-busy={listQuery.loading || listQuery.refreshing}>
          {filtered.map((project) => (
            <article className={styles.projectCard} key={project.id}>
              <button
                className={styles.projectCover}
                data-art={project.art}
                onClick={() => openProject(project)}
                aria-label={`View ${project.name}`}
              >
                <span className={styles.coverEyebrow}>
                  <FolderKanban size={13} />{" "}
                  {project.program === "Tech Innovator"
                    ? "INNOVATOR PROJECT"
                    : "EXPLORER PROJECT"}
                </span>
                {project.art === "planet" ? (
                  <PlanetArtwork className={styles.planetArt} />
                ) : (
                  <GeometricArtwork kind={project.art} />
                )}
                <span className={styles.coverStatus}>
                  <StatusBadge status={project.status} />
                </span>
              </button>
              <div className={styles.projectBody}>
                <h2>
                  <button onClick={() => openProject(project)}>
                    {project.name}
                  </button>
                </h2>
                <p className={styles.projectDescription}>
                  {project.description}
                </p>
                <div className={styles.projectMeta}>
                  <TrackBadge
                    programId={
                      project.program === "Tech Innovator"
                        ? "innovator"
                        : "explorer"
                    }
                    label={project.program}
                  />
                  <span>{project.team.length} members</span>
                </div>
                <div className={styles.progressLabel}>
                  <span>Project progress</span>
                  <strong>{project.progress}%</strong>
                </div>
                <div
                  className={styles.progressTrack}
                  role="progressbar"
                  aria-label={`${project.name} progress`}
                  aria-valuenow={project.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span style={{ width: `${project.progress}%` }} />
                </div>
                <div className={styles.projectFooter}>
                  <div className={styles.avatarStack}>
                    {project.team.slice(0, 4).map((id) => (
                      <Avatar key={id} person={people.get(id)} size={28} />
                    ))}
                    {project.team.length > 4 && (
                      <span className={styles.moreAvatar}>
                        +{project.team.length - 4}
                      </span>
                    )}
                    {!project.team.length && (
                      <span className={common.muted}>Team forming</span>
                    )}
                  </div>
                  <button
                    className={styles.projectLink}
                    onClick={() => openProject(project)}
                  >
                    View Project <ArrowRight size={14} />
                  </button>
                </div>
                <div className={styles.projectDue}>
                  <CalendarDays size={12} /> Due {formatDate(project.dueOn)}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : listQuery.data ? (
        <Panel>
          <EmptyState
            title="No projects found"
            description="Try another search or create a project for your interns."
          />
        </Panel>
      ) : null}
      {listQuery.data && <Pagination page={page} pageSize={pageSize} total={listing.total} onChange={setPage}/>}
      <Panel className={styles.contributionsPanel}>
        <div className={common.panelTitle}>
          <h2>
            <span className={styles.titleIcon}>
              <Users size={17} />
            </span>{" "}
            Recent Contributions
          </h2>
          <button
            className={styles.textAction}
            onClick={() => setAllContributions((value) => !value)}
          >
            {allContributions ? "Show Less" : "View All"}{" "}
            <ArrowRight size={13} />
          </button>
        </div>
        <div className={styles.contributionSearch}>
          <SearchBox
            value={contributionSearch}
            onChange={setContributionSearch}
            placeholder="Search contributions..."
          />
        </div>
        {contributions.length ? (
          <div className={styles.contributionList}>
            {contributions
              .slice(0, allContributions ? contributions.length : 4)
              .map((contribution) => {
                const person = people.get(contribution.applicationId);
                const project = projects.find(
                  (item) => item.id === contribution.projectId,
                );
                return (
                  <div className={styles.contributionRow} key={contribution.id}>
                    <Avatar person={person} size={37} />
                    <div className={styles.contributionCopy}>
                      <strong>{person?.name || "Intern"}</strong>
                      <p>{contribution.description}</p>
                      <button onClick={() => project && openProject(project)}>
                        {project?.name}
                        <ArrowRight size={11} />
                      </button>
                    </div>
                    <time dateTime={contribution.occurredOn}>
                      {contribution.time}
                    </time>
                  </div>
                );
              })}
          </div>
        ) : (
          <EmptyState
            title="No contributions found"
            description="Try a different name, project, or keyword."
          />
        )}
      </Panel>
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create a new project"
        description="Give your team a shared goal and a place to build."
        className={styles.projectModal}
      >
        <form onSubmit={saveNewProject}>
          <div className={common.formGrid}>
            <label className={`${common.field} ${common.fullWidth}`}>
              Project name
              <input
                value={form.name}
                maxLength={100}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="e.g. Student Learning Platform"
                required
                minLength={3}
              />
            </label>
            <label className={`${common.field} ${common.fullWidth}`}>
              Description
              <textarea
                rows={3}
                value={form.description}
                maxLength={600}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="What will your team build?"
                required
                minLength={12}
              />
            </label>
            <label className={common.field}>
              Internship track
              <select
                value={form.program}
                onChange={(event) =>
                  setForm({ ...form, program: event.target.value })
                }
              >
                {data.programs.map((program) => (
                  <option key={program.id} value={program.name}>
                    {program.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={common.field}>
              Due date
              <input
                type="date"
                value={form.dueOn}
                onChange={(event) =>
                  setForm({ ...form, dueOn: event.target.value })
                }
                required
              />
            </label>
            <label className={`${common.field} ${common.fullWidth}`}>
              Cover artwork
              <select
                value={form.art}
                onChange={(event) =>
                  setForm({ ...form, art: event.target.value })
                }
              >
                <option value="planet">Orbital planet</option>
                <option value="cube">Prismatic cube</option>
                <option value="sphere">Connected sphere</option>
              </select>
            </label>
          </div>
          <TeamPicker
            onPeople={rememberPeople}
            selected={form.team}
            onChange={(team) => setForm({ ...form, team })}
          />
          {formError && (
            <p role="alert" className={common.error}>
              {formError}
            </p>
          )}
          <div className={common.formActions}>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Plus size={15} /> Create Project
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={Boolean(detail && selectedProject)}
        onOpenChange={(open) => !open && setDetail(null)}
        title={selectedProject?.name || "Project details"}
        description={selectedProject?.description}
        className={styles.projectModal}
      >
        {selectedProject && detail && (
          <>
            <form onSubmit={saveProject}>
              <div className={styles.detailOverview}>
                <TrackBadge
                  programId={
                    selectedProject.program === "Tech Innovator"
                      ? "innovator"
                      : "explorer"
                  }
                  label={selectedProject.program}
                />
                <span>
                  <CalendarDays size={14} /> Due{" "}
                  {formatDate(selectedProject.dueOn)}
                </span>
              </div>
              <div className={common.formGrid}>
                <label className={common.field}>
                  Project name
                  <input disabled={!canManage || saving} value={detail.name} maxLength={200} required onChange={event => setDetail({ ...detail, name: event.target.value })} />
                </label>
                <label className={common.field}>
                  Program
                  <select disabled={!canManage || saving} value={detail.program} onChange={event => setDetail({ ...detail, program: event.target.value })}>
                    {data.programs.map(program => <option key={program.id} value={program.name}>{program.name}</option>)}
                  </select>
                </label>
                <label className={common.field}>
                  Description
                  <textarea disabled={!canManage || saving} value={detail.description} maxLength={5000} required rows={4} onChange={event => setDetail({ ...detail, description: event.target.value })} />
                </label>
                <label className={common.field}>
                  Due date
                  <input disabled={!canManage || saving} type="date" required value={detail.dueOn} onChange={event => setDetail({ ...detail, dueOn: event.target.value })} />
                </label>
                <label className={common.field}>
                  Project status
                  <select
                    disabled={!canManage}
                    value={detail.status}
                    onChange={(event) =>
                      setDetail({ ...detail, status: event.target.value })
                    }
                  >
                    {["Planning", "In progress", "In review", "Completed"].map(
                      (status) => (
                        <option key={status}>{status}</option>
                      ),
                    )}
                  </select>
                </label>
                <label className={common.field}>
                  Progress (%)
                  <input
                    disabled={!canManage}
                    type="number"
                    min="0"
                    max="100"
                    value={detail.progress}
                    onChange={(event) =>
                      setDetail({ ...detail, progress: event.target.value })
                    }
                    required
                  />
                </label>
              </div>
              <div className={styles.selectedMembers}>
                <h3>
                  Assigned team <span>{detail.team.length}</span>
                </h3>
                {detail.team.length ? (
                  <div>
                    {detail.team.map((id) => {
                      const person = people.get(id);
                      return (
                        person && (
                          <span key={id}>
                            <Avatar person={person} size={22} />
                            {person.name}
                            {canManage && <button
                              type="button"
                              aria-label={`Remove ${person.name} from project`}
                              onClick={() =>
                                setDetail({
                                  ...detail,
                                  team: detail.team.filter(
                                    (member) => member !== id,
                                  ),
                                })
                              }
                            >
                              <X size={12} />
                            </button>}
                          </span>
                        )
                      );
                    })}
                  </div>
                ) : (
                  <p>No team members assigned yet.</p>
                )}
              </div>
              {canManage && <TeamPicker
                onPeople={rememberPeople}
                    selected={detail.team}
                onChange={(team) => setDetail({ ...detail, team })}
                label="Add active interns"
              />}
              {detailError && (
                <p className={common.error} role="alert">
                  {detailError}
                </p>
              )}
              <div className={common.formActions}>
                <Button variant="ghost" disabled={saving} onClick={() => setDetail(null)}>
                  Cancel
                </Button>
                {canManage && <Button type="button" variant="ghost" disabled={saving} onClick={() => setDeleteConfirm(true)}>Delete project</Button>}
                {canManage && <Button type="submit" disabled={saving}>
                  <Check size={15} /> Save Changes
                </Button>}
              </div>
            </form>
            {canManage && deleteConfirm && <div role="alert" className={common.error}>
              <p>Delete “{selectedProject.name}”? This permanently removes the project and all its tasks and submissions. This cannot be undone.</p>
              <Button type="button" disabled={saving} onClick={() => setDeleteConfirm(false)}>Keep project</Button>
              <Button type="button" disabled={saving} onClick={async () => {
                if (saving) return;
                setSaving(true);
                try {
                  const result = await deleteProject(detail.id);
                  if (result === false) return;
                  setDetail(null);
                  setDeleteConfirm(false);
                  notify("Project deleted.");
                } finally { setSaving(false); }
              }}>Permanently delete project</Button>
            </div>}
            {canReadTasks && <ProjectWorkflow projectId={selectedProject.id} projectRecord={selectedProject} directoryPeople={people} activeMemberIds={activeIds} />}
          </>
        )}
      </Modal>
    </div>
  );
}

export default ProjectsPage;
