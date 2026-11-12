"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, UserPlus, Users } from "lucide-react";
import { Button, PageHeader, Panel, Tabs } from "./DashboardUI";
import { useDashboard } from "./DashboardProvider";
import { useInternQuery } from "../useInternQuery";
import QueryStatus from "./QueryStatus";
import { AUDIT_FILTERS, describeAudit } from "@/lib/intern/audit-labels.mjs";
import ui from "./staff.module.css";
import page from "./pages.module.css";

const blankStaff = { name: "", email: "", password: "", staffRole: "viewer" };
const dependencies = { "applications.review":["applications.read"], "resumes.read":["applications.read"], "projects.read":["projects.summary","interns.read"], "projects.manage":["projects.read","interns.read"], "tasks.read":["projects.read","interns.read"], "tasks.manage":["tasks.read"], "submissions.read":["tasks.read"], "submissions.feedback":["submissions.read"], "messages.applicants":["applications.read"], "messages.interns":["interns.read"] };
function changePermission(current, permission, checked) {
  const selected = new Set(current);
  const include = id => { if (selected.has(id)) return; selected.add(id); for (const dependency of dependencies[id] || []) include(dependency); };
  if (checked) include(permission);
  else { selected.delete(permission); let changed = true; while (changed) { changed = false; for (const id of selected) if ((dependencies[id] || []).some(dependency => !selected.has(dependency))) { selected.delete(id); changed = true; } } }
  return [...selected];
}
export default function StaffRolesPage() {
  const { account, commands, notify } = useDashboard();
  const [tab, setTab] = useState("staff");
  const [pageNumber, setPageNumber] = useState(1), [form, setForm] = useState(blankStaff), [editingRole, setEditingRole] = useState(null), [roleForm, setRoleForm] = useState({ name: "", permissions: [] });
  const [resetId, setResetId] = useState(null), [resetPassword, setResetPassword] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const isAdmin = account?.staffRole === "admin";
  const staffQuery = useInternQuery("staff.list", { page: pageNumber, pageSize: 20 }, { enabled: isAdmin && tab === "staff" });
  const rolesQuery = useInternQuery("role.list", {}, { enabled: isAdmin && tab !== "audit" });
  const [auditPage, setAuditPage] = useState(1), [auditArea, setAuditArea] = useState("all");
  const auditQuery = useInternQuery("audit.list", { page: auditPage, pageSize: 20, ...(auditArea === "all" ? {} : { area: auditArea }) }, { enabled: isAdmin && tab === "audit" });
  const auditPages = Math.max(1, Math.ceil((auditQuery.data?.total || 0) / 20));
  const staff = staffQuery.data?.items || [];
  const total = staffQuery.data?.total;
  const roles = rolesQuery.data?.roles || [];
  const catalog = rolesQuery.data?.permissions || [];
  const audit = auditQuery.data?.items || [];
  useEffect(() => {
    if (!staffQuery.data || pageNumber <= 1) return;
    const lastPage = Math.max(1, Math.ceil(staffQuery.data.total / 20));
    if (pageNumber > lastPage) setPageNumber(lastPage);
  }, [staffQuery.data, pageNumber]);
  if (account?.staffRole !== "admin") return <div className={page.page}><PageHeader title="Staff & Roles"/><Panel><p role="alert">Only an internship admin can manage staff and roles.</p></Panel></div>;
  const roleLabel = id => roles.find(role => role.id === id)?.name || id || "Unassigned";
  async function perform(action, success) { if (busy) return false; setBusy(true); setError(""); try { const result = await action(); if (!result.ok) { setError(result.error); return false; } notify(success); await Promise.all([rolesQuery.refresh(), ...(tab === "staff" ? [staffQuery.refresh()] : [])]); return true; } finally { setBusy(false); } }
  async function createStaff(event) { event.preventDefault(); if (await perform(() => commands.createStaff(form), "Staff account created.")) setForm(blankStaff); }
  async function saveRole(event) {
    event.preventDefault();
    const input = { name: roleForm.name.trim(), permissions: roleForm.permissions };
    if (await perform(() => editingRole ? commands.updateRole({ id: editingRole.id, ...input, expectedVersion: editingRole.version }) : commands.createRole(input), editingRole ? "Role updated." : "Role created.")) { setEditingRole(null); setRoleForm({ name: "", permissions: [] }); }
  }
  const selectedRole = roles.find(role => role.id === form.staffRole);
  return <div className={page.page}><PageHeader title="Staff & Roles" description="Manage internship staff and their access"/>
    <Tabs label="Staff management" value={tab} onChange={setTab} items={[{id:"staff",label:"Staff accounts"},{id:"roles",label:"Roles & permissions"},{id:"audit",label:"Activity"}]}/>
    {error && <p role="alert" className={ui.error}>{error}</p>}
    {tab !== "audit" && <QueryStatus query={rolesQuery} label="staff roles" compact/>}
    {tab === "staff" && <div className={ui.stack}>
      <Panel><h2 className={ui.header}><UserPlus size={20}/> Create staff account</h2><p className={ui.description}>Choose a role and an initial password. Share the password securely with the staff member.</p>
        <form onSubmit={createStaff}><div className={ui.grid}>
          <label className={ui.field}>Full name<input required maxLength={120} value={form.name} onChange={event=>setForm({...form,name:event.target.value})}/></label>
          <label className={ui.field}>Work email<input type="email" required maxLength={254} value={form.email} onChange={event=>setForm({...form,email:event.target.value})}/></label>
          <label className={ui.field}>Initial password<input type="password" autoComplete="new-password" required minLength={12} maxLength={256} value={form.password} onChange={event=>setForm({...form,password:event.target.value})}/></label>
          <label className={ui.field}>Staff role<select disabled={!rolesQuery.data} value={form.staffRole} onChange={event=>setForm({...form,staffRole:event.target.value})}>{roles.map(role=><option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
        </div><p className={ui.summary}><strong>{selectedRole?.name || "Selected role"}:</strong> {!rolesQuery.data ? "Loading role permissions…" : selectedRole?.id === "admin" ? "Full internship access." : (selectedRole?.permissions || []).map(id=>catalog.find(permission=>permission.id===id)?.label || id).join(", ") || "No permissions."}</p><div className={ui.actions}><Button type="submit" disabled={busy || !roles.length}>Create staff account</Button></div></form>
      </Panel>
      <Panel aria-busy={staffQuery.loading || staffQuery.refreshing}><h2 className={ui.header}><Users size={20}/> Staff accounts</h2><p className={ui.description}>Change a role or disable an account. Changes take effect immediately.</p>
        <QueryStatus query={staffQuery} label="staff accounts"/>
        <div className={ui.tableWrap}><table className={ui.table}><thead><tr><th>Staff member</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>{staff.map(person=><tr key={person.id}><td><strong>{person.name}</strong><br/>{person.email}</td><td><select aria-label={`Role for ${person.name}`} disabled={busy || !rolesQuery.data} value={person.staffRole || ""} onChange={event=>perform(()=>commands.updateStaff({id:person.id,staffRole:event.target.value}),"Staff role updated.")}><option value="" disabled>Unassigned</option>{roles.map(role=><option key={role.id} value={role.id}>{role.name}</option>)}</select></td><td><span className={`${ui.badge} ${person.disabled ? ui.disabled : ""}`}>{person.disabled ? "Disabled" : "Active"}</span></td><td><div className={ui.tableActions}><Button variant="ghost" disabled={busy} onClick={()=>{setResetId(person.id);setResetPassword("")}}>Reset password</Button><Button variant={person.disabled ? "secondary" : "danger"} disabled={busy} onClick={()=>perform(()=>commands.updateStaff({id:person.id,disabled:!person.disabled}),person.disabled ? "Staff account reactivated." : "Staff account disabled.")}>{person.disabled ? "Reactivate" : "Disable"}</Button></div></td></tr>)}</tbody></table></div>
        {staffQuery.data && !staff.length && <p className={ui.description}>No staff accounts found.</p>}<div className={ui.pagination}><Button variant="ghost" disabled={!staffQuery.data || pageNumber<=1} onClick={()=>setPageNumber(pageNumber-1)}>Previous</Button><span>Page {pageNumber} · {total ?? "—"} staff</span><Button variant="ghost" disabled={!staffQuery.data || pageNumber*20>=total} onClick={()=>setPageNumber(pageNumber+1)}>Next</Button></div>
        {resetId && <form onSubmit={async event=>{event.preventDefault();if(await perform(()=>commands.resetStaffPassword({id:resetId,password:resetPassword}),"Staff password reset.")){setResetId(null);setResetPassword("")}}}><p className={ui.description}>Set a new password for {staff.find(person=>person.id===resetId)?.name}. Existing sessions will be signed out.</p><label className={ui.field}>New password<input type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={resetPassword} onChange={event=>setResetPassword(event.target.value)}/></label><div className={ui.actions}><Button type="submit" disabled={busy}>Reset password</Button><Button variant="ghost" onClick={()=>{setResetId(null);setResetPassword("")}}>Cancel</Button></div></form>}
      </Panel>
    </div>}
    {tab === "roles" && <div className={ui.stack}><Panel><h2 className={ui.header}><ShieldCheck size={20}/> Roles & permissions</h2><p className={ui.description}>Select a role to review or edit its permissions, or create a custom role. Admin-only decisions and staff management cannot be granted to other roles.</p><div className={ui.roleList}>{roles.map(role=><button type="button" className={`${ui.roleButton} ${editingRole?.id===role.id ? ui.selected : ""}`} key={role.id} onClick={()=>{if(role.id==="admin"){setEditingRole(role);setRoleForm({name:role.name,permissions:role.permissions || []})}else{setEditingRole(role);setRoleForm({name:role.name,permissions:[...(role.permissions || [])]})}}}>{role.name}</button>)}<button type="button" className={ui.roleButton} disabled={!rolesQuery.data} onClick={()=>{setEditingRole(null);setRoleForm({name:"",permissions:[]})}}>+ New custom role</button></div>
      {!rolesQuery.data ? null : editingRole?.id === "admin" ? <p className={ui.summary}>Admin has all internship permissions. This role cannot be edited.</p> : <form onSubmit={saveRole}><label className={ui.field}>Role name<input value={roleForm.name} required maxLength={80} onChange={event=>setRoleForm({...roleForm,name:event.target.value})}/></label><p className={ui.description}>Related read permissions are selected automatically where required.</p><div className={ui.permissions}>{catalog.map(permission=><label key={permission.id} className={ui.check}><input type="checkbox" checked={roleForm.permissions.includes(permission.id)} onChange={event=>setRoleForm({...roleForm,permissions:changePermission(roleForm.permissions,permission.id,event.target.checked)})}/><span>{permission.label || permission.id}</span></label>)}</div><Button type="submit" disabled={busy}>{editingRole ? "Save permissions" : "Create role"}</Button></form>}
    </Panel></div>}
    {tab === "audit" && <Panel>
      <h2 className={ui.header}>Activity</h2>
      <p className={ui.description}>Application decisions and staff changes, newest first. Passwords are never shown.</p>
      <label className={ui.auditFilter}>
        <span>Show</span>
        <select value={auditArea} onChange={event => { setAuditArea(event.target.value); setAuditPage(1); }}>
          {AUDIT_FILTERS.map(filter => <option key={filter.id} value={filter.id}>{filter.label}</option>)}
        </select>
      </label>
      <QueryStatus query={auditQuery} label="activity"/>
      {auditQuery.data ? audit.length ? <ol className={ui.audit}>{audit.map(entry => <li key={entry.id}>{describeAudit(entry)} · {entry.actorName || entry.actorId || "System"} · {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ""}</li>)}</ol> : <p className={ui.description}>No activity yet.</p> : null}
      {auditPages > 1 && <div className={ui.auditPager}>
        <Button variant="secondary" disabled={auditPage <= 1} onClick={() => setAuditPage(value => value - 1)}>Newer</Button>
        <span>Page {auditPage} of {auditPages}</span>
        <Button variant="secondary" disabled={auditPage >= auditPages} onClick={() => setAuditPage(value => value + 1)}>Older</Button>
      </div>}
    </Panel>}
  </div>;
}
