import { redirect } from "next/navigation";

// No landing page: the desktop app is the product and opens straight to the dashboard.
export default function Home() {
  redirect("/dashboard");
}
