import { redirect } from "next/navigation";

export default function Page() {
  redirect("/intern/login?role=intern");
}
