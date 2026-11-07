// Browser-only attachment storage for the internship demo. File blobs stay in
// IndexedDB; no object URL or file contents are persisted in localStorage.
const DATABASE_NAME = "olentra-intern-files-v2";
const STORE_NAME = "attachments";
const DATABASE_VERSION = 1;
const MEBIBYTE = 1024 * 1024;
let databasePromise;
let fallbackCounter = 0;

function storageError(error) {
  if (error?.name === "QuotaExceededError")
    return new Error(
      "Your browser does not have enough space to save this file. Free some site storage and try again.",
    );
  return new Error(
    error?.message ||
      "Unable to access saved files in this browser. Allow site storage and try again.",
  );
}

function openDatabase() {
  if (typeof indexedDB === "undefined")
    return Promise.reject(
      new Error(
        "File storage is unavailable in this browser. Open the demo in a browser that allows site storage.",
      ),
    );
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      let blocked = false;
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME))
          database.createObjectStore(STORE_NAME, { keyPath: "id" });
      };
      request.onsuccess = () => {
        if (blocked) {
          request.result.close();
          return;
        }
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          databasePromise = undefined;
        };
        resolve(database);
      };
      request.onerror = () => {
        databasePromise = undefined;
        reject(storageError(request.error));
      };
      request.onblocked = () => {
        blocked = true;
        databasePromise = undefined;
        reject(
          new Error(
            "File storage is busy in another tab. Close other Olentra tabs and try again.",
          ),
        );
      };
    });
  }
  return databasePromise;
}

async function runTransaction(mode, operation) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    let transaction;
    let result;
    try {
      transaction = database.transaction(STORE_NAME, mode);
      const request = operation(transaction.objectStore(STORE_NAME));
      if (request)
        request.onsuccess = () => {
          result = request.result;
        };
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(storageError(transaction.error));
      transaction.onerror = () => reject(storageError(transaction.error));
    } catch (error) {
      reject(storageError(error));
    }
  });
}

function fileName(value) {
  return String(value || "")
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
}

function validateFile(file, kind) {
  if (
    !file ||
    typeof file.name !== "string" ||
    typeof file.size !== "number" ||
    typeof file.arrayBuffer !== "function"
  )
    throw new Error("Choose a file to upload.");
  const name = fileName(file.name);
  if (!name) throw new Error("Choose a file with a valid filename.");
  if (file.size === 0)
    throw new Error("The selected file is empty. Choose a file with content.");
  const maximum = kind === "resume" ? 5 * MEBIBYTE : 10 * MEBIBYTE;
  if (file.size > maximum)
    throw new Error(
      kind === "resume"
        ? "Your resume must be 5 MB or smaller."
        : "Your work attachment must be 10 MB or smaller.",
    );
  if (kind === "resume" && !/\.(pdf|doc|docx)$/i.test(name))
    throw new Error("Choose a PDF, DOC, or DOCX resume.");
  return name;
}

export async function saveAttachment(file, kind = "resume") {
  const name = validateFile(file, kind);
  const id =
    globalThis.crypto?.randomUUID?.() ||
    `attachment-${Date.now()}-${++fallbackCounter}`;
  const metadata = {
    id,
    name,
    type: file.type || "application/octet-stream",
    size: file.size,
  };
  await runTransaction("readwrite", (store) =>
    store.put({
      ...metadata,
      kind,
      createdAt: new Date().toISOString(),
      blob: file,
    }),
  );
  return metadata;
}

function triggerDownload(blob, name) {
  if (
    typeof document === "undefined" ||
    typeof URL?.createObjectURL !== "function"
  )
    throw new Error("Downloads are only available in the browser.");
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName(name) || "olentra-attachment";
  anchor.style.display = "none";
  try {
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    // Give the browser a moment to start reading the blob before releasing it.
    globalThis.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
}

export async function downloadAttachment(id) {
  if (!id) throw new Error("This record does not have a saved attachment.");
  const attachment = await runTransaction("readonly", (store) => store.get(id));
  if (!attachment?.blob)
    throw new Error(
      "This attachment is not available in this browser. It may have been removed when site data was cleared.",
    );
  triggerDownload(attachment.blob, attachment.name);
  return {
    id: attachment.id,
    name: attachment.name,
    type: attachment.type,
    size: attachment.size,
  };
}

export async function makeSampleResume() {
  const response = await fetch("/intern/demo-resume.pdf", {
    credentials: "same-origin",
  });
  if (!response.ok)
    throw new Error(
      "The sample resume is unavailable. Choose your own PDF, DOC, or DOCX file.",
    );
  const blob = await response.blob();
  if (!(await blob.slice(0, 5).text()).startsWith("%PDF-"))
    throw new Error(
      "The sample resume could not be loaded. Please choose another file.",
    );
  return new File([blob], "Olentra-demo-resume.pdf", {
    type: "application/pdf",
    lastModified: Date.UTC(2026, 10, 2),
  });
}

export async function downloadSampleResume(person = {}) {
  const name = String(person.name || "Olentra Applicant");
  const skills = Array.isArray(person.skills)
    ? person.skills.join(", ")
    : String(
        person.skills ||
          "Learning, collaboration, and practical problem solving",
      );
  const summary = Array.isArray(person.resumeSummary)
    ? person.resumeSummary.join("\n")
    : person.resumeSummary;
  const content = [
    "OLENTRA DEMO PROFILE",
    "Fictional sample profile for the internship demo.",
    "",
    name,
    person.email || "applicant@example.com",
    person.location || "Location not specified",
    "",
    "INTERNSHIP PROGRAM",
    person.program || "Olentra Internship Program",
    "",
    "EDUCATION",
    person.college || "Education details not provided in this sample.",
    "",
    "PROFILE",
    summary ||
      person.bio ||
      "An aspiring technology professional interested in hands-on projects, mentorship, and continuous learning.",
    "",
    "SKILLS",
    skills,
    "",
    "This text profile is a fallback for fictional demo applicants. Newly uploaded resumes are available in their original format in the browser where they were saved.",
    "",
  ].join("\n");
  const safeName =
    name
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "") || "applicant";
  const filename = `${safeName}-sample-profile.txt`;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, filename);
  return { name: filename, type: blob.type, size: blob.size };
}

export async function clearAttachments() {
  await runTransaction("readwrite", (store) => store.clear());
}
