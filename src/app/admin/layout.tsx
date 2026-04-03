import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProductCount } from "@/lib/db";
import AdminSidebar from "@/components/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const pendingCount = await getProductCount("pending_review");

  return (
    <div className="flex min-h-screen">
      <AdminSidebar pendingCount={pendingCount} />
      <main className="flex-1 p-6 md:p-10 overflow-auto">{children}</main>
    </div>
  );
}
