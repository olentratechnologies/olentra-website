"use client";
import { useInternHistory } from "@/components/intern/useInternHistory";
import LoadingIndicator from "@olentra/ui/LoadingIndicator";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import CompanyBrand from "@/components/intern/CompanyBrand";
import * as Dialog from "@radix-ui/react-dialog";
import { InternThemeToggle } from "../InternTheme";
import * as Popover from "@radix-ui/react-popover";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ClipboardCheck,
  FileSignature,
  Mail,
  Download,
  House,
  LogOut,
  Lightbulb,
  Menu,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useDashboard } from "./DashboardProvider";
import { useInternship } from "@/components/intern/InternshipProvider";
import { UserPlus as UserPlusIcon, UsersRound, Video as VideoIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { exportCsv } from "./DashboardUI";
import {
  ApplicationsAreaChart,
  InsightGlyph,
  MetricGlyph,
  ProgramDonut,
  Sparkline,
} from "./DashboardVisuals";
import styles from "./dashboard.module.css";
import { useSiteFeatures } from "@olentra/site-features/react";
import WorkspaceLoading from "@/components/intern/WorkspaceLoading";
import useWorkspaceNavigation from "@/components/intern/useWorkspaceNavigation";
import { canOpenInternSection, hasStaffPermission } from "./staffAccess";
import ProjectSummary from "./ProjectSummary";

const icons = {
  home: House,
  clipboard: ClipboardCheck,
  mail: Mail,
  chart: ChartNoAxesCombined,
  users: Users,
  briefcase: BriefcaseBusiness,
  certificate: ShieldCheck,
  settings: Settings,
  download: Download,
  send: Send,
  application: ClipboardCheck,
  team: UsersRound,
  offer: FileSignature,
};

function BackgroundWaves() {
  return (
    <svg
      className={styles.backgroundWaves}
      viewBox="0 0 1463 941"
      preserveAspectRatio="xMaxYMin slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="dashboard-wave-fill" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#65a9ff" stopOpacity=".36" />
          <stop offset=".55" stopColor="#666eff" stopOpacity=".2" />
          <stop offset="1" stopColor="#fff" stopOpacity=".03" />
        </linearGradient>
        <linearGradient id="dashboard-wave-edge">
          <stop stopColor="#fff" stopOpacity=".04" />
          <stop offset=".6" stopColor="#fff" stopOpacity=".75" />
          <stop offset="1" stopColor="#fff" stopOpacity=".2" />
        </linearGradient>
      </defs>
      <path
        d="M990-160C852-20 787 84 881 144s159 23 198 85 12 148 159 193L1530 110V-160Z"
        fill="url(#dashboard-wave-fill)"
        stroke="url(#dashboard-wave-edge)"
      />
      <path
        d="M1100-140C975-8 900 102 988 177s167-30 215 38 3 110 89 132l230-98V-140Z"
        fill="url(#dashboard-wave-fill)"
        stroke="url(#dashboard-wave-edge)"
      />
      <path
        d="M1245-140C1104 1 1038 112 1108 171s182-43 276 16 61 100 149 100V-140Z"
        fill="url(#dashboard-wave-fill)"
        stroke="url(#dashboard-wave-edge)"
      />
      <path
        d="M1480 217c-181 25-212 90-156 192s178 76 179 205"
        fill="url(#dashboard-wave-fill)"
        stroke="#fff"
        strokeOpacity=".75"
      />
      <path
        d="M0 90h1463M810 121l205 27 50-15 91 65"
        fill="none"
        stroke="#fff"
        strokeOpacity=".14"
      />
      <circle cx="1015" cy="148" r="2.5" fill="#fff" fillOpacity=".6" />
    </svg>
  );
}

export default function DashboardShell({ children }) {
  const { features, ready: featuresReady } = useSiteFeatures();
  const {
    data,
    account,
    my,
    commands,
    signOut,
    ready,
    workspaceState,
    retryWorkspace,
    query,
    setQuery,
    toast,
    dismissToast,
    notify,
    addActivity,
    markNotificationsRead,
    notificationDialog,
    setNotificationDialog,
  } = useDashboard();
  const [mobileNav, setMobileNav] = useState(false);
  const searchRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();
  const { navigate: navigateTo, pendingPathname } = useWorkspaceNavigation(pathname);
  const section = pathname.split("/")[3] || "dashboard";
  const selectedSection = (pendingPathname || pathname).split("/")[3] || "dashboard";
  // Live "new application" alerts for staff who can read applications.
  const { connected, staffEvents } = useInternship();
  const [newApplications, setNewApplications] = useState(0);
  const [liveAlert, setLiveAlert] = useState(null);
  const sectionRef = useRef(selectedSection);
  sectionRef.current = selectedSection;
  useEffect(() => {
    if (!connected || !staffEvents) return undefined;
    return staffEvents.listen((event) => {
      if (event.event !== "intern.assigned" && sectionRef.current !== "applications") setNewApplications((count) => count + 1);
      setLiveAlert({ ...event, key: `${event.applicationId}-${Date.now()}` });
    });
  }, [connected, staffEvents]);
  useEffect(() => { if (selectedSection === "applications") setNewApplications(0); }, [selectedSection]);
  useEffect(() => {
    if (!liveAlert) return undefined;
    const timer = setTimeout(() => setLiveAlert(null), 8000);
    return () => clearTimeout(timer);
  }, [liveAlert]);
  const contentState = workspaceState || (!ready ? "loading" : null);
  const workspaceReady = !contentState;
  const allowed = canOpenInternSection(account, section);
  const can = permission => hasStaffPermission(account, permission);
  const noticeHistory = useInternHistory("notifications", { enabled: can("notifications.read"), revision: my.notifications });
  const activities = noticeHistory.items.map((notification) => ({
    ...notification,
    detail: notification.body,
    time: new Date(notification.createdOn).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    icon: "application",
    tone: "blue",
  }));
  const unreadCount = activities.filter((activity) => activity.unread).length;
  useEffect(() => {
    setMobileNav(false);
    setQuery("");
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname, setQuery]);
  useEffect(() => {
    function shortcut(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") setMobileNav(false);
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  function navigate(next) {
    setMobileNav(false);
    setQuery("");
    navigateTo(
      next === "dashboard" ? "/intern/dashboard" : `/intern/dashboard/${next}`,
    );
  }
  async function saveNotification(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const audience =
      form.get("audience") === "all interns"
        ? "all-interns"
        : data.programs.find((program) => program.name === form.get("audience"))
            ?.id || "all-interns";
    const result = await commands.sendAnnouncement({
      subject: form.get("subject"),
      message: form.get("message"),
      audience,
    });
    if (!result.ok) {
      notify(result.error);
      return;
    }
    setNotificationDialog(false);
    notify("Announcement added to intern updates.");
  }
  const activityList = (all = false) => (
    <ol className={styles.activityList}>
      {activities.slice(0, all ? activities.length : 4).map((activity) => {
        const Icon = icons[activity.icon] || ClipboardCheck;
        return (
          <li key={activity.id}>
            <span className={styles.activityIcon} data-tone={activity.tone}>
              <Icon size={15} strokeWidth={2.2} />
            </span>
            <div>
              <div className={styles.activityLine}>
                <strong>
                  {activity.href ? (
                    <Popover.Close asChild>
                      <Link
                        className={styles.notificationLink}
                        href={activity.href}
                      >
                        {activity.title}
                      </Link>
                    </Popover.Close>
                  ) : (
                    activity.title
                  )}
                </strong>
                <time>{activity.time}</time>
              </div>
              <p>{activity.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div
      className={styles.dashboard}
      data-demo-ready={ready}
      aria-busy={Boolean(contentState || pendingPathname)}
    >
      {mobileNav && (
        <button
          className={styles.sidebarBackdrop}
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside
        className={`${styles.sidebar} ${mobileNav ? styles.sidebarOpen : ""}`}
        id="intern-dashboard-sidebar"
        aria-label="Internship workspace"
      >
        <Link
          href={featuresReady && features.internships ? "/careers/intern" : "/intern/dashboard"}
          className={styles.brand}
          aria-label="Olentra Technologies"
        >
          <CompanyBrand variant="sidebar" />
        </Link>
        <button
          className={styles.closeNav}
          onClick={() => setMobileNav(false)}
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
        <nav className={styles.navigation} aria-label="Dashboard navigation">
          {data.navigation.filter(item => canOpenInternSection(account, item.id)).map((item) => {
            const Icon = icons[item.icon] || House;
            return (
              <Link
                key={item.id}
                prefetch={true}
                href={
                  item.id === "dashboard"
                    ? "/intern/dashboard"
                    : `/intern/dashboard/${item.id}`
                }
                className={`${styles.navItem} ${selectedSection === item.id ? styles.navActive : ""}`}
                onNavigate={event => {
                  event.preventDefault();
                  navigate(item.id);
                }}
                aria-current={section === item.id ? "page" : undefined}
              >
                <Icon size={24} strokeWidth={1.7} />
                <span>{item.label}</span>
                {item.id === "applications" && newApplications > 0 && (
                  <b className={styles.navCount} aria-label={`${newApplications} new`}>{newApplications > 9 ? "9+" : newApplications}</b>
                )}
              </Link>
            );
          })}
        </nav>
        <div className={styles.sidebarFooter}>
          <p>{data.organization.legalName}</p>
          <span>{data.organization.version}</span>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <button
            className={styles.menuButton}
            aria-label="Open navigation"
            aria-controls="intern-dashboard-sidebar"
            aria-expanded={mobileNav}
            onClick={() => setMobileNav(true)}
          >
            <Menu size={23} />
          </button>
          {(can("applications.read") || can("interns.read") || can("projects.read")) && <div className={styles.searchField}>
            <Search size={21} />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your workspace..."
              aria-label="Search your workspace"
            />
            <kbd>⌘ K</kbd>
            {query && (
              <button
                className={styles.clearSearch}
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>}
          <div className={styles.topbarActions}>
            <InternThemeToggle />
            {can("notifications.read") && <Popover.Root>
              <Popover.Trigger asChild>
                <button
                  className={styles.bellButton}
                  aria-label={`Notifications, ${unreadCount} unread`}
                  disabled={!workspaceReady}
                >
                  <Bell size={26} strokeWidth={1.6} />
                  {unreadCount > 0 && <span>{unreadCount}</span>}
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className={`${styles.popover} ${styles.notificationsPopover}`}
                  align="end"
                  sideOffset={14}
                  collisionPadding={16}
                >
                  <div className={styles.popoverHeading}>
                    <h2>Notifications</h2>
                    <button onClick={() => commands.markNotificationsRead(noticeHistory.items.filter(item => item.unread).slice(0, 100).map(item => item.id))}>
                      Mark loaded as read
                    </button>
                  </div>
                  {activityList(true)}
                  {noticeHistory.loading && <LoadingIndicator label="Loading notifications…" compact />}
                  {noticeHistory.error && <p role="alert">{noticeHistory.error}</p>}
                  {noticeHistory.hasMore && <button onClick={noticeHistory.loadMore} disabled={noticeHistory.loading}>Load older notifications</button>}
                  <Popover.Arrow className={styles.popoverArrow} />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>}
            <span className={styles.topbarDivider} />
            <Popover.Root>
              <Popover.Trigger asChild>
                <button className={styles.profileButton}>
                  <span className={styles.profileAvatar}>
                    {data.user.initials}
                  </span>
                  <span className={styles.profileText}>
                    <strong>{data.user.name}</strong>
                    <span>{account?.staffRole || data.user.role}</span>
                  </span>
                  <ChevronDown size={16} />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className={`${styles.popover} ${styles.profilePopover}`}
                  align="end"
                  sideOffset={12}
                >
                  <p>
                    Signed in as
                    <br />
                    <strong>{data.user.email}</strong>
                  </p>
                  {account?.staffRole === "admin" && <Popover.Close asChild>
                    <button onClick={() => navigate("settings")}>
                      <Settings size={16} /> Account settings
                    </button>
                  </Popover.Close>}
                  {featuresReady && features.internships && <Link href="/careers/intern">
                    <ArrowRight size={16} /> Internship website
                  </Link>}
                  <button
                    onClick={() => {
                      signOut();
                      router.replace("/intern/login?role=company&switch=1");
                    }}
                  >
                    <Users size={16} /> Switch account
                  </button>
                  <button
                    onClick={() => {
                      signOut();
                      router.replace(
                        "/intern/login?role=company&notice=signed-out",
                      );
                    }}
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </header>

        <div key={`${account?.id || "none"}:${account?.staffRole || ""}:${(account?.permissions || []).join(",")}`}>
          {!allowed ? <section role="alert" className={styles.popover}><h2>Access unavailable</h2><p>Your internship role does not have permission to open this page. Contact an internship admin if access is needed.</p></section> : pendingPathname || contentState ? <WorkspaceLoading pathname={pendingPathname || pathname} state={pendingPathname ? "loading" : contentState} onRetry={retryWorkspace} /> : section === "projects" && !can("projects.read") ? <ProjectSummary /> : children}
        </div>
      </main>
      <Dialog.Root
        open={workspaceReady && account?.staffRole === "admin" && notificationDialog}
        onOpenChange={setNotificationDialog}
      >
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content className={styles.dialogContent}>
            <Dialog.Close
              className={styles.dialogClose}
              aria-label="Close notification form"
            >
              <X size={20} />
            </Dialog.Close>
            <Dialog.Title className={styles.dialogTitle}>
              Send Notifications
            </Dialog.Title>
            <Dialog.Description className={styles.dialogDescription}>
              Send a notification to your internship program.
            </Dialog.Description>
            <form
              onSubmit={saveNotification}
              className={styles.notificationForm}
            >
              <label className={styles.formLabel}>
                Recipients
                <select name="audience">
                  <option value="all interns">All interns</option>
                  {data.programs.map((program) => (
                    <option key={program.id} value={program.name}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.formLabel}>
                Subject
                <input
                  name="subject"
                  placeholder="A little update for your next big step"
                  required
                  maxLength={90}
                />
              </label>
              <label className={styles.formLabel}>
                Message
                <textarea
                  name="message"
                  placeholder="Write your message here..."
                  rows={4}
                  required
                  maxLength={500}
                />
              </label>
              <p className={styles.previewNote}>
                This announcement appears in intern notifications.
              </p>
              <button className={styles.primaryButton} type="submit">
                <Send size={17} /> Create notification
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {liveAlert && (
        <div key={liveAlert.key} className={styles.liveAlert} role="status" aria-live="polite">
          <span className={styles.liveAlertIcon}><UserPlusIcon size={18} /></span>
          {liveAlert.event === "intern.assigned" ? <div>
            <strong>Assigned to you</strong>
            <p>{liveAlert.count === 1 ? "An application needs your review." : `${liveAlert.count} applications need your review.`}</p>
          </div> : <div>
            <strong>New application</strong>
            <p>
              {liveAlert.name || "An applicant"} · {data.programs.find((program) => program.id === liveAlert.programId)?.name || "Internship"}
              {liveAlert.hasVideo && <span className={styles.liveAlertVideo}><VideoIcon size={11} /> video</span>}
            </p>
          </div>}
          <Link href={liveAlert.applicationId ? `/intern/dashboard/applications/${liveAlert.applicationId}` : "/intern/dashboard/applications?assignee=me"} onClick={() => setLiveAlert(null)}>View</Link>
          <button onClick={() => setLiveAlert(null)} aria-label="Dismiss alert"><X size={15} /></button>
        </div>
      )}
      {toast && (
        <div key={toast} className={styles.toast} role="status">
          <span>
            <Check size={17} />
          </span>
          {toast}
          <button onClick={dismissToast} aria-label="Dismiss notification">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
