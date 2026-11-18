import { internEndpoint, internToken } from "./intern-client.mjs";
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
export async function saveAttachment(file, kind="resume", { publicUpload = false, resumeGrant } = {}) {
  if (!file || typeof file.name !== "string" || typeof file.size !== "number") throw new Error("Choose a file to upload.");
  const name=fileName(file.name), resume=kind==="resume", maximum=(resume?5:10)*MEBIBYTE;
  if (!name || !file.size || file.size>maximum || (resume && !/\.(pdf|doc|docx)$/i.test(name))) throw new Error(resume ? "Choose a PDF, DOC, or DOCX resume up to 5 MB." : "Choose a non-empty work attachment up to 10 MB.");
  // HTTP headers may not contain non-Latin characters; keep a safe display name.
  const headerName=name.replace(/[^\x20-\x7e]/g,"_");
  const token = publicUpload ? null : internToken();
  return result(await fetch(`${internEndpoint()}/intern/files`, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-File-Name": headerName,
      "X-File-Kind": resume ? "resume" : "work",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(resumeGrant ? { "X-Resume-Grant": resumeGrant } : {}),
    },
    credentials: publicUpload ? "omit" : "same-origin",
    body: file,
  }));
}
function triggerDownload(blob,name){ const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=fileName(name)||"olentra-attachment";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000); }
export async function downloadAttachment(id){if(!id)throw new Error("This record does not have an attachment.");const response=await fetch(`${internEndpoint()}/intern/files/${encodeURIComponent(id)}`,{headers:{...(internToken()?{Authorization:`Bearer ${internToken()}`}:{})}});if(!response.ok){await result(response);return}const blob=await response.blob(),name=response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] || "olentra-attachment";triggerDownload(blob,name);return{id,name,type:blob.type,size:blob.size};}
export async function makeSampleResume(){throw new Error("Please upload your own resume.")}
export async function downloadSampleResume(){throw new Error("No resume is available for this application.")}
// Legacy browser-local attachments are intentionally left intact.
export async function clearAttachments() {}
