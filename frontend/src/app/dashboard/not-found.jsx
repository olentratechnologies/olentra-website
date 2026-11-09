"use client";
import { EmptyState, Button, Panel } from "@/components/admin/ui";
export default function DashboardNotFound() { return <Panel><EmptyState title="This workspace page could not be found" description="Return to your company overview or choose a module from the navigation." action={<Button href="/dashboard" variant="primary">Back to overview</Button>} /></Panel>; }
