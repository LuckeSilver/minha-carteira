import { DashboardClient } from "@/components/dashboard-client";
import { getDashboardData } from "@/app/actions/dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialData = await getDashboardData();

  return <DashboardClient initialData={initialData} />;
}
