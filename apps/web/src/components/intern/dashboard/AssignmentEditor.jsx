"use client";

import { useState } from "react";
import { useInternship } from "../InternshipProvider";
import { useDashboard } from "./DashboardProvider";
import { TaskEditor } from "./CompanyWorkflow";
import QueryStatus from "./QueryStatus";
import { useInternQuery, useInternSearch } from "../useInternQuery";
import { Button, Modal, Pagination } from "./DashboardUI";
import layout from "./applicant.module.css";
import styles from "./pages.module.css";

export default function AssignmentEditor({ editor, application, onClose }) {
  const { commands } = useInternship();
  const { createProject, updateProject, deleteProject, notify } = useDashboard();
  const { action, kind, record, project } = editor;
  const isTask = kind === "task";
  const deleting = action === "delete";
  const creating = action === "create";
  const title = deleting ? `Delete ${kind}` : creating ? (isTask ? "Assign task" : "Create project") : `Edit ${kind}`;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(values) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (isTask) {
        let result;
        if (deleting) result = await commands.deleteTask(record.id);
        else if (creating) result = await commands.createTask({ ...values, applicationId: application.id, projectId: project.id });
        else result = await commands.updateTask(record.id, values);
        if (!result.ok) { setError(result.error); return; }
      } else {
        let saved;
        if (deleting) saved = await deleteProject(record.id);
        else if (creating) saved = await createProject({ ...values, program: application.program, team: [application.id] });
        else saved = await updateProject(record.id, values);
        if (!saved) return;
      }
      notify(`${isTask ? "Task" : "Project"} ${deleting ? "deleted" : creating ? "assigned" : "updated"}.`);
      onClose();
    } catch (cause) {
      setError(cause?.message || "The change could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open className={layout.assignmentDialog} onOpenChange={open => { if (!open && !busy) onClose(); }} title={title}
      description={[application.name, project?.name || record?.name || record?.title].filter(Boolean).join(" · ")}>
      {deleting ? <>
        <p>{isTask ? "Delete this task and all its submissions?" : "Delete this project for all team members, including all tasks and submissions?"} This cannot be undone.</p>
        <div className={layout.assignmentActions}>
          <Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={() => save()}>{title}</Button>
        </div>
      </> : isTask ? (
        <TaskEditor task={record || { title: "", description: "", dueOn: project.dueOn || "", required: true }}
          busy={busy} onSave={save} onCancel={() => { if (!busy) onClose(); }} />
      ) : (
        <form className={styles.formGrid} onSubmit={event => {
          event.preventDefault();
          const values = Object.fromEntries(new FormData(event.currentTarget));
          if (values.status === "Completed") values.progress = 100;
          void save(values);
        }}>
          <label className={styles.field}>Project name<input name="name" defaultValue={record?.name} required maxLength={200} /></label>
          <label className={styles.field}>Due date<input name="dueOn" type="date" defaultValue={record?.dueOn} required /></label>
          <label className={`${styles.field} ${styles.fullWidth}`}>Description<textarea name="description" defaultValue={record?.description} required maxLength={5000} /></label>
          {!creating && <>
            <label className={styles.field}>Status<select name="status" defaultValue={record.status}>
              {["Planning", "In progress", "In review", "Completed"].map(status => <option key={status}>{status}</option>)}
            </select></label>
            <label className={styles.field}>Progress (%)<input name="progress" type="number" min="0" max="100" defaultValue={record.progress} required /></label>
          </>}
          <div className={layout.assignmentActions}>
            <Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>{creating ? "Create project" : "Save project"}</Button>
          </div>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
    </Modal>
  );
}

export function AssignExistingProject({ application, onClose }) {
  const { commands, notify } = useInternship();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const term = useInternSearch(search);
  const pageSize = 10;
  const query = useInternQuery("project.list", { availableFor: application.id, search: term, page, pageSize, sortField: "name", sortDirection: "asc" });
  const project = query.data?.items.find(item => item.id === selected);

  async function assign(event) {
    event.preventDefault();
    if (!project || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await commands.assignProject(project.id, application.id);
      if (!result.ok) {
        setError(result.error);
        void query.refresh();
        return;
      }
      notify(`${application.name} assigned to ${project.name}.`);
      onClose();
    } catch (cause) {
      setError(cause?.message || "Project assignment failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open title="Assign existing project" description={`Add ${application.name} to a project team.`}
      className={layout.assignmentDialog} onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <form onSubmit={assign} className={styles.formGrid}>
        <label className={`${styles.field} ${styles.fullWidth}`}>Search projects
          <input type="search" value={search} disabled={busy} onChange={event => { setSearch(event.target.value); setPage(1); setSelected(""); }} />
        </label>
        <QueryStatus query={query} label="available projects" />
        {query.data?.items.length > 0 && (
          <label className={`${styles.field} ${styles.fullWidth}`}>Project
            <select required value={selected} disabled={busy} onChange={event => setSelected(event.target.value)}>
              <option value="">Choose a project</option>
              {query.data.items.map(item => <option key={item.id} value={item.id}>{item.name} · {item.status}</option>)}
            </select>
          </label>
        )}
        {query.data?.total === 0 && <p className={styles.fullWidth}>{search ? "No matching projects." : "No projects available to assign."}</p>}
        {query.data?.total > pageSize && <div className={styles.fullWidth}><Pagination page={page} pageSize={pageSize} total={query.data.total}
          onChange={next => { setPage(next); setSelected(""); }} /></div>}
        {error && <p role="alert" className={styles.fullWidth}>{error}</p>}
        <div className={layout.assignmentActions}>
          <Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!project || busy || term !== search}>{busy ? "Assigning…" : "Assign project"}</Button>
        </div>
      </form>
    </Modal>
  );
}
