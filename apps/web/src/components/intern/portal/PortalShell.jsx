"use client";
import { useInternHistory } from "@/components/intern/useInternHistory";
import LoadingIndicator from "@olentra/ui/LoadingIndicator";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import CompanyBrand from "@/components/intern/CompanyBrand";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  Award,
  Bell,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ClipboardCheck,
  FileClock,
  House,
  LogOut,
  Menu,
  MessageSquare,
  Send,
  UserRound,
  X,
} from "lucide-react";
import { useInternship } from "@/components/intern/InternshipProvider";
import { PlanetArtwork } from "../dashboard/DashboardVisuals";
import {
  Button,
  EmptyState,
  ErrorMessage,
  Modal,
  useAction,
  formatDate,
} from "./PortalUI";
import styles from "./portal.module.css";
import { InternThemeToggle } from "../InternTheme";
import { useSiteFeatures } from "@olentra/site-features/react";
import WorkspaceLoading from "@/components/intern/WorkspaceLoading";
import useWorkspaceNavigation from "@/components/intern/useWorkspaceNavigation";

const navigation = [
  { href: "/intern/portal", label: "Dashboard", icon: House },
  {
    href: "/intern/portal/application",
    label: "My Application",
    icon: ClipboardCheck,
  },
  { href: "/intern/portal/onboarding", label: "Onboarding", icon: UserRound },
  {
    href: "/intern/portal/projects",
    label: "My Projects",
    icon: BriefcaseBusiness,
  },
  { href: "/intern/portal/submissions", label: "Submissions", icon: FileClock },
  { href: "/intern/portal/certificates", label: "Certificates", icon: Award },
  { href: "/intern/portal/profile", label: "My Profile", icon: UserRound },
];

export default function PortalShell({ children }) {
  const { features, ready: featuresReady } = useSiteFeatures();
  const {
    ready,
    sessionReady,
    workspaceState,
    retryWorkspace,
    account,
    my,
    data,
    commands,
    signOut,
    notify,
    toast,
    dismissToast,
  } = useInternship();
  const pathname = usePathname();
  const router = useRouter();
  const { navigate, pendingPathname } = useWorkspaceNavigation(pathname);
  const visiblePathname = pendingPathname || pathname;
  const contentState = workspaceState || (!ready ? "loading" : null);
  const workspaceReady = !contentState;
  const [mobile, setMobile] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [compose, setCompose] = useState(false);
  const menuRef = useRef(null);
  const sidebarRef = useRef(null);
  const closeNavRef = useRef(null);
  const action = useAction();
  const noticesHistory = useInternHistory("notifications", { enabled: dialog === "notifications", revision: my.notifications });
  const messagesHistory = useInternHistory("messages", { enabled: dialog === "messages", applicationId: my.application?.id, revision: my.messages });
  const notifications = dialog === "notifications" ? noticesHistory.items : my.notifications || [];
  const messages = [...(dialog === "messages" ? messagesHistory.items : my.messages || [])].sort((a, b) =>
    String(a.createdOn || "").localeCompare(String(b.createdOn || "")),
  );
  const unread = notifications.filter(
    (item) => item.unread !== false && !item.read && !item.readOn,
  );
  const current = navigation.find(
    (item) =>
      item.href === visiblePathname ||
      (item.href !== "/intern/portal" && visiblePathname.startsWith(`${item.href}/`)),
  );
  const initials =
    account?.name
      ?.split(" ")
      .slice(0, 2)
      .map((word) => word[0])
      .join("") || "IN";

  useEffect(() => {
    if (!mobile) return;
    const media = window.matchMedia("(max-width: 680px)");
    if (!media.matches) {
      setMobile(false);
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeNavRef.current?.focus();
    function closeOnResize(event) {
      if (!event.matches) setMobile(false);
    }
    function keyboard(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobile(false);
        return;
      }
      if (event.key !== "Tab") return;
      const elements = [
        ...(sidebarRef.current?.querySelectorAll(
          "a[href],button:not([disabled]),[tabindex]:not([tabindex='-1'])",
        ) || []),
      ].filter(
        (element) =>
          element.getClientRects().length &&
          window.getComputedStyle(element).visibility !== "hidden",
      );
      const first = elements[0];
      const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", keyboard);
    media.addEventListener("change", closeOnResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keyboard);
      media.removeEventListener("change", closeOnResize);
      menuRef.current?.focus();
    };
  }, [mobile]);

  async function logout() {
    await signOut();
    router.push("/intern/login?role=intern&notice=signed-out");
  }
  async function sendMessage(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await action.run(
      () =>
        commands.sendMessage(my.application.id, {
          subject: String(form.get("subject") || "").trim(),
          body: String(form.get("body") || "").trim(),
        }),
      () => {
        setCompose(false);
        notify("Your message was sent to the Olentra team.");
      },
    );
  }
  async function readNotifications() {
    await action.run(
      () => commands.markNotificationsRead(unread.slice(0, 100).map((item) => item.id)),
      () => notify("Notifications marked as read."),
    );
  }

  return (
    <div
      className={styles.portal}
      data-portal-ready={ready && sessionReady}
      data-testid="intern-portal"
      aria-busy={Boolean(contentState || pendingPathname)}
    >
      {mobile && (
        <button
          className={styles.backdrop}
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        id="intern-portal-sidebar"
        ref={sidebarRef}
        role={mobile ? "dialog" : undefined}
        aria-modal={mobile || undefined}
        className={`${styles.sidebar} ${mobile ? styles.sidebarOpen : ""}`}
        aria-label="Intern workspace navigation"
      >
        <Link
          href="/intern/portal"
          aria-label="Olentra Technologies"
          className={styles.brand}
          onClick={() => setMobile(false)}
        >
          <CompanyBrand variant="sidebar" />
        </Link>
        <button
          ref={closeNavRef}
          className={styles.closeNav}
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        >
          <X size={20} />
        </button>
        <p className={styles.workspaceLabel}>YOUR INTERNSHIP</p>
        <nav>
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className={`${styles.navItem} ${current?.href === href ? styles.navActive : ""}`}
              aria-current={current?.href === href ? "page" : undefined}
              onNavigate={event => {
                event.preventDefault();
                setMobile(false);
                navigate(href);
              }}
            >
              <Icon size={21} strokeWidth={1.7} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className={styles.sidebarPromo}>
          <PlanetArtwork className={styles.sidebarPlanet} />
          <strong>
            Your next chapter
            <br />
            starts here.
          </strong>
          <span>Learn. Build. Grow.</span>
          <Link href={featuresReady && features.internships ? "/careers/intern" : "/"}>
            Explore Olentra Technologies <ArrowRight size={13} />
          </Link>
        </div>
        <button className={styles.logout} onClick={logout}>
          <LogOut size={18} /> Sign out
        </button>
        <button className={styles.switchAccount} onClick={logout}>
          Switch account <ArrowRight size={12} />
        </button>
        <small className={styles.sidebarFooter}>
          {data.organization?.legalName || "Olentra Technologies Pvt. Ltd."}
          <br />
          Intern workspace
        </small>
      </aside>
      <main className={styles.main}>
        <header className={styles.topbar}>
          <button
            ref={menuRef}
            className={styles.menuButton}
            aria-label="Open navigation"
            aria-controls="intern-portal-sidebar"
            aria-expanded={mobile}
            onClick={() => setMobile(true)}
          >
            <Menu size={23} />
          </button>
          <div className={styles.breadcrumb}>
            <span>My workspace</span>
            <ArrowRight size={12} />
            <strong>{current?.label || "Dashboard"}</strong>
          </div>
          <div className={styles.topbarActions}>
            <InternThemeToggle />
            <button
              className={styles.roundButton}
              aria-label="Open messages"
              disabled={!workspaceReady}
              onClick={() => {
                action.setError("");
                setDialog("messages");
              }}
            >
              <MessageSquare size={21} />
            </button>
            <button
              className={styles.roundButton}
              aria-label={`Notifications, ${unread.length} unread`}
              disabled={!workspaceReady}
              onClick={() => {
                action.setError("");
                setDialog("notifications");
              }}
            >
              <Bell size={22} />
              {unread.length > 0 && <span>{unread.length}</span>}
            </button>
            <Link
              href="/intern/portal/profile"
              className={styles.profileButton}
            >
              <span className={styles.avatar}>{initials}</span>
              <span>
                <strong>{account?.name}</strong>
                <small>Intern</small>
              </span>
              <ChevronDown size={14} />
            </Link>
          </div>
        </header>
        <div className={styles.content}>{pendingPathname || contentState ? <WorkspaceLoading pathname={pendingPathname || pathname} state={pendingPathname ? "loading" : contentState} onRetry={retryWorkspace} /> : children}</div>
      </main>
      {toast && (
        <div className={styles.toast} role="status">
          <span>
            <Check size={17} />
          </span>
          {toast}
          <button onClick={dismissToast} aria-label="Dismiss notification">
            <X size={15} />
          </button>
        </div>
      )}
      <Modal
        open={workspaceReady && dialog === "notifications"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        title="Your notifications"
        description="Updates about your application and internship."
      >
        <ErrorMessage>{action.error}</ErrorMessage>
        {notifications.length ? (
          <>
            <div className={styles.modalToolbar}>
              <span>{unread.length} unread</span>
              <Button
                variant="secondary"
                busy={action.busy}
                disabled={!unread.length || action.busy}
                onClick={readNotifications}
              >
                Mark loaded as read
              </Button>
            </div>
            <ol className={styles.notificationList}>
              {notifications.map((item) => (
                <li
                  key={item.id}
                  data-unread={unread.some((entry) => entry.id === item.id)}
                >
                  <span className={styles.notificationDot} />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.body || item.message || item.detail}</p>
                    <small>
                      {formatDate(item.createdOn || item.occurredOn)}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
          </>
        ) : !noticesHistory.loading && !noticesHistory.error ? (
          <EmptyState
            icon={Bell}
            title="You’re all caught up"
            description="Your next internship updates will appear here."
          />
        ) : null}
        {noticesHistory.loading && <LoadingIndicator label="Loading notifications…" compact={notifications.length > 0} />}
        {noticesHistory.error && <p role="alert">{noticesHistory.error}</p>}
        {noticesHistory.hasMore && <Button variant="secondary" onClick={noticesHistory.loadMore} disabled={noticesHistory.loading}>Load older notifications</Button>}
      </Modal>
      <Modal
        open={workspaceReady && dialog === "messages"}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
            setCompose(false);
          }
        }}
        title="Messages"
        description="A direct line to your Olentra internship team."
      >
        <ErrorMessage>{action.error}</ErrorMessage>
        <div className={styles.modalToolbar}>
          <span>{messages.length} messages</span>
          {my.application && (
            <Button onClick={() => setCompose((value) => !value)}>
              <Send size={14} />
              {compose ? "Close draft" : "New message"}
            </Button>
          )}
        </div>
        {compose && (
          <form className={styles.messageForm} onSubmit={sendMessage}>
            <label className={styles.field}>
              Subject
              <input
                name="subject"
                required
                maxLength={140}
                placeholder="What would you like help with?"
              />
            </label>
            <label className={styles.field}>
              Message
              <textarea
                name="body"
                required
                rows={4}
                maxLength={3000}
                placeholder="Write your message to the team…"
              />
            </label>
            <Button type="submit" busy={action.busy} disabled={action.busy}>
              Send message <ArrowRight size={14} />
            </Button>
          </form>
        )}
        {messagesHistory.error && <p role="alert">{messagesHistory.error}</p>}
        {messagesHistory.loading && <LoadingIndicator label="Loading messages…" compact={messages.length > 0} />}
        {messagesHistory.hasMore && <Button variant="secondary" onClick={messagesHistory.loadMore} disabled={messagesHistory.loading}>Load older messages</Button>}
        {messages.length ? (
          <ol className={styles.messages}>
            {messages.map((message) => (
              <li key={message.id} data-own={message.senderRole === "intern"}>
                <div>
                  <strong>
                    {message.senderRole === "intern" ? "You" : "Olentra team"}
                  </strong>
                  <small>{formatDate(message.createdOn)}</small>
                </div>
                <h3>{message.subject}</h3>
                <p>{message.body}</p>
              </li>
            ))}
          </ol>
        ) : (
          !compose && !messagesHistory.loading && !messagesHistory.error && (
            <EmptyState
              icon={MessageSquare}
              title="Start a conversation"
              description="Need help with your offer, onboarding, or projects? Send the team a message."
            />
          )
        )}
      </Modal>
    </div>
  );
}
