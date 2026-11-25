import { transferDirectUpload } from "./direct-upload.mjs";
import { InternClient, internEndpoint, internToken, refreshInternSession } from "./intern-client.mjs";
const MEBIBYTE = 1024 * 1024;
function fileName(value) { return String(value || "").split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g, "").trim(); }
async function result(response) {
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) {
    const error = new Error(body?.error?.message || "The internship service is unavailable. Please try again.");
    error.status = response.status;
    throw error;
  }
  return body.data;
}
export async function authorizeResumeUpload(challenge) {
  return result(await fetch(`${internEndpoint()}/intern/files/resume-grant`, {
    method: "POST",
    credentials: "omit",
    headers: { "X-Resume-Challenge": challenge },
  }));
}
/** `testApplication`: an admin uploading a resume for a test application from the dashboard. */
export async function saveAttachment(file, kind="resume", { publicUpload = false, resumeGrant, testApplication = false } = {}) {
  if (!file || typeof file.name !== "string" || typeof file.size !== "number") throw new Error("Choose a file to upload.");
  const name=fileName(file.name), resume=kind==="resume", maximum=(resume?5:10)*MEBIBYTE;
  if (!name || !file.size || file.size>maximum || (resume && !/\.(pdf|doc|docx)$/i.test(name))) throw new Error(resume ? "Choose a PDF, DOC, or DOCX resume up to 5 MB." : "Choose a non-empty work attachment up to 10 MB.");
  // HTTP headers may not contain non-Latin characters; keep a safe display name.
  const headerName=name.replace(/[^\x20-\x7e]/g,"_");
  const token = publicUpload ? null : internToken();
  const config = await result(await fetch(`${internEndpoint()}/intern/files/config`, { credentials: "omit" }));
  if (config.directUploads) {
    const headers = {
      "X-File-Name": headerName, "X-File-Kind": resume ? "resume" : "work", "X-File-Size": String(file.size),
      ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(resumeGrant ? { "X-Resume-Grant": resumeGrant } : {}),
      ...(testApplication ? { "X-Test-Application": "1" } : {}),
    };
    const intent = await result(await fetch(`${internEndpoint()}/intern/files/uploads`, { method: "POST", credentials: "omit", headers }));
    return transferDirectUpload({ file, intent, endpoint: internEndpoint(), headers: token ? { Authorization: `Bearer ${token}` } : {}, readResult: result, client: new InternClient({ publicOnly: true }) });
  }
  return result(await fetch(`${internEndpoint()}/intern/files`, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-File-Name": headerName,
      "X-File-Kind": resume ? "resume" : "work",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(resumeGrant ? { "X-Resume-Grant": resumeGrant } : {}),
      ...(testApplication ? { "X-Test-Application": "1" } : {}),
    },
    credentials: publicUpload ? "omit" : "same-origin",
    body: file,
  }));
}
function triggerDownload(blob,name){ const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=fileName(name)||"olentra-attachment";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000); }
/** The download name from Content-Disposition, preferring the RFC 5987 UTF-8 form. */
export function attachmentName(disposition) {
  const value = String(disposition || "");
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(value)?.[1];
  if (encoded) { try { return fileName(decodeURIComponent(encoded)); } catch {} }
  return fileName(/filename="([^"]+)"/i.exec(value)?.[1]) || "olentra-attachment";
}
/**
 * Fetches an attachment with the in-memory session token (never a URL token),
 * refreshing the session once if it expired while the page sat open.
 */
export async function fetchAttachment(id, { signal } = {}) {
  if (!id) throw new Error("This record does not have an attachment.");
  const request = () => fetch(`${internEndpoint()}/intern/files/${encodeURIComponent(id)}`, { signal, credentials: "omit", cache: "no-store", headers: internToken() ? { Authorization: `Bearer ${internToken()}` } : {} });
  let response = await request();
  if (response.status === 401 && internToken()) {
    try { await refreshInternSession(); response = await request(); } catch {}
  }
  if (!response.ok) await result(response);
  const blob = await response.blob();
  return { id, name: attachmentName(response.headers.get("Content-Disposition")), type: blob.type, size: blob.size, blob };
}
export function saveBlob(blob, name) { triggerDownload(blob, name); }
export async function downloadAttachment(id){const file=await fetchAttachment(id);triggerDownload(file.blob,file.name);return{id,name:file.name,type:file.type,size:file.size};}
export async function makeSampleResume(){throw new Error("Please upload your own resume.")}
export async function downloadSampleResume(){throw new Error("No resume is available for this application.")}
// Legacy browser-local attachments are intentionally left intact.
export async function clearAttachments() {}
