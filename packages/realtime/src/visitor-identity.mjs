export const VISITOR_ID_KEY = "olentra.visitor.id.v1";
const validId = (value) => typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$/.test(value);

export function createVisitorIdentity({ storage, eventTarget, createId }) {
  let id = null, listening = false;
  const listeners = new Set();

  const read = () => {
    try { const value = storage?.getItem(VISITOR_ID_KEY); return validId(value) ? value : null; }
    catch { return null; }
  };
  const write = (value) => {
    try { if (storage?.getItem(VISITOR_ID_KEY) !== value) storage?.setItem(VISITOR_ID_KEY, value); }
    catch { /* A per-document identity still works with storage disabled. */ }
  };

  function initialize() {
    if (id) return;
    id = read();
    if (!id) {
      id = createId();
      if (!validId(id)) throw new Error("Could not create a visitor identity.");
      write(id);
    }
  }

  function reconcile(incoming) {
    initialize();
    const candidates = [id, read(), validId(incoming) ? incoming : null].filter(Boolean);
    const winner = candidates.sort()[0];
    const changed = winner !== id;
    id = winner;
    write(winner);
    if (changed) for (const listener of [...listeners]) listener(id);
  }

  function onStorage(event) {
    if (event.key !== VISITOR_ID_KEY && event.key !== null) return;
    if (event.storageArea && event.storageArea !== storage) return;
    reconcile(event.newValue);
  }

  return {
    getId() { initialize(); return id; },
    subscribe(listener) {
      initialize();
      listeners.add(listener);
      if (!listening && eventTarget) {
        eventTarget.addEventListener("storage", onStorage);
        listening = true;
      }
      reconcile(null);
      return () => {
        listeners.delete(listener);
        if (listening && !listeners.size) {
          eventTarget.removeEventListener("storage", onStorage);
          listening = false;
        }
      };
    },
    dispose() {
      if (listening) eventTarget.removeEventListener("storage", onStorage);
      listening = false;
      listeners.clear();
    },
  };
}
