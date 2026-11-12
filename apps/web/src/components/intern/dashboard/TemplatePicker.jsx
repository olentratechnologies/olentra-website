"use client";

import { useInternQuery } from "../useInternQuery";
import { fillTemplate, templateValues } from "@/lib/intern/message-templates.mjs";
import common from "./pages.module.css";

/** "Use a template…" for message composers; fills placeholders for this person. */
export default function TemplatePicker({ application, interview, onPick }) {
  const query = useInternQuery("template.list", {});
  const templates = query.data || [];
  if (!templates.length) return null;
  const values = templateValues(application, interview);
  return (
    <label className={common.field}>
      Template
      <select
        value=""
        onChange={(event) => {
          const template = templates.find((item) => item.id === event.target.value);
          if (template) onPick(fillTemplate(template.subject, values), fillTemplate(template.body, values));
        }}
      >
        <option value="">Use a template…</option>
        {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
      </select>
    </label>
  );
}
