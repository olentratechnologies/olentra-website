"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BookOpen, Check, Clock, ExternalLink, Github, Link2, Lock, Mail, Palette, Pencil, Plus, RefreshCw, Server, SquareKanban, Trash2, Users } from "lucide-react";
import { useInternship } from "./InternshipProvider";
import styles from "./project-links.module.css";

export const LINK_KINDS = [
  { value: "repository", label: "Repository", icon: Github },
  { value: "docs", label: "Docs", icon: BookOpen },
  { value: "design", label: "Design", icon: Palette },
  { value: "board", label: "Board", icon: SquareKanban },
  { value: "environment", label: "Environment", icon: Server },
  { value: "other", label: "Other", icon: Link2 },
];
const kindOf = value => LINK_KINDS.find(kind => kind.value === value) || LINK_KINDS[LINK_KINDS.length - 1];
const EMPTY = { kind: "repository", label: "", url: "", note: "", visibleToInterns: true };

export function safeLink(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

/** Mirrors the server rules so most mistakes are caught before saving. */
export function linkProblem(link) {
  if (!link.label.trim()) return "Give the link a name.";
  if (link.label.trim().length > 120) return "Keep the link name to 120 characters.";
  const href = safeLink(link.url.trim());
  if (!href) return "Enter a valid http or https link.";
  const url = new URL(href);
  if (url.username || url.password) return "Remove the username or password from the link. Don't paste passwords or tokens.";
  if ((link.note || "").length > 500) return "Keep link notes to 500 characters.";
  if (link.visibleToInterns !== false && Array.isArray(link.members) && !link.members.length) return "Choose at least one intern, or make the link available to the whole team.";
  return "";
}

/** The team members a link is for: everyone, the chosen interns, or nobody for staff-only links. */
export function linkAudience(link, members) {
  if (link.visibleToInterns === false) return [];
  return Array.isArray(link.members) ? members.filter(member => link.members.includes(member.id)) : members;
}

function LinkRow({ link, children, access }) {
  const kind = kindOf(link.kind), Icon = kind.icon, href = safeLink(link.url);
  return <li className={styles.row}>
    <span className={styles.icon} data-kind={kind.value} aria-hidden="true"><Icon size={16} /></span>
    <div className={styles.body}>
      <div className={styles.titleLine}>
        {href ? <a href={href} target="_blank" rel="noopener noreferrer">{link.label}<ExternalLink size={12} aria-hidden="true" /><span className={styles.srOnly}> (opens in a new tab)</span></a> : <strong>{link.label}</strong>}
        <span className={styles.kind}>{kind.label}</span>
        {link.visibleToInterns === false && <span className={styles.badge} data-tone="muted"><Lock size={11} aria-hidden="true" /> Staff only</span>}
        {link.visibleToInterns !== false && Array.isArray(link.members) && <span className={styles.badge} data-tone="muted"><Users size={11} aria-hidden="true" /> {link.members.length} selected {link.members.length === 1 ? "intern" : "interns"}</span>}
        {access}
      </div>
      {link.note && <p className={styles.note}>{link.note}</p>}
      {children}
    </div>
  </li>;
}

function AccessBadge({ status }) {
  if (status === "granted") return <span className={styles.badge} data-tone="green"><Check size={11} aria-hidden="true" /> Access granted</span>;
  if (status === "invited") return <span className={styles.badge} data-tone="blue"><Mail size={11} aria-hidden="true" /> Invite sent</span>;
  return <span className={styles.badge} data-tone="amber"><Clock size={11} aria-hidden="true" /> Access pending</span>;
}

/** `https://github.com/owner/repo/...` → the page where the intern accepts a repository invite. */
export function invitationUrl(url) {
  const href = safeLink(url);
  if (!href) return null;
  const parsed = new URL(href);
  const [owner, repo] = parsed.pathname.split("/").filter(Boolean);
  return /^(www\.)?github\.com$/i.test(parsed.hostname) && owner && repo ? `https://github.com/${owner}/${repo.replace(/\.git$/i, "")}/invitations` : null;
}

/** Starts GitHub sign-in so the site can learn the intern's verified GitHub username. */
export function ConnectGithubButton({ className = styles.primary, children = "Connect GitHub" }) {
  const { commands } = useInternship();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function connect() {
    setBusy(true); setError("");
    const result = await commands.githubConnectUrl();
    if (!result.ok) { setError(result.error || "GitHub sign-in is unavailable right now."); setBusy(false); return; }
    window.location.assign(result.data.url);
  }
  return <>
    <button type="button" className={className} disabled={busy} onClick={connect}><Github size={14} aria-hidden="true" /> {busy ? "Opening GitHub…" : children}</button>
    {error && <span role="alert" className={styles.error}>{error}</span>}
  </>;
}

/** Read-only list for interns. Repository links show the intern's own access state. */
export function InternProjectLinks({ links = [], githubProfile, githubAccount, githubEnabled = false }) {
  if (!links.length) return null;
  const repositories = links.filter(link => link.kind === "repository" && link.myAccess !== "granted");
  const automatic = githubEnabled && repositories.some(link => link.automatic);
  const invited = repositories.filter(link => link.myAccess === "invited" && invitationUrl(link.url));
  let hint = null;
  if (automatic && !githubAccount) hint = <><span>Connect your GitHub account and you’ll get an invite to the repository automatically.</span> <ConnectGithubButton /></>;
  else if (invited.length) hint = <span>Your invite is ready. <a href={invitationUrl(invited[0].url)} target="_blank" rel="noopener noreferrer">Accept it on GitHub</a>{githubAccount ? ` while signed in as @${githubAccount.login}` : ""}. Access updates here within a few minutes.</span>;
  else if (automatic) hint = <span>Your GitHub invite is on its way{githubAccount ? ` to @${githubAccount.login}` : ""}. It usually takes a few minutes.</span>;
  else if (repositories.length) hint = githubProfile ? "Your mentor will invite your GitHub account to the repository. Check your GitHub email for the invitation." : <>Add your GitHub profile so your mentor can invite you to the repository. <Link href="/intern/portal/profile">Update profile</Link></>;
  return <section className={styles.section} aria-labelledby="project-resources">
    <div className={styles.header}><h2 id="project-resources">Resources</h2><span>{links.length} {links.length === 1 ? "link" : "links"}</span></div>
    {hint && <div className={styles.hint}>{hint}</div>}
    <ul className={styles.list}>
      {links.map(link => <LinkRow key={link.id} link={link} access={link.kind === "repository" ? <AccessBadge status={link.myAccess} /> : null} />)}
    </ul>
  </section>;
}

/** Compact link chips for a task card. */
export function TaskLinks({ links = [] }) {
  const visible = links.filter(link => safeLink(link.url));
  if (!visible.length) return null;
  return <ul className={styles.chips} aria-label="Task links">
    {visible.map(link => { const Icon = kindOf(link.kind).icon; return <li key={link.id || link.url}>
      <a href={safeLink(link.url)} target="_blank" rel="noopener noreferrer"><Icon size={13} aria-hidden="true" />{link.label}<span className={styles.srOnly}> (opens in a new tab)</span></a>
    </li>; })}
  </ul>;
}

/** "Who can use this link": the whole team, chosen interns, or staff only. */
function AudienceField({ value, onChange, disabled, idPrefix, team }) {
  const mode = value.visibleToInterns === false ? "staff" : Array.isArray(value.members) ? "selected" : "all";
  const chosen = Array.isArray(value.members) ? value.members : [];
  function choose(next) {
    if (next === "staff") onChange({ ...value, visibleToInterns: false, members: undefined });
    else if (next === "all") onChange({ ...value, visibleToInterns: true, members: undefined });
    else onChange({ ...value, visibleToInterns: true, members: chosen });
  }
  const repository = value.kind === "repository";
  const options = [
    ["all", "Everyone on the team", repository ? "Every intern on this project gets access." : "Every intern on this project can see it."],
    ["selected", "Only selected interns", repository ? "Only the interns you tick get access to the repository." : "Only the interns you tick can see it."],
    ["staff", "Staff only", "Hidden from interns, such as admin consoles."],
  ];
  return <fieldset className={`${styles.audience} ${styles.wide}`} disabled={disabled}>
    <legend>Who can use this link</legend>
    <div className={styles.audienceOptions}>
      {options.map(([id, label, hint]) => <label key={id} className={styles.audienceOption} data-checked={mode === id}>
        <input type="radio" name={`${idPrefix}-audience`} value={id} checked={mode === id} onChange={() => choose(id)} />
        <span><strong>{label}</strong><small>{hint}</small></span>
      </label>)}
    </div>
    {mode === "selected" && (team.length ? <div className={styles.picker}>
      <div className={styles.pickerHeader}>
        <span>{chosen.length} of {team.length} selected</span>
        <button type="button" className={styles.ghost} onClick={() => onChange({ ...value, members: chosen.length === team.length ? [] : team.map(member => member.id) })}>{chosen.length === team.length ? "Clear all" : "Select all"}</button>
      </div>
      <ul>
        {team.map(member => <li key={member.id}>
          <label>
            <input type="checkbox" checked={chosen.includes(member.id)} onChange={event => onChange({ ...value, members: event.target.checked ? [...chosen, member.id] : chosen.filter(id => id !== member.id) })} />
            <span className={styles.pickerName}>{member.name}</span>
            {repository && <span className={styles.optional}>{member.githubAccount?.login ? `@${member.githubAccount.login}` : "GitHub not connected"}</span>}
          </label>
        </li>)}
      </ul>
    </div> : <p className={styles.optional}>Add interns to the project team first.</p>)}
  </fieldset>;
}

function LinkFields({ value, onChange, disabled, idPrefix, team }) {
  const set = (name, next) => onChange({ ...value, [name]: next });
  return <div className={styles.fields}>
    <label className={styles.field}>Type
      <select value={value.kind} disabled={disabled} onChange={event => set("kind", event.target.value)}>
        {LINK_KINDS.map(kind => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
      </select>
    </label>
    <label className={styles.field}>Name
      <input value={value.label} maxLength={120} disabled={disabled} placeholder="Backend repository" onChange={event => set("label", event.target.value)} />
    </label>
    <label className={`${styles.field} ${styles.wide}`}>URL
      <input type="url" inputMode="url" value={value.url} maxLength={2000} disabled={disabled} placeholder="https://github.com/your-org/project" onChange={event => set("url", event.target.value)} />
    </label>
    <label className={`${styles.field} ${styles.wide}`}><span>Note <span className={styles.optional}>(optional)</span></span>
      <input value={value.note || ""} maxLength={500} disabled={disabled} placeholder="Use the dev branch. Ask your mentor for environment access." onChange={event => set("note", event.target.value)} />
    </label>
    {team ? <AudienceField value={value} onChange={onChange} disabled={disabled} idPrefix={idPrefix} team={team} /> : <label className={`${styles.toggle} ${styles.wide}`} htmlFor={`${idPrefix}-visible`}>
      <input id={`${idPrefix}-visible`} type="checkbox" checked={value.visibleToInterns !== false} disabled={disabled} onChange={event => set("visibleToInterns", event.target.checked)} />
      <span><strong>Visible to interns</strong> Turn off for staff-only links, such as admin consoles.</span>
    </label>}
    <p className={`${styles.warning} ${styles.wide}`}>Never paste passwords, tokens or keys. Share credentials through your password manager.</p>
  </div>;
}

function LinkForm({ initial, onCancel, onSave, busy, idPrefix, team }) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    event.stopPropagation();
    const problem = linkProblem(draft);
    if (problem) { setError(problem); return; }
    setError("");
    const message = await onSave({ ...draft, label: draft.label.trim(), url: draft.url.trim(), note: (draft.note || "").trim() });
    if (message) setError(message);
  }
  return <form className={styles.form} onSubmit={submit} noValidate>
    <LinkFields value={draft} onChange={setDraft} disabled={busy} idPrefix={idPrefix} team={team} />
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.actions}>
      <button type="button" className={styles.ghost} disabled={busy} onClick={onCancel}>Cancel</button>
      <button type="submit" className={styles.primary} disabled={busy}>{busy ? "Saving…" : initial.id ? "Save link" : "Add link"}</button>
    </div>
  </form>;
}

const sameRepo = (a, b) => {
  const left = invitationUrl(a), right = invitationUrl(b);
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
};
const timeAgo = value => {
  const days = Math.floor((Date.now() - Date.parse(value)) / 86_400_000);
  if (!Number.isFinite(days)) return "";
  return days < 1 ? "updated today" : days < 30 ? `updated ${days}d ago` : `updated ${new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
};

/** Searchable list of the company's GitHub repositories. Choosing one pre-fills the link form. */
export function RepositoryPicker({ existing, onChoose, onCancel, fetchRepositories }) {
  const { commands } = useInternship();
  const fetcher = fetchRepositories || commands.githubRepositories;
  const [state, setState] = useState({ loading: true, error: "", items: [] });
  const [search, setSearch] = useState("");
  const load = useCallback(async refresh => {
    setState(current => ({ ...current, loading: true, error: "" }));
    const result = await fetcher(refresh);
    setState(result.ok ? { loading: false, error: "", items: result.data.repositories || [] } : { loading: false, error: result.error || "GitHub repositories couldn't be loaded.", items: [] });
  }, [fetcher]);
  useEffect(() => { void load(false); }, [load]);
  const term = search.trim().toLowerCase();
  const items = state.items.filter(repo => !repo.archived && (!term || `${repo.name} ${repo.description}`.toLowerCase().includes(term)));
  return <div className={styles.repoPicker}>
    <div className={styles.repoPickerHeader}>
      <strong>Choose a repository</strong>
      <button type="button" className={styles.ghost} disabled={state.loading} onClick={() => load(true)}><RefreshCw size={12} aria-hidden="true" /> Refresh</button>
    </div>
    <label className={styles.field}><span className={styles.srOnly}>Search repositories</span>
      <input type="search" value={search} autoFocus placeholder="Search your GitHub repositories…" onChange={event => setSearch(event.target.value)} />
    </label>
    {state.error && <p role="alert" className={styles.error}>{state.error}</p>}
    {state.loading ? <p role="status" className={styles.optional}>Loading repositories from GitHub…</p>
      : !state.error && (items.length ? <ul className={styles.repoList}>
        {items.map(repo => {
          const added = existing.some(link => sameRepo(link.url, repo.url));
          return <li key={repo.fullName}>
            <button type="button" disabled={added} onClick={() => onChoose(repo)}>
              <span className={styles.repoTitle}><Github size={14} aria-hidden="true" /> <strong>{repo.name}</strong><span className={styles.badge} data-tone="muted">{repo.private ? "Private" : "Public"}</span>{added && <span className={styles.badge} data-tone="green"><Check size={11} aria-hidden="true" /> Already added</span>}</span>
              {repo.description && <span className={styles.repoDescription}>{repo.description}</span>}
              {repo.updatedAt && <span className={styles.optional}>{timeAgo(repo.updatedAt)}</span>}
            </button>
          </li>;
        })}
      </ul> : <p className={styles.optional}>{term ? "No repositories match this search." : "No repositories found in your GitHub account."}</p>)}
    <div className={styles.actions}>
      <button type="button" className={styles.ghost} onClick={onCancel}>Cancel</button>
      <button type="button" className={styles.secondary} onClick={() => onChoose(null)}>Paste a link instead</button>
    </div>
  </div>;
}

/**
 * Staff view of a project's links. Managers add, edit and delete links and record who has
 * repository access; other staff with project access read them.
 */
export function StaffProjectLinks({ project, members = [], canEdit = false, onNotify, githubIntegration }) {
  const { commands, data } = useInternship();
  const github = githubIntegration || data?.githubIntegration || {};
  const [links, setLinks] = useState(project.links || []);
  const [editing, setEditing] = useState(null);
  const [draftLink, setDraftLink] = useState(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { setLinks(project.links || []); }, [project.links]);

  async function save(link) {
    setBusy("save");
    try {
      const result = await commands.saveProjectLink(project.id, link);
      if (!result.ok) return result.error || "The link could not be saved.";
      const saved = result.data.link;
      setLinks(current => current.some(item => item.id === saved.id) ? current.map(item => item.id === saved.id ? saved : item) : [...current, saved]);
      setEditing(null);
      onNotify?.(link.id ? "Link updated." : "Link added.");
      return "";
    } finally { setBusy(""); }
  }
  async function remove(link) {
    setBusy(link.id); setError("");
    try {
      const result = await commands.deleteProjectLink(project.id, link.id);
      if (!result.ok) { setError(result.error || "The link could not be deleted."); return; }
      setLinks(current => current.filter(item => item.id !== link.id));
      setConfirmDelete(null);
      onNotify?.("Link deleted.");
    } finally { setBusy(""); }
  }
  async function resend(member) {
    const key = `resend:${member.id}`;
    setBusy(key); setError("");
    try {
      const result = await commands.githubResend(project.id, member.id);
      if (!result.ok) { setError(result.error || "The invite could not be resent."); return; }
      onNotify?.(`A new invite will be sent to ${member.name} within a few minutes.`);
    } finally { setBusy(""); }
  }
  async function setAccess(link, applicationId, status) {
    const key = `${link.id}:${applicationId}`;
    setBusy(key); setError("");
    try {
      const result = await commands.setRepositoryAccess(project.id, link.id, applicationId, status);
      if (!result.ok) { setError(result.error || "Access could not be updated."); return; }
      setLinks(current => current.map(item => item.id === link.id ? { ...item, access: { ...(item.access || {}), [applicationId]: { status } } } : item));
    } finally { setBusy(""); }
  }

  if (!canEdit && !links.length) return null;
  return <section className={styles.section} aria-labelledby={`resources-${project.id}`}>
    <div className={styles.header}>
      <h3 id={`resources-${project.id}`}>Resources</h3>
      {canEdit && editing === null && links.length < 20 && <div className={styles.headerButtons}>
        {github.enabled && <button type="button" className={styles.primary} onClick={() => { setEditing("pick"); setConfirmDelete(null); }}><Github size={14} aria-hidden="true" /> Add repository</button>}
        <button type="button" className={styles.secondary} onClick={() => { setDraftLink(github.enabled ? { ...EMPTY, kind: "docs" } : EMPTY); setEditing("new"); setConfirmDelete(null); }}><Plus size={14} aria-hidden="true" /> Add link</button>
      </div>}
    </div>
    {!links.length && editing === null && <p className={styles.empty}>Share the repository, docs, designs and environments interns need for this project.</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {editing === "pick" && <RepositoryPicker existing={links} onCancel={() => setEditing(null)} onChoose={repo => {
      setDraftLink(repo ? { ...EMPTY, kind: "repository", label: repo.name, url: repo.url, note: repo.description || "" } : EMPTY);
      setEditing("new");
    }} />}
    {editing === "new" && <LinkForm key={draftLink.url || "blank"} idPrefix={`${project.id}-new`} initial={draftLink} team={members} busy={busy === "save"} onCancel={() => setEditing(null)} onSave={save} />}
    {links.length > 0 && <ul className={styles.list}>
      {links.map(link => editing === link.id
        ? <li key={link.id} className={styles.row}><LinkForm idPrefix={link.id} initial={{ ...EMPTY, ...link, members: Array.isArray(link.members) ? link.members.filter(id => members.some(member => member.id === id)) : undefined }} team={members} busy={busy === "save"} onCancel={() => setEditing(null)} onSave={value => save({ ...value, id: link.id })} /></li>
        : <LinkRow key={link.id} link={link}>
          {link.kind === "repository" && <div className={styles.access}>
            <strong>Repository access</strong>
            {github.enabled && invitationUrl(link.url) && link.github?.installed === false && <p className={styles.warningLine}>
              <AlertTriangle size={13} aria-hidden="true" /><span>The Olentra GitHub app isn’t installed on this repository, so invites aren’t automatic.{github.installUrl && canEdit ? <> <a href={github.installUrl} target="_blank" rel="noopener noreferrer">Install the app</a></> : null}</span>
            </p>}
            {github.enabled && link.github?.installed && <p className={styles.optional}>Invites are sent automatically once an intern connects GitHub. Access is removed when they leave the project.</p>}
            {link.visibleToInterns === false ? <p className={styles.optional}>Staff only: interns don’t see this repository and get no access.</p> : linkAudience(link, members).length ? <ul>
              {linkAudience(link, members).map(member => {
                const entry = link.access?.[member.id] || {};
                const status = ["granted", "invited"].includes(entry.status) ? entry.status : "pending";
                const automatic = github.enabled && link.github?.installed;
                const profileUrl = safeLink(member.github);
                return <li key={member.id}>
                  <span className={styles.member}>{member.name}{automatic
                    ? (member.githubAccount?.login || entry.login ? <span className={styles.optional}>@{member.githubAccount?.login || entry.login}</span> : <span className={styles.optional}>GitHub not connected</span>)
                    : profileUrl ? <a href={profileUrl} target="_blank" rel="noopener noreferrer"><Github size={12} aria-hidden="true" /> GitHub<span className={styles.srOnly}> profile of {member.name} (opens in a new tab)</span></a> : <span className={styles.optional}>No GitHub profile</span>}</span>
                  {automatic
                    ? <span className={styles.member}>
                      {entry.error ? <span className={styles.badge} data-tone="red" title={entry.error}><AlertTriangle size={11} aria-hidden="true" /> Invite failed</span> : <AccessBadge status={status} />}
                      {canEdit && (status === "invited" || entry.error) && <button type="button" className={styles.ghost} disabled={busy === `resend:${member.id}`} onClick={() => resend(member)}><RefreshCw size={12} aria-hidden="true" /> Resend<span className={styles.srOnly}> invite to {member.name}</span></button>}
                    </span>
                    : canEdit
                      ? <label className={styles.switch}><input type="checkbox" checked={status === "granted"} disabled={busy === `${link.id}:${member.id}`} onChange={event => setAccess(link, member.id, event.target.checked ? "granted" : "pending")} /> {status === "granted" ? "Granted" : "Pending"}<span className={styles.srOnly}> for {member.name}</span></label>
                      : <AccessBadge status={status} />}
                </li>;
              })}
            </ul> : <p className={styles.optional}>Assign interns to the project to track their access.</p>}
          </div>}
          {canEdit && (confirmDelete === link.id
            ? <div className={styles.confirm} role="alert">
              <span>Delete “{link.label}”? Interns will lose this link.</span>
              <button type="button" className={styles.ghost} disabled={busy === link.id} onClick={() => setConfirmDelete(null)}>Keep</button>
              <button type="button" className={styles.danger} disabled={busy === link.id} onClick={() => remove(link)}>{busy === link.id ? "Deleting…" : "Delete link"}</button>
            </div>
            : <div className={styles.rowActions}>
              <button type="button" className={styles.ghost} onClick={() => { setEditing(link.id); setConfirmDelete(null); }}><Pencil size={13} aria-hidden="true" /> Edit<span className={styles.srOnly}> {link.label}</span></button>
              <button type="button" className={styles.ghost} onClick={() => setConfirmDelete(link.id)}><Trash2 size={13} aria-hidden="true" /> Delete<span className={styles.srOnly}> {link.label}</span></button>
            </div>)}
        </LinkRow>)}
    </ul>}
  </section>;
}

/** Editable list of task links for the task form. Saved with the task. */
export function TaskLinksField({ value = [], onChange, disabled, idPrefix = "task-link" }) {
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  function add() {
    const problem = linkProblem(draft);
    if (problem) { setError(problem); return; }
    onChange([...value, { ...draft, label: draft.label.trim(), url: draft.url.trim(), note: (draft.note || "").trim() }]);
    setDraft(null); setError("");
  }
  return <fieldset className={styles.taskField} disabled={disabled}>
    <legend>Task links <span className={styles.optional}>(optional, up to 10)</span></legend>
    {value.length > 0 && <ul className={styles.compact}>
      {value.map((link, index) => <li key={link.id || `${link.url}-${index}`}>
        <span>{kindOf(link.kind).label}: {link.label}{link.visibleToInterns === false && " (staff only)"}</span>
        <button type="button" className={styles.ghost} onClick={() => onChange(value.filter((_, i) => i !== index))}>Remove<span className={styles.srOnly}> {link.label}</span></button>
      </li>)}
    </ul>}
    {draft ? <div className={styles.form} onKeyDown={event => {
      // Enter adds the link instead of submitting the surrounding task form.
      if (event.key === "Enter" && event.target.tagName === "INPUT" && event.target.type !== "checkbox") { event.preventDefault(); add(); }
    }}>
      <LinkFields value={draft} onChange={setDraft} idPrefix={idPrefix} />
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <button type="button" className={styles.ghost} onClick={() => { setDraft(null); setError(""); }}>Cancel</button>
        <button type="button" className={styles.primary} onClick={add}>Add to task</button>
      </div>
    </div> : value.length < 10 && <button type="button" className={styles.secondary} onClick={() => setDraft({ ...EMPTY, kind: "docs" })}><Plus size={14} aria-hidden="true" /> Add link</button>}
  </fieldset>;
}
