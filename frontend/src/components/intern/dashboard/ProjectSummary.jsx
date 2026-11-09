"use client";
import { useEffect, useState } from "react";
import { useDashboard } from "./DashboardProvider";
import { Button, PageHeader, Panel } from "./DashboardUI";
import ui from "./staff.module.css";
import page from "./pages.module.css";

export default function ProjectSummary() {
  const { commands, data } = useDashboard();
  const [number, setNumber] = useState(1), [listing, setListing] = useState({items:[],total:0}), [error,setError] = useState("");
  useEffect(()=>{let active=true;commands.listProjects({page:number,pageSize:20}).then(result=>{if(!active)return;if(result.ok){setListing(result.data);setError("")}else setError(result.error)});return()=>{active=false}},[commands,number,data.projects]);
  return <div className={page.page}><PageHeader title="Projects" description="Project progress at a glance"/><Panel>{error && <p role="alert" className={ui.error}>{error}</p>}<div className={ui.tableWrap}><table className={ui.table}><thead><tr><th>Project</th><th>Status</th><th>Due</th><th>Progress</th></tr></thead><tbody>{listing.items.map(project=><tr key={project.id}><td>{project.name}</td><td>{project.status}</td><td>{project.dueOn || "—"}</td><td>{project.progress ?? 0}%</td></tr>)}</tbody></table></div>{!listing.items.length && !error && <p>No projects to display.</p>}<div className={ui.pagination}><Button variant="ghost" disabled={number<=1} onClick={()=>setNumber(number-1)}>Previous</Button><span>Page {number} · {listing.total} projects</span><Button variant="ghost" disabled={number*20>=listing.total} onClick={()=>setNumber(number+1)}>Next</Button></div></Panel></div>;
}
