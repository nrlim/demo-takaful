import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { isAuthenticated } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.JSX.Element> {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-950">
      <DashboardSidebar />
      <main className="transition-[padding] duration-200 lg:pl-[var(--dashboard-sidebar-width,13rem)] w-full">
        <div className="w-full px-4 py-6 md:px-6 lg:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
