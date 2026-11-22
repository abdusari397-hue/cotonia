import { ClipboardList, LayoutDashboard, Package, Shapes, Shirt, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole("ADMIN", "/admin");
  const [t, pending] = await Promise.all([
    getTranslations("admin.nav"),
    prisma.user.count({ where: { status: "PENDING" } }),
  ]);
  return (
    <DashboardShell
      heading={t("heading")}
      items={[
        { href: "/admin", label: t("overview"), icon: <LayoutDashboard />, exact: true },
        { href: "/admin/users", label: t("users"), icon: <Users />, badge: pending },
        { href: "/admin/products", label: t("products"), icon: <Shirt /> },
        { href: "/admin/orders", label: t("orders"), icon: <Package /> },
        { href: "/rfq", label: t("requests"), icon: <ClipboardList /> },
        { href: "/admin/categories", label: t("categories"), icon: <Shapes /> },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
