"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Monitor, Image, BriefcaseBusiness, ClipboardList, ChartNoAxesCombined, Bell, Globe2, Users, ListChecks, Plug, Settings, Menu, X, Search, ExternalLink, ChevronDown, ArrowRight, Inbox } from "lucide-react";
import { AdminProvider, useAdmin } from "./store";
import { Button, Modal, SearchInput } from "./ui";
import { designRoutes } from "./routes";
import { CompanyLogo } from "./company-logo";
import { LiveUserPill } from "./live-user-count";
import { DashboardAppearance, DashboardThemeProvider, DashboardThemeToggle } from "./dashboard-theme";
import LoadingIndicator from "@olentra/ui/LoadingIndicator";
import { siteUrl } from "@/lib/site-url";

const navigation = [
  ["Overview", "/dashboard", Home], ["Website Controls", "/dashboard/website-controls", Monitor],
  ["Content & Media", "/dashboard/content", Image], ["Careers & Internships", "/dashboard/careers", BriefcaseBusiness],
  ["Forms & Enquiries", "/dashboard/enquiries", ClipboardList], ["Analytics & SEO", "/dashboard/analytics", ChartNoAxesCombined],
  ["Monitoring & Alerts", "/dashboard/monitoring", Bell], ["Regions & Languages", "/dashboard/localization", Globe2],
  ["Team & Access", "/dashboard/team", Users], ["Approvals & Audit Log", "/dashboard/approvals", ListChecks],
  ["Integrations", "/dashboard/integrations", Plug], ["Settings & Backups", "/dashboard/settings/company", Settings],
];
function Workspace({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { db, ready, error, account, auth, signOut: endSession, can, unreadNotifications } = useAdmin();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const authPage = pathname === "/dashboard/login" || pathname === "/dashboard/reset-password";
  useEffect(() => {
    if (!ready || auth.status === "loading") return;
    if (!authPage && auth.status === "anonymous") router.replace("/dashboard/login?returnTo=" + encodeURIComponent(pathname));
    if (pathname === "/dashboard/login" && auth.status === "authenticated") {
      const target = new URLSearchParams(window.location.search).get("returnTo");
      router.replace(target && target.startsWith("/dashboard") && !target.startsWith("//") ? target : "/dashboard");
    }
  }, [ready, authPage, auth.status, pathname, router]);
  const profile = db.datasets["olentra-admin-account-v1"] || {};
  useEffect(() => { document.documentElement.dataset.adminReducedMotion = String(Boolean(profile.reduceMotion)); }, [profile.reduceMotion]);
  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [pathname]);
  useEffect(() => { const handle = event => { if (event.key === "Escape") setMenuOpen(false); if ((event.metaKey || event.ctrlKey) && event.key === "k") { event.preventDefault(); setSearchOpen(current => !current); } }; window.addEventListener("keydown", handle); return () => window.removeEventListener("keydown", handle); }, []);
  useEffect(() => { if (!menuOpen) return; const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = previous; }; }, [menuOpen]);
  const isActive = href => href === "/dashboard" ? pathname === href : href.includes("settings") ? pathname.startsWith("/dashboard/settings") || pathname === "/dashboard/account" : href.includes("approvals") ? pathname.startsWith(href) || pathname === "/dashboard/audit" : pathname.startsWith(href);
  const current = navigation.find(([, href]) => isActive(href));
  const routeModule = path => path.startsWith("/dashboard/careers/applications") ? "Applications" : designRoutes.find(route => route.href === path)?.module || current?.[0];
  const allowed = path => ["/dashboard/account", "/dashboard/notifications"].includes(path) || can(routeModule(path), "view");
  const results = designRoutes.filter(route => route.module !== "Authentication" && allowed(route.href) && (route.title + " " + route.module).toLowerCase().includes(query.toLowerCase()));
  const visibleNavigation = navigation.filter(([label]) => can(label, "view") || label === "Careers & Internships" && can("Applications", "view")).map(row => row[0] === "Careers & Internships" && !can(row[0], "view") ? [row[0], "/dashboard/careers/applications", row[2]] : row);
  const signOut = async () => { await endSession(); router.push("/dashboard/login"); };
  if (!ready || (auth.status === "loading" && !authPage)) return <div className="workspace-root workspace-session-loading"><LoadingIndicator label="Restoring your session…" /></div>;
  if (authPage) return <div className="workspace-root"><div className="workspace-auth-theme"><DashboardThemeToggle /></div>{children}</div>;
  if (auth.status === "no-access") return <div className="workspace-root workspace-session-loading"><div className="workspace-empty"><h1>No company workspace access</h1><p>{auth.account?.email} is signed in, but its staff role has no company workspace access. An internship admin can grant a workspace access level in Internship dashboard → Staff &amp; roles.</p><Button variant="primary" onClick={signOut}>Sign out</Button></div></div>;
  if (auth.status === "unavailable") return <div className="workspace-root workspace-session-loading"><div className="workspace-empty"><h1>Sign-in service unavailable</h1><p>{auth.error || "The account service could not be reached."} Retrying automatically…</p></div></div>;
  if (auth.status !== "authenticated") return <div className="workspace-root workspace-session-loading"><LoadingIndicator label="Opening sign in…" /></div>;
  return <div className="workspace-root">
    {menuOpen && <button className="workspace-menu-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    <aside className={"workspace-sidebar " + (menuOpen ? "is-open" : "")} aria-label="Company navigation">
      <Link href="/dashboard" className="workspace-brand"><CompanyLogo /><span className="workspace-brand-wordmark">Olentra<span className="workspace-brand-subtitle">Technologies</span></span></Link>
      <button className="workspace-mobile-close workspace-icon-button" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={21} /></button>
      <div className="workspace-workspace">Company workspace</div>
      <nav className="workspace-nav">{visibleNavigation.map(([label, href, Icon]) => <Link key={href} href={href} className={isActive(href) ? "active" : ""} aria-current={isActive(href) ? "page" : undefined}><Icon aria-hidden="true" /><span>{label}</span></Link>)}</nav>
      <div className="workspace-account-footer"><Link href="/dashboard/account" className="workspace-owner"><span className="workspace-avatar">{(account?.name || "User").split(" ").slice(0, 2).map(word => word[0]).join("")}</span><div><strong>{account?.name}</strong><small>{account?.role}</small></div><ChevronDown size={15} style={{ marginLeft: "auto" }} /></Link><button className="workspace-sign-out" onClick={signOut}>Sign out</button></div>
    </aside>
    <div className="workspace-work-area">
      <header className="workspace-topbar">
        <button className="workspace-icon-button workspace-mobile-menu-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={27} /></button>
        <Link className="workspace-mobile-brand" style={{ display: "none" }} href="/dashboard"><CompanyLogo /></Link>
        <div className="workspace-topbar-context">
          <div className="workspace-breadcrumb">Workspace / <b>{pathname === "/dashboard/account" ? "My account" : current?.[0] || "Notifications"}</b></div>
          <LiveUserPill />
          <span className="workspace-concept">LOCAL DEMO · JSON DATA</span>
        </div>
        <button className="workspace-search workspace-topbar-search" onClick={() => setSearchOpen(true)} aria-label="Search dashboard pages"><Search size={16} /><span>Search workspace…</span><kbd>⌘K</kbd></button>
        <div className="workspace-topbar-actions"><Link className="workspace-icon-button workspace-bell" href="/dashboard/notifications" aria-label={`Notification center, ${unreadNotifications} unread`}><Bell size={21} />{unreadNotifications > 0 && <span className="workspace-unread-count">{unreadNotifications > 99 ? "99+" : unreadNotifications}</span>}</Link>
          <DashboardThemeToggle />
          {pathname === "/dashboard" && <DashboardAppearance />}
          <Button href={siteUrl("/")} target="_blank" rel="noopener noreferrer" variant="primary" icon={ExternalLink} className="workspace-view-website">View website</Button>
        </div>
      </header>
      <main className="workspace-content" id="dashboard-main">{error && <div className="workspace-storage-error" role="alert">{error}</div>}{allowed(pathname) ? children : <div className="workspace-empty"><h1>Access restricted</h1><p>Your {account?.role} role cannot view this module.</p><Button href={visibleNavigation[0]?.[1] || "/dashboard/account"}>Go to an available page</Button></div>}</main>
    </div>
    <nav className="workspace-mobile-dock" aria-label="Mobile navigation">{[["Overview", "/dashboard", Home], ["Controls", "/dashboard/website-controls", Monitor], ["Inbox", "/dashboard/enquiries", Inbox]].filter(([, href]) => allowed(href)).map(([label, href, Icon]) => <Link key={href} className={isActive(href) ? "active" : ""} href={href}><Icon />{label}</Link>)}<button onClick={() => setMenuOpen(true)}><Menu />More</button></nav>
    <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="Search your workspace"><div className="workspace-stack"><SearchInput autoFocus value={query} onChange={setQuery} placeholder="Search all dashboard pages…" /><div className="workspace-list">{results.slice(0, 12).map(route => <Link key={route.id} className="workspace-list-row" href={route.href} onClick={() => setSearchOpen(false)}><div><strong>{route.title}</strong><p>{route.module}</p></div><ArrowRight size={16} /></Link>)}{results.length === 0 && <p className="workspace-muted">No pages match your search.</p>}</div></div></Modal>
  </div>;
}
export default function AdminShell({ children }) { return <DashboardThemeProvider><AdminProvider><Workspace>{children}</Workspace></AdminProvider></DashboardThemeProvider>; }
