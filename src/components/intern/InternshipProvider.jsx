"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import base from "@/data/intern-dashboard.json";
import fixtures from "@/data/intern-workflows.json";
import {
  emptyStore,
  materialize,
  migrateLegacy,
  normalizeStore,
  reduceAction,
  scopedRecords,
  validSession,
  STORE_KEY,
  LEGACY_KEY,
  SESSION_KEY,
  PENDING_KEY,
  SESSION_DURATION,
} from "@/lib/intern/workflow.mjs";
import styles from "./session.module.css";
const Context = createContext(null);
const parse = (value) => {
  try {
    return JSON.parse(value || "null");
  } catch {
    return null;
  }
};
const safeAccount = (account) => {
  if (!account) return null;
  const { password, passwordHash, ...safe } = account;
  return safe;
};
const safeRedirect = (path, role) => {
  const home = role === "company" ? "/intern/dashboard" : "/intern/portal";
  return typeof path === "string" &&
    (path === home ||
      path.startsWith(home + "/") ||
      path.startsWith(home + "?")) &&
    !path.includes("\\")
    ? path
    : home;
};
async function passwordHash(password) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode("olentra-demo:" + password),
  );
  return [...new Uint8Array(bytes)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
export function InternshipProvider({ children }) {
  const [store, setStore] = useState(emptyStore),
    [session, setSession] = useState(null),
    [pending, setPending] = useState(null),
    [ready, setReady] = useState(false),
    [sessionReady, setSessionReady] = useState(false),
    [toast, setToast] = useState(""),
    [sessionNotice, setSessionNotice] = useState(""),
    [query, setQuery] = useState(""),
    [dateRange, setDateRange] = useState("30d"),
    [notificationDialog, setNotificationDialog] = useState(false);
  const storeRef = useRef(store),
    sessionRef = useRef(session),
    queue = useRef(Promise.resolve()),
    initialization = useRef(null);
  const notify = useCallback((message) => setToast(message), []);
  const applyStore = useCallback((value) => {
    storeRef.current = value;
    setStore(value);
  }, []);
  const lock = useCallback(
    (operation) =>
      typeof navigator !== "undefined" && navigator.locks
        ? navigator.locks.request(STORE_KEY, operation)
        : operation(),
    [],
  );
  const signOut = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}
    sessionRef.current = null;
    setSession(null);
    setQuery("");
  }, []);
  useEffect(() => {
    let live = true;
    initialization.current = lock(async () => {
      let initial;
      try {
        const saved = parse(localStorage.getItem(STORE_KEY));
        initial =
          saved?.version === 2
            ? normalizeStore(saved)
            : migrateLegacy(parse(localStorage.getItem(LEGACY_KEY)));
        localStorage.setItem(STORE_KEY, JSON.stringify(initial));
      } catch {
        initial = emptyStore();
      }
      if (!live) return;
      applyStore(initial);
      try {
        const savedSession = parse(sessionStorage.getItem(SESSION_KEY));
        sessionRef.current = savedSession;
        setSession(savedSession);
        const claim = parse(sessionStorage.getItem(PENDING_KEY));
        if (claim?.epoch === initial.epoch) setPending(claim);
      } catch {}
      setReady(true);
      setSessionReady(true);
    });
    const sync = (event) => {
      if (event.key !== STORE_KEY || !event.newValue) return;
      const next = parse(localStorage.getItem(STORE_KEY));
      if (
        next?.version === 2 &&
        (next.epoch !== storeRef.current.epoch ||
          next.revision >= storeRef.current.revision)
      )
        applyStore(normalizeStore(next));
    };
    window.addEventListener("storage", sync);
    return () => {
      live = false;
      window.removeEventListener("storage", sync);
    };
  }, [applyStore, lock]);
  const fullData = useMemo(() => materialize(base, fixtures, store), [store]);
  const rawAccount =
    ready && sessionReady ? validSession(session, fullData, store) : null;
  const account = useMemo(() => safeAccount(rawAccount), [rawAccount]);
  const my = useMemo(
    () => scopedRecords(fullData, store, rawAccount),
    [fullData, store, rawAccount],
  );
  useEffect(() => {
    if (!ready || !sessionReady || !session) return;
    if (!validSession(session, fullData, store)) {
      setSessionNotice(
        session.epoch !== store.epoch
          ? "The demo was reset. Sign in again to start fresh."
          : "Your demo session expired or changed. Sign in again.",
      );
      signOut();
      return;
    }
    const timer = setTimeout(
      () => {
        setSessionNotice(
          "Your eight-hour demo session expired. Sign in again.",
        );
        signOut();
      },
      Math.min(2147483647, Math.max(1, session.expiresAt - Date.now())),
    );
    return () => clearTimeout(timer);
  }, [ready, sessionReady, session, fullData, store, signOut]);
  useEffect(() => {
    if (pending && pending.epoch !== store.epoch) {
      setPending(null);
      try {
        sessionStorage.removeItem(PENDING_KEY);
      } catch {}
    }
  }, [pending, store.epoch]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  const commit = useCallback(
    (type, payload = {}) => {
      const operation = async () => {
        if (initialization.current) await initialization.current;
        return lock(async () => {
          try {
            const saved = parse(localStorage.getItem(STORE_KEY));
            const latest =
              saved?.version === 2 ? normalizeStore(saved) : storeRef.current;
            const current = materialize(base, fixtures, latest);
            const actor = validSession(sessionRef.current, current, latest);
            const outcome = reduceAction(
              base,
              fixtures,
              latest,
              actor?.id || null,
              {
                type,
                payload,
                id: crypto.randomUUID().replaceAll("-", "").slice(0, 12),
                now: new Date().toISOString(),
              },
            );
            if (outcome.result.ok) {
              localStorage.setItem(STORE_KEY, JSON.stringify(outcome.state));
              applyStore(outcome.state);
            }
            return outcome.result;
          } catch (error) {
            return {
              ok: false,
              error:
                "The demo could not save this change. " +
                (error.message || "Check browser storage and try again."),
            };
          }
        });
      };
      const next = queue.current.catch(() => {}).then(operation);
      queue.current = next;
      return next;
    },
    [applyStore, lock],
  );
  const establishSession = useCallback((record, state) => {
    const next = {
      accountId: record.id,
      role: record.role,
      accountVersion: record.sessionVersion || 1,
      epoch: state.epoch,
      expiresAt: Date.now() + SESSION_DURATION,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    sessionRef.current = next;
    setSession(next);
    setSessionNotice("");
    return next;
  }, []);
  const signIn = useCallback(
    async ({ email, password, returnTo }) => {
      if (initialization.current) await initialization.current;
      const hash = await passwordHash(String(password || ""));
      return lock(async () => {
        const saved = parse(localStorage.getItem(STORE_KEY));
        const latest =
          saved?.version === 2 ? normalizeStore(saved) : storeRef.current;
        const current = materialize(base, fixtures, latest);
        const record = current.accounts.find(
          (item) =>
            item.email.toLowerCase() ===
            String(email || "")
              .trim()
              .toLowerCase(),
        );
        if (!record || record.passwordHash !== hash)
          return {
            ok: false,
            error: "The email or password does not match a demo account.",
          };
        try {
          applyStore(latest);
          establishSession(record, latest);
          return {
            ok: true,
            role: record.role,
            redirect: safeRedirect(returnTo, record.role),
          };
        } catch {
          return {
            ok: false,
            error:
              "Allow session storage in this browser to sign in to the demo.",
          };
        }
      });
    },
    [applyStore, establishSession, lock],
  );
  const register = useCallback(
    async ({ applicationId, password }) => {
      if (String(password || "").length < 8)
        return {
          ok: false,
          error: "Use at least eight characters for your demo password.",
        };
      let claim;
      try {
        claim = parse(sessionStorage.getItem(PENDING_KEY));
      } catch {
        return {
          ok: false,
          error:
            "Allow session storage in this browser to create your demo account.",
        };
      }
      const result = await commit("REGISTER", {
        applicationId,
        passwordHash: await passwordHash(password),
        claimToken:
          claim?.applicationId === applicationId ? claim.claimToken : null,
      });
      if (!result.ok) return result;
      try {
        establishSession(result.data, storeRef.current);
        sessionStorage.removeItem(PENDING_KEY);
        setPending(null);
        return { ...result, redirect: "/intern/portal" };
      } catch {
        return {
          ok: false,
          error: "Your account was created. Allow session storage and sign in.",
        };
      }
    },
    [commit, establishSession],
  );
  const requestPasswordReset = useCallback(
    (payload) => commit("REQUEST_RESET", payload),
    [commit],
  );
  const resetPassword = useCallback(
    async ({ resetId, code, password }) =>
      String(password || "").length < 8
        ? {
            ok: false,
            error: "Use at least eight characters for your demo password.",
          }
        : commit("RESET_PASSWORD", {
            resetId,
            code: String(code).trim(),
            passwordHash: await passwordHash(password),
          }),
    [commit],
  );
  const commands = useMemo(
    () => ({
      submitApplication: async (payload) => {
        try {
          sessionStorage.setItem(PENDING_KEY + "-probe", "0".repeat(3000));
          sessionStorage.removeItem(PENDING_KEY + "-probe");
        } catch {
          return {
            ok: false,
            error:
              "Allow session storage in this browser before applying so you can create your demo account.",
          };
        }
        const result = await commit("SUBMIT_APPLICATION", payload);
        if (!result.ok) return result;
        const application = result.data;
        const claim = {
          applicationId: application.id,
          claimToken: application.claimToken,
          epoch: storeRef.current.epoch,
          application: {
            id: application.id,
            name: application.name,
            email: application.email,
            program: application.program,
          },
        };
        sessionStorage.setItem(PENDING_KEY, JSON.stringify(claim));
        setPending(claim);
        const { claimToken, ...safe } = application;
        return { ...result, data: safe };
      },
      sendOffer: (applicationId, terms) =>
        commit("SEND_OFFER", { applicationId, ...terms }),
      acceptOffer: (applicationId) => commit("ACCEPT_OFFER", { applicationId }),
      declineOffer: (applicationId, reason) =>
        commit("DECLINE_OFFER", { applicationId, reason }),
      saveOnboarding: (applicationId, details) =>
        commit("SAVE_ONBOARDING", { applicationId, details }),
      submitOnboarding: (applicationId) =>
        commit("SUBMIT_ONBOARDING", { applicationId }),
      approveOnboarding: (applicationId) =>
        commit("APPROVE_ONBOARDING", { applicationId }),
      updateProfile: (profile) => commit("UPDATE_PROFILE", profile),
      createTask: (task) => commit("CREATE_TASK", task),
      updateTask: (id, patch) => commit("UPDATE_TASK", { id, patch }),
      startTask: (taskId) => commit("START_TASK", { taskId }),
      submitWork: (taskId, submission) =>
        commit("SUBMIT_WORK", { taskId, ...submission }),
      reviewSubmission: (id, review) =>
        commit("REVIEW_SUBMISSION", { id, ...review }),
      sendMessage: (applicationId, message) =>
        commit("SEND_MESSAGE", { applicationId, ...message }),
      markNotificationsRead: (ids) => commit("MARK_READ", { ids }),
      completeInternship: (id) =>
        commit("UPDATE_INTERN", { id, patch: { status: "Completed" } }),
      sendAnnouncement: (announcement) => commit("ANNOUNCEMENT", announcement),
    }),
    [commit],
  );
  const legacyCall = useCallback(
    async (type, payload, failure = false) => {
      const result = await commit(type, payload);
      if (!result.ok) {
        notify(result.error);
        return failure;
      }
      return result.data;
    },
    [commit, notify],
  );
  const resetDemo = useCallback(async () => {
    const result = await commit("RESET_DEMO");
    if (result.ok) {
      try {
        const { clearAttachments } = await import(
          "@/lib/intern-attachments.mjs"
        );
        await clearAttachments();
      } catch {}
      signOut();
      setPending(null);
      setQuery("");
      setDateRange("30d");
      notify("Demo data restored. Sign in to start again.");
    } else notify(result.error);
    return result.ok;
  }, [commit, notify, signOut]);
  const visibleData = useMemo(
    () =>
      rawAccount?.role === "company"
        ? fullData
        : {
            organization: fullData.organization,
            programs: fullData.programs,
            settings: {
              programEnabled: fullData.settings.programEnabled,
              explorerEnabled: fullData.settings.explorerEnabled,
              innovatorEnabled: fullData.settings.innovatorEnabled,
              maxStipend: fullData.settings.maxStipend,
              programName: fullData.settings.programName,
            },
            resources: fullData.resources,
            user: account,
            applications: my.application ? [my.application] : [],
            interns: my.intern ? [my.intern] : [],
            projects: my.projects,
            tasks: my.tasks,
            submissions: my.submissions,
            certificates: my.certificates,
            messages: my.messages,
            notifications: my.notifications,
            activity: [],
            accounts: account ? [account] : [],
            offers: my.offer ? [my.offer] : [],
            onboarding: my.onboarding ? [my.onboarding] : [],
            metrics: [],
          },
    [rawAccount, fullData, my, account],
  );
  return (
    <Context.Provider
      value={{
        data: visibleData,
        seed: rawAccount?.role === "company" ? base : null,
        ready,
        sessionReady,
        session,
        sessionNotice,
        account,
        my,
        pendingApplication: pending?.application || null,
        demoAccounts: fixtures.demoAccounts.map(({ passwordHash, ...item }) => {
          const current = fullData.accounts.find(
            (record) => record.id === item.id,
          );
          return {
            ...item,
            name: current?.name || item.name,
            email: current?.email || item.email,
          };
        }),
        commands,
        signIn,
        register,
        requestPasswordReset,
        resetPassword,
        signOut,
        notify,
        toast,
        dismissToast: () => setToast(""),
        query,
        setQuery,
        dateRange,
        setDateRange,
        notificationDialog,
        setNotificationDialog,
        updateApplication: (id, patch) =>
          legacyCall("UPDATE_APPLICATION", { id, patch }),
        updateIntern: (id, patch) => legacyCall("UPDATE_INTERN", { id, patch }),
        createProject: (project) =>
          legacyCall("CREATE_PROJECT", { project }, null),
        updateProject: (id, patch) =>
          legacyCall("UPDATE_PROJECT", { id, patch }),
        generateCertificates: (internIds) =>
          legacyCall("GENERATE_CERTIFICATES", { internIds }, []),
        updateSettings: (patch) => legacyCall("UPDATE_SETTINGS", { patch }),
        addActivity: (entry) => legacyCall("ADD_ACTIVITY", entry),
        markNotificationsRead: async () => {
          await legacyCall("LEGACY_READ", {});
          return commands.markNotificationsRead(
            my.notifications.map((item) => item.id),
          );
        },
        resetDemo,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useInternship() {
  const context = useContext(Context);
  if (!context)
    throw new Error("useInternship must be inside InternshipProvider");
  return context;
}
export function RoleGuard({ role, children }) {
  const { ready, sessionReady, account, sessionNotice } = useInternship();
  const router = useRouter(),
    pathname = usePathname();
  useEffect(() => {
    if (!ready || !sessionReady) return;
    if (!account) {
      const target =
        pathname +
        (typeof window !== "undefined" ? window.location.search : "");
      router.replace(
        `/intern/login?role=${role}&returnTo=${encodeURIComponent(target)}${sessionNotice ? "&notice=session" : ""}`,
      );
    } else if (account.role !== role)
      router.replace(
        account.role === "company" ? "/intern/dashboard" : "/intern/portal",
      );
  }, [ready, sessionReady, account, role, pathname, router, sessionNotice]);
  if (!ready || !sessionReady || account?.role !== role)
    return (
      <div className={styles.loading} role="status">
        <span className={styles.loadingMark}>O</span>
        <strong>Opening your workspace</strong>
        <p>
          {ready && sessionReady
            ? "Taking you to the right place…"
            : "Restoring your demo session…"}
        </p>
      </div>
    );
  return children;
}
