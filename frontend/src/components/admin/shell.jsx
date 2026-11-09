"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Monitor, Image, BriefcaseBusiness, ClipboardList, ChartNoAxesCombined, Bell, Globe2, Users, ListChecks, Plug, Settings, Menu, X, Search, ExternalLink, ChevronDown, ArrowRight, Inbox } from "lucide-react";
import { AdminProvider, useAdmin } from "./store";
import { Button, Modal, SearchInput, Select } from "./ui";
import { designRoutes } from "./routes";
import { CompanyLogo } from "./company-logo";
import { LiveUserPill } from "./live-user-count";

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
  const { db, ready, error, account, session, can, command, unreadNotifications, scope, setScope, environment, setEnvironment } = useAdmin();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const authPage = pathname === "/dashboard/login" || pathname === "/dashboard/verify";
  useEffect(() => { if (ready && !authPage && session?.status !== "authenticated") router.replace(session?.status === "pending" ? "/dashboard/verify" : "/dashboard/login"); }, [ready, authPage, session?.status, router]);
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
  const signOut = () => { command("auth.signOut"); router.push("/dashboard/login"); };
  if (authPage) return <div className="ad-root">{children}</div>;
  if (!ready || session?.status !== "authenticated") return <div className="ad-root ad-session-loading" role="status">Loading company workspace…</div>;
  return <div className="ad-root">
    {menuOpen && <button className="ad-menu-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    <aside className={"ad-sidebar " + (menuOpen ? "is-open" : "")} aria-label="Company navigation">
      <Link href="/dashboard" className="ad-brand"><CompanyLogo /></Link>
      <button className="ad-mobile-close ad-icon-button" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={21} /></button>
      <div className="ad-workspace">Company workspace</div>
      <nav className="ad-nav">{visibleNavigation.map(([label, href, Icon]) => <Link key={href} href={href} className={isActive(href) ? "active" : ""} aria-current={isActive(href) ? "page" : undefined}><Icon aria-hidden="true" /><span>{label}</span></Link>)}</nav>
      <div className="ad-account-footer"><Link href="/dashboard/account" className="ad-owner"><span className="ad-avatar">{(account?.name || "User").split(" ").slice(0, 2).map(word => word[0]).join("")}</span><div><strong>{account?.name}</strong><small>{account?.role}</small></div><ChevronDown size={15} style={{ marginLeft: "auto" }} /></Link><button className="ad-sign-out" onClick={signOut}>Sign out</button></div>
    </aside>
    <div className="ad-work-area">
      <header className="ad-topbar">
        <button className="ad-icon-button ad-mobile-menu-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={27} /></button>
        <Link className="ad-mobile-brand" style={{ display: "none" }} href="/dashboard"><CompanyLogo /></Link>
        <div className="ad-breadcrumb">Workspace / <b>{pathname === "/dashboard/account" ? "My account" : current?.[0] || "Notifications"}</b></div>
        <LiveUserPill />
        <span className="ad-concept">LOCAL DEMO · JSON DATA</span>
        <button className="ad-search ad-topbar-search" onClick={() => setSearchOpen(true)} aria-label="Search dashboard pages"><Search size={16} /><span style={{ fontSize: 11, color: "#a9b8ce" }}>Search website, content, settings…</span><kbd style={{ marginLeft: "auto", fontSize: 9 }}>⌘K</kbd></button>
        <div className="ad-topbar-actions"><Link className="ad-icon-button ad-bell" href="/dashboard/notifications" aria-label={`Notification center, ${unreadNotifications} unread`}><Bell size={21} />{unreadNotifications > 0 && <span className="ad-unread-count">{unreadNotifications > 99 ? "99+" : unreadNotifications}</span>}</Link>
          <Select className="ad-topbar-environment" aria-label="Environment" options={["Production", "Staging"]} value={environment} onChange={event => setEnvironment(event.target.value)} />
          <Select className="ad-topbar-scope" aria-label="Region scope" options={["Global", "Americas", "Europe", "Asia Pacific"]} value={scope} onChange={event => setScope(event.target.value)} />
          <Button href="/" target="_blank" rel="noopener noreferrer" variant="primary" icon={ExternalLink} className="ad-view-website">View website</Button>
        </div>
      </header>
      <main className="ad-content" id="dashboard-main">{error && <div className="ad-storage-error" role="alert">{error}</div>}{allowed(pathname) ? children : <div className="ad-empty"><h1>Access restricted</h1><p>Your {account?.role} role cannot view this module.</p><Button href={visibleNavigation[0]?.[1] || "/dashboard/account"}>Go to an available page</Button></div>}</main>
    </div>
    <nav className="ad-mobile-dock" aria-label="Mobile navigation">{[["Overview", "/dashboard", Home], ["Controls", "/dashboard/website-controls", Monitor], ["Inbox", "/dashboard/enquiries", Inbox]].filter(([, href]) => allowed(href)).map(([label, href, Icon]) => <Link key={href} className={isActive(href) ? "active" : ""} href={href}><Icon />{label}</Link>)}<button onClick={() => setMenuOpen(true)}><Menu />More</button></nav>
    <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="Search your workspace"><div className="ad-stack"><SearchInput autoFocus value={query} onChange={setQuery} placeholder="Search all dashboard pages…" /><div className="ad-list">{results.slice(0, 12).map(route => <Link key={route.id} className="ad-list-row" href={route.href}><div><strong>{route.title}</strong><p>{route.module}</p></div><ArrowRight size={16} /></Link>)}{results.length === 0 && <p className="ad-muted">No pages match your search.</p>}</div></div></Modal>
  </div>;
}
export default function AdminShell({ children }) { return <AdminProvider><Workspace>{children}</Workspace></AdminProvider>; }
