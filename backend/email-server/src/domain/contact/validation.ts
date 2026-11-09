import type { ContactFields, ResendAttachment } from "./types";

export const MAX_BODY = 6 * 1024 * 1024;
export const MAX_ATTACHMENT = 5 * 1024 * 1024;

const budgets = ["Still Evaluating", "Less than $5K", "$5K - $15K", "$15K - $35K", "More than $35K"];
const BUDGET_SET = new Set(budgets);
const CRLF_RE = /[\r\n]/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+0-9()\-.\s]{7,20}$/;
const EXT_RE = /\.(pdf|doc|docx)$/i;
const SANITIZE_RE = /[\r\n/\\]/g;

export const jsonError = (status: number, error: string) => Response.json({ error }, { status });
export const UNAUTHORIZED = new Response('{"error":"Unauthorized."}', {
  status: 401,
  headers: { "content-type": "application/json" },
});

export function readContactFields(form: FormData): ContactFields {
  const field = (key: string) => typeof form.get(key) === "string" ? String(form.get(key)).trim() : "";
  return {
    name: field("name"),
    email: field("email"),
    phone: field("phone"),
    budget: field("budget"),
    message: field("message"),
  };
}

export function validateContactFields(fields: ContactFields): string | null {
  if (!fields.name || fields.name.length > 100 || CRLF_RE.test(fields.name)) return "Please enter a name of up to 100 characters.";
  if (fields.email.length > 254 || !EMAIL_RE.test(fields.email)) return "Please enter a valid email address.";
  if (!PHONE_RE.test(fields.phone)) return "Please enter a valid contact number.";
  if (!BUDGET_SET.has(fields.budget)) return "Please select a budget range.";
  if (fields.message.length < 20 || fields.message.length > 10000) return "Project details must be between 20 and 10,000 characters.";
  return null;
}

export async function readAttachment(form: FormData): Promise<{ attachment?: ResendAttachment; error?: string }> {
  const value = form.get("attachment");
  if (!(value instanceof File) || !value.size) return {};
  if (value.size > MAX_ATTACHMENT) return { error: "Attachment must be 5 MB or smaller." };
  if (!EXT_RE.test(value.name)) return { error: "Please attach a PDF, DOC or DOCX file." };
  return {
    attachment: {
      filename: value.name.replace(SANITIZE_RE, "_").slice(-200),
      content: Buffer.from(await value.arrayBuffer()).toString("base64"),
    },
  };
}
