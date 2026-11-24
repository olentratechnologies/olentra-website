"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, Settings2, Shuffle, Sparkles, UsersRound } from "lucide-react";
import { useInternship } from "../InternshipProvider";
import { useInternQuery, useInternSearch } from "../useInternQuery";
import { canManageTeams } from "./staffAccess";
import QueryStatus from "./QueryStatus";
import { Avatar, Button, EmptyState, Modal, PageHeader, Pagination, Panel, SearchBox, Tabs } from "./DashboardUI";
import common from "./pages.module.css";
import styles from "./teams.module.css";

const LEFTOVER_OPTIONS = [
  { id: "smaller", label: "Make a smaller team", hint: "The extra interns form one smaller team." },
  { id: "spread", label: "Add them to existing teams", hint: "A few teams get one extra member." },
  { id: "individual", label: "Let them work on their own", hint: "They stay outside teams; give them individual projects." },
];
const MIX_OPTIONS = [
  { id: "random", label: "Random" },
  { id: "alphabetical", label: "Alphabetical" },
  { id: "college", label: "Mix colleges in each team" },
];
const teamHref = id => `/intern/dashboard/teams/${encodeURIComponent(id)}`;

/** Batch options: every batch with active interns, showing how many still need a team. */
function BatchSelect({ batches, value, onChange, label = "Batch", allLabel }) {
  return <label className={common.field}>{label}
    <select value={value} onChange={event => onChange(event.target.value)}>
      {allLabel && <option value="all">{allLabel}</option>}
      {batches.map(item => <option key={item.batch || "none"} value={item.batch}>{item.batch || "No batch"} · {item.unassigned} without a team</option>)}
    </select>
  </label>;
}

function TeamSettingsDialog({ settings, onClose }) {
  const { commands, notify } = useInternship();
  const [size, setSize] = useState(settings.size);
  const [leftover, setLeftover] = useState(settings.leftover);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event) {
    event.preventDefault();
    const value = Number(size);
    if (!Number.isInteger(value) || value < 1 || value > 50) { setError("Choose a team size from 1 to 50."); return; }
    setBusy(true);
    const result = await commands.teamCommand("team.settings.save", { size: value, leftover });
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    notify("Team settings saved.");
    onClose();
  }
  return <Modal open onOpenChange={open => { if (!open && !busy) onClose(); }} title="Team settings" description="Defaults for building teams. You can still change them each time.">
    <form onSubmit={save} className={styles.stack}>
      <label className={common.field}>Usual team size
        <input type="number" min="1" max="50" value={size} onChange={event => setSize(event.target.value)} />
        <span className={common.muted}>A single team can still be larger or smaller.</span>
      </label>
      <fieldset className={styles.choices}>
        <legend>When interns don’t divide evenly</legend>
        {LEFTOVER_OPTIONS.map(option => <label key={option.id} className={styles.choice} data-checked={leftover === option.id}>
          <input type="radio" name="leftover-default" checked={leftover === option.id} onChange={() => setLeftover(option.id)} />
          <span><strong>{option.label}</strong><small>{option.hint}</small></span>
        </label>)}
      </fieldset>
      {error && <p role="alert" className={common.error}>{error}</p>}
      <div className={common.formActions}>
        <Button variant="ghost" disabled={busy} onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button>
      </div>
    </form>
  </Modal>;
}

/** Pick interns who aren't in a team yet. */
function UnassignedPicker({ batch, selected, onChange }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const term = useInternSearch(search);
  const query = useInternQuery("team.unassigned", { batch: batch || "all", search: term, page, pageSize: 20 });
  const items = query.data?.items || [];
  return <fieldset className={styles.picker}>
    <legend>Interns without a team <span>{selected.length} selected</span></legend>
    <SearchBox value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="Search interns..." />
    <QueryStatus query={query} label="interns" />
    <ul className={styles.pickList}>
      {items.map(person => <li key={person.id}><label>
        <input type="checkbox" checked={selected.includes(person.id)} onChange={event => onChange(event.target.checked ? [...selected, person.id] : selected.filter(id => id !== person.id))} />
        <Avatar person={person} size={28} />
        <span><strong>{person.name}</strong><small>{[person.college, person.batch].filter(Boolean).join(" · ")}</small></span>
      </label></li>)}
      {query.data && !items.length && <li className={common.muted}>{term ? "No interns match this search." : "Everyone in this batch is already in a team."}</li>}
    </ul>
    {query.data?.total > 20 && <Pagination page={page} pageSize={20} total={query.data.total} onChange={setPage} />}
  </fieldset>;
}

function NewTeamDialog({ batches, onClose }) {
  const { commands, notify } = useInternship();
  const [name, setName] = useState("");
  const [batch, setBatch] = useState(batches[0]?.batch ?? "");
  const [members, setMembers] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function create(event) {
    event.preventDefault();
    if (!name.trim()) { setError("Give the team a name."); return; }
    setBusy(true);
    const result = await commands.teamCommand("team.create", { name: name.trim(), batch, members });
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    notify(`${name.trim()} created.`);
    onClose(result.data.ids?.[0]);
  }
  return <Modal open onOpenChange={open => { if (!open && !busy) onClose(); }} title="New team" description="Create one team and choose its members. You can add more members later." className={styles.wideDialog}>
    <form onSubmit={create} className={styles.stack}>
      <div className={common.formGrid}>
        <label className={common.field}>Team name<input value={name} maxLength={80} placeholder="e.g. Orion" onChange={event => setName(event.target.value)} /></label>
        <BatchSelect batches={batches} value={batch} onChange={value => { setBatch(value); setMembers([]); }} />
      </div>
      <UnassignedPicker batch={batch} selected={members} onChange={setMembers} />
      {error && <p role="alert" className={common.error}>{error}</p>}
      <div className={common.formActions}>
        <Button variant="ghost" disabled={busy} onClick={() => onClose()}>Cancel</Button>
        <Button type="submit" disabled={busy}><Plus size={15} /> {busy ? "Creating…" : `Create team${members.length ? ` with ${members.length}` : ""}`}</Button>
      </div>
    </form>
  </Modal>;
}

/** Build teams for a whole batch: choose, preview and adjust, then create everything at once. */
function BuildTeamsDialog({ batches, settings, programs, onClose }) {
  const { commands, notify } = useInternship();
  const firstWithInterns = batches.find(item => item.unassigned > 0) || batches[0];
  const [form, setForm] = useState({ batch: firstWithInterns?.batch ?? "", program: "all", size: settings.size, leftover: settings.leftover, mix: "random", prefix: "Team", seed: 1 });
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (name, value) => setForm(current => ({ ...current, [name]: value }));
  const selectedBatch = batches.find(item => item.batch === form.batch);

  async function preview(seed = form.seed) {
    const size = Number(form.size);
    if (!Number.isInteger(size) || size < 1 || size > 50) { setError("Choose a team size from 1 to 50."); return; }
    setBusy(true); setError("");
    const result = await commands.teamRead("team.plan", { ...form, size, seed });
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    if (!result.data.total) { setError("Everyone in this batch is already in a team."); return; }
    setForm(current => ({ ...current, seed }));
    setPlan({ teams: result.data.teams.map((team, index) => ({ key: index, name: team.name, members: team.members })), individuals: result.data.individuals, total: result.data.total });
  }
  function move(person, fromKey, toKey) {
    setPlan(current => {
      const teams = current.teams.map(team => ({ ...team, members: team.members.filter(member => member.id !== person.id) }));
      let individuals = current.individuals.filter(member => member.id !== person.id);
      if (toKey === "individual") individuals = [...individuals, person];
      else if (toKey === "new") teams.push({ key: Math.max(-1, ...teams.map(team => team.key)) + 1, name: `${form.prefix || "Team"} ${teams.length + 1}`, members: [person] });
      else teams.find(team => team.key === Number(toKey)).members.push(person);
      return { ...current, teams, individuals };
    });
  }
  async function create() {
    const teams = plan.teams.filter(team => team.members.length);
    if (!teams.length) { setError("There are no teams to create."); return; }
    if (teams.some(team => !team.name.trim())) { setError("Give every team a name."); return; }
    setBusy(true); setError("");
    const result = await commands.teamCommand("team.createMany", { batch: form.batch, program: form.program === "all" ? "" : form.program, teams: teams.map(team => ({ name: team.name.trim(), members: team.members.map(member => member.id) })) });
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    notify(`${result.data.created} teams created${plan.individuals.length ? `; ${plan.individuals.length} interns will work on their own` : ""}.`);
    onClose();
  }

  const sizes = plan?.teams.filter(team => team.members.length).map(team => team.members.length) || [];
  return <Modal open onOpenChange={open => { if (!open && !busy) onClose(); }} title="Build teams" description={plan ? "Check the teams. Rename them or move interns before creating." : "Split a batch into teams in one go."} className={styles.wideDialog}>
    {!plan ? <form className={styles.stack} onSubmit={event => { event.preventDefault(); void preview(); }}>
      <div className={common.formGrid}>
        <BatchSelect batches={batches} value={form.batch} onChange={value => set("batch", value)} />
        <label className={common.field}>Program
          <select value={form.program} onChange={event => set("program", event.target.value)}>
            <option value="all">All programs</option>
            {programs.map(program => <option key={program.id} value={program.name}>{program.name}</option>)}
          </select>
        </label>
        <label className={common.field}>Team size<input type="number" min="1" max="50" value={form.size} onChange={event => set("size", event.target.value)} /></label>
        <label className={common.field}>Team names start with<input value={form.prefix} maxLength={40} onChange={event => set("prefix", event.target.value)} /></label>
      </div>
      {selectedBatch && <p className={styles.estimate}>{estimate(selectedBatch.unassigned, Number(form.size), form.leftover)}</p>}
      <fieldset className={styles.choices}>
        <legend>When interns don’t divide evenly</legend>
        {LEFTOVER_OPTIONS.map(option => <label key={option.id} className={styles.choice} data-checked={form.leftover === option.id}>
          <input type="radio" name="leftover" checked={form.leftover === option.id} onChange={() => set("leftover", option.id)} />
          <span><strong>{option.label}</strong><small>{option.hint}</small></span>
        </label>)}
      </fieldset>
      <label className={common.field}>How to mix interns
        <select value={form.mix} onChange={event => set("mix", event.target.value)}>
          {MIX_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>
      {error && <p role="alert" className={common.error}>{error}</p>}
      <div className={common.formActions}>
        <Button variant="ghost" disabled={busy} onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy ? "Preparing…" : "Preview teams"} <ArrowRight size={15} /></Button>
      </div>
    </form> : <div className={styles.stack}>
      <p className={styles.estimate}><Sparkles size={14} aria-hidden="true" /> {plan.total} interns → {sizes.length} {sizes.length === 1 ? "team" : "teams"} ({describeSizes(sizes)}){plan.individuals.length ? `, ${plan.individuals.length} working on their own` : ""}.</p>
      <PlanPreview plan={plan} onRename={(key, name) => setPlan(current => ({ ...current, teams: current.teams.map(item => item.key === key ? { ...item, name } : item) }))} onMove={move} />
      {error && <p role="alert" className={common.error}>{error}</p>}
      <div className={common.formActions}>
        <Button variant="ghost" disabled={busy} onClick={() => { setPlan(null); setError(""); }}>Back</Button>
        <Button variant="secondary" disabled={busy || form.mix === "alphabetical"} onClick={() => preview(form.seed + 1)}><Shuffle size={14} /> Reshuffle</Button>
        <Button disabled={busy} onClick={create}>{busy ? "Creating…" : `Create ${sizes.length} ${sizes.length === 1 ? "team" : "teams"}`}</Button>
      </div>
    </div>}
  </Modal>;
}

/** The editable preview of planned teams: rename teams and move interns before anything is created. */
export function PlanPreview({ plan, onRename, onMove }) {
  const move = onMove;
  return <>
    <div className={styles.previewGrid}>
        {plan.teams.map(team => <section key={team.key} className={styles.previewTeam} aria-label={team.name}>
          <label className={styles.previewName}><span className={styles.srOnly}>Team name</span>
            <input value={team.name} maxLength={80} onChange={event => onRename(team.key, event.target.value)} />
            <span className={styles.count}>{team.members.length}</span>
          </label>
          <ul>{team.members.map(person => <li key={person.id}>
            <span><strong>{person.name}</strong>{person.college && <small>{person.college}</small>}</span>
            <MoveSelect person={person} plan={plan} fromKey={team.key} onMove={move} />
          </li>)}</ul>
          {!team.members.length && <p className={common.muted}>Empty. This team won’t be created.</p>}
        </section>)}
        {plan.individuals.length > 0 && <section className={styles.previewTeam} data-individual="true" aria-label="Working on their own">
          <div className={styles.previewName}><strong>Working on their own</strong><span className={styles.count}>{plan.individuals.length}</span></div>
          <ul>{plan.individuals.map(person => <li key={person.id}>
            <span><strong>{person.name}</strong>{person.college && <small>{person.college}</small>}</span>
            <MoveSelect person={person} plan={plan} fromKey="individual" onMove={move} />
          </li>)}</ul>
        </section>}
      </div>
  </>;
}

function MoveSelect({ person, plan, fromKey, onMove }) {
  return <label className={styles.moveSelect}><span className={styles.srOnly}>Move {person.name} to</span>
    <select value="" onChange={event => event.target.value && onMove(person, fromKey, event.target.value)}>
      <option value="">Move…</option>
      {plan.teams.filter(team => team.key !== fromKey).map(team => <option key={team.key} value={team.key}>{team.name || "Unnamed team"}</option>)}
      <option value="new">A new team</option>
      {fromKey !== "individual" && <option value="individual">Work on their own</option>}
    </select>
  </label>;
}

function describeSizes(sizes) {
  const counts = new Map();
  for (const size of sizes) counts.set(size, (counts.get(size) || 0) + 1);
  return [...counts].sort((a, b) => b[0] - a[0]).map(([size, count]) => `${count} of ${size}`).join(", ");
}
function estimate(count, size, leftover) {
  if (!count) return "Everyone in this batch is already in a team.";
  if (!Number.isInteger(size) || size < 1) return `${count} interns without a team.`;
  const full = Math.floor(count / size), rest = count % size;
  if (!full) return leftover === "individual" ? `${count} interns: fewer than one team, so they’ll work on their own.` : `${count} interns: one team of ${count}.`;
  if (!rest) return `${count} interns → ${full} teams of ${size}.`;
  if (leftover === "smaller") return `${count} interns → ${full} teams of ${size} and 1 team of ${rest}.`;
  if (leftover === "individual") return `${count} interns → ${full} teams of ${size}; ${rest} work on their own.`;
  return `${count} interns → ${full} teams, ${rest} of them with ${size + 1} members.`;
}

export function TeamCard({ team, usualSize }) {
  const shown = team.members.slice(0, 6);
  return <article className={styles.card}>
    <div className={styles.cardTop}>
      <h2><Link href={teamHref(team.id)}>{team.name}</Link></h2>
      {team.memberCount > usualSize && <span className={styles.note}>Above usual size</span>}
    </div>
    <p className={styles.meta}>{[team.batch || "No batch", team.program].filter(Boolean).join(" · ")}</p>
    <div className={styles.avatars} aria-label={`${team.memberCount} members`}>
      {shown.map(member => <Avatar key={member.id} person={member} size={30} />)}
      {team.memberCount > shown.length && <span className={styles.more}>+{team.memberCount - shown.length}</span>}
      <span className={styles.memberCount}>{team.memberCount} {team.memberCount === 1 ? "member" : "members"}</span>
    </div>
    <div className={styles.projects}>
      {team.projects.length ? team.projects.map(project => <span key={project.id} className={styles.projectChip}>{project.name}</span>) : <span className={styles.noProject}>No project yet</span>}
    </div>
    <Link className={styles.cardLink} href={teamHref(team.id)}>Open team <ArrowRight size={13} /></Link>
  </article>;
}

export default function TeamsPage() {
  const { data, account } = useInternship();
  const canManage = canManageTeams(account);
  const [tab, setTab] = useState("Active");
  const [batch, setBatch] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(null);
  const term = useInternSearch(search);
  const list = useInternQuery("team.list", { status: tab, batch, search: term, page, pageSize: 24 });
  const batchesQuery = useInternQuery("team.batches", {});
  const settingsQuery = useInternQuery("team.settings", {});
  const settings = settingsQuery.data || { size: 5, leftover: "smaller" };
  const batches = batchesQuery.data?.batches || [];
  const without = batches.reduce((sum, item) => sum + item.unassigned, 0);
  const counts = list.data?.counts || {};

  return <div className={common.page}>
    <PageHeader title="Teams" description="Group interns into teams and give each team a project.">
      {canManage && <>
        <Button variant="ghost" onClick={() => setDialog("settings")} disabled={!settingsQuery.data}><Settings2 size={15} /> Team settings</Button>
        <Button variant="secondary" onClick={() => setDialog("new")} disabled={!batchesQuery.data}><Plus size={15} /> New team</Button>
        <Button onClick={() => setDialog("build")} disabled={!batchesQuery.data || !settingsQuery.data}><UsersRound size={15} /> Build teams</Button>
      </>}
    </PageHeader>
    <QueryStatus query={batchesQuery} label="batches" compact />
    {batches.length > 0 && <ul className={styles.batchStrip} aria-label="Batches">
      {batches.map(item => <li key={item.batch || "none"}>
        <strong>{item.batch || "No batch"}</strong>
        <span>{item.active} active</span>
        <span data-tone={item.unassigned ? "amber" : "green"}>{item.unassigned ? `${item.unassigned} without a team` : "Everyone in a team"}</span>
      </li>)}
    </ul>}
    <div className={styles.toolbar}>
      <Tabs items={[{ id: "Active", label: "Active", count: counts.Active ?? undefined }, { id: "Archived", label: "Archived", count: counts.Archived ?? undefined }]} value={tab} onChange={value => { setTab(value); setPage(1); }} label="Team status" />
      <div className={common.filters}>
        <label className={styles.inlineSelect}><span className={styles.srOnly}>Batch</span>
          <select value={batch} onChange={event => { setBatch(event.target.value); setPage(1); }}>
            <option value="all">All batches</option>
            {batches.map(item => <option key={item.batch || "none"} value={item.batch}>{item.batch || "No batch"}</option>)}
          </select>
        </label>
        <SearchBox value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="Search teams or interns..." />
      </div>
    </div>
    <QueryStatus query={list} label="teams" />
    {list.data?.items.length ? <div className={styles.grid} aria-busy={list.loading || list.refreshing}>
      {list.data.items.map(team => <TeamCard key={team.id} team={team} usualSize={settings.size} />)}
    </div> : list.data ? <Panel><EmptyState title={tab === "Archived" ? "No archived teams" : term || batch !== "all" ? "No teams match" : "No teams yet"} description={tab === "Archived" ? "Teams you archive appear here." : canManage ? "Use Build teams to split a batch into teams, or create one team at a time." : "Teams will appear here once they’re created."} /></Panel> : null}
    {list.data && <Pagination page={page} pageSize={24} total={list.data.total} onChange={setPage} />}
    {without > 0 && tab === "Active" && <Unassigned canManage={canManage} batch={batch} />}
    {dialog === "settings" && <TeamSettingsDialog settings={settings} onClose={() => setDialog(null)} />}
    {dialog === "new" && <NewTeamDialog batches={batches} onClose={() => setDialog(null)} />}
    {dialog === "build" && <BuildTeamsDialog batches={batches} settings={settings} programs={data.programs || []} onClose={() => setDialog(null)} />}
  </div>;
}

/** Interns not in a team yet, with a quick way to add each one to a team. */
function Unassigned({ canManage, batch }) {
  const { commands, notify } = useInternship();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState("");
  const term = useInternSearch(search);
  const query = useInternQuery("team.unassigned", { batch, search: term, page, pageSize: 10 });
  const teamsQuery = useInternQuery("team.list", { status: "Active", batch, page: 1, pageSize: 100 }, { enabled: canManage });
  async function add(person, teamId) {
    setBusy(person.id);
    const result = await commands.teamCommand("team.addMembers", { id: teamId, members: [person.id] });
    setBusy("");
    notify(result.ok ? `${person.name} added.` : result.error);
  }
  return <Panel className={styles.unassigned}>
    <div className={common.panelTitle}><h2>Not in a team <span className={styles.count}>{query.data?.total ?? ""}</span></h2></div>
    <p className={common.muted}>These active interns can join a team, or work on their own with an individual project.</p>
    <SearchBox value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="Search interns..." />
    <QueryStatus query={query} label="interns" />
    <ul className={styles.unassignedList}>
      {(query.data?.items || []).map(person => <li key={person.id}>
        <Avatar person={person} size={30} />
        <span className={styles.personText}><strong>{person.name}</strong><small>{[person.college, person.batch, person.program].filter(Boolean).join(" · ")}</small></span>
        {canManage && <label className={styles.inlineSelect}><span className={styles.srOnly}>Add {person.name} to a team</span>
          <select value="" disabled={busy === person.id || !teamsQuery.data?.items.length} onChange={event => event.target.value && add(person, event.target.value)}>
            <option value="">{teamsQuery.data?.items.length ? "Add to team…" : "No teams yet"}</option>
            {(teamsQuery.data?.items || []).filter(team => !person.batch || !team.batch || team.batch === person.batch).map(team => <option key={team.id} value={team.id}>{team.name} ({team.memberCount})</option>)}
          </select>
        </label>}
      </li>)}
    </ul>
    {query.data?.total > 10 && <Pagination page={page} pageSize={10} total={query.data.total} onChange={setPage} />}
  </Panel>;
}

export { UnassignedPicker };
