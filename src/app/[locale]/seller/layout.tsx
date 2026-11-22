import { ClipboardList, LayoutDashboard, MessageCircle, Package, Shirt, Store } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { unreadCount } from "@/lib/messaging";

export default async function SellerLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("WHOLESALER", "/seller");
  const [t, unread, pending] = await Promise.all([
    getTranslations("seller.nav"),
    unreadCount(user),
    user.store ? prisma.order.count({ where: { storeId: user.store.id, status: "PENDING" } }) : 0,
  ]);
  return (
    <DashboardShell
      heading={t("heading")}
      items={[
        { href: "/seller", label: t("overview"), icon: <LayoutDashboard />, exact: true },
        { href: "/seller/products", label: t("products"), icon: <Shirt /> },
        { href: "/seller/orders", label: t("orders"), icon: <Package />, badge: pending },
        { href: "/seller/messages", label: t("messages"), icon: <MessageCircle />, badge: unread },
        { href: "/seller/rfq", label: t("requests"), icon: <ClipboardList /> },
        { href: "/seller/store", label: t("store"), icon: <Store /> },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
