"use client";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { getDatabase,getServerDatabase,getDataset,getServerDataset,subscribe,setDataset,hydrateDatabase,getStatus,getServerStatus } from "@/lib/admin/data-store";

export function useDataset(key,fallback){
  const initial=useRef(fallback);
  const get=useCallback(()=>getDataset(key,initial.current),[key]);
  const getServer=useCallback(()=>getServerDataset(key,initial.current),[key]);
  const value=useSyncExternalStore(subscribe,get,getServer);
  useEffect(()=>{hydrateDatabase();},[]);
  const setValue=useCallback(next=>setDataset(key,next,initial.current),[key]);
  return[value,setValue];
}
export function useDatabase(){const db=useSyncExternalStore(subscribe,getDatabase,getServerDatabase);const status=useSyncExternalStore(subscribe,getStatus,getServerStatus);useEffect(()=>{hydrateDatabase();},[]);return{db,...status};}
