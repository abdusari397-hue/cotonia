import { ClipboardList, Heart, LayoutDashboard, MessageCircle, Package, Store } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/guards";
import { unreadCount } from "@/lib/messaging";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("RETAILER", "/account");
  const [t, unread] = await Promise.all([getTranslations("account.nav"), unreadCount(user)]);
  return (
    <DashboardShell
      heading={t("heading")}
      items={[
        { href: "/account", label: t("overview"), icon: <LayoutDashboard />, exact: true },
        { href: "/account/orders", label: t("orders"), icon: <Package /> },
        { href: "/account/messages", label: t("messages"), icon: <MessageCircle />, badge: unread },
        { href: "/account/rfq", label: t("requests"), icon: <ClipboardList /> },
        { href: "/account/saved", label: t("saved"), icon: <Heart /> },
        { href: "/account/profile", label: t("profile"), icon: <Store /> },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
