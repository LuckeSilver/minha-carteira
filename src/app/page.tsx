import { DashboardClient } from "@/components/dashboard-client";
import { getDashboardData } from "@/app/actions/dashboard";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    redirect("/login?next=/");
  }

  const initialData = await getDashboardData();

  return <DashboardClient initialData={initialData} />;
}
