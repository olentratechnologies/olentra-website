// Reuse a snapshot already being loaded. A change received while it is in
// flight requires one more pass, so an older response cannot hide a commit.
export function createSnapshotRefresh(load) {
  let pending = null;
  let dirty = false;
  let generation = 0;
  function start(invalidate) {
    if (pending) {
      if (invalidate) dirty = true;
      // A request can arrive after the loader's last dirty check but before
      // its promise settles. Chain one more pass in that narrow window.
      const current = generation;
      return pending.then(result => current === generation && dirty ? start(false) : result);
    }
    const current = generation;
    pending = (async () => {
      let result;
      do {
        if (current !== generation) return result;
        dirty = false;
        result = await load();
      } while (current === generation && dirty);
      return result;
    })().finally(() => { if (current === generation) pending = null; });
    return pending;
  }
  return { request: () => start(false), invalidate: () => start(true), reset: () => { generation++; pending = null; dirty = false; return start(false); } };
}
