import { ArrowLeft, ClipboardList, MessagesSquare } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { StoreAvatar } from "@/components/catalog/store-card";
import { Flag } from "@/components/ui/flag";
import { EmptyState, PageHeader } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { markConversationRead } from "@/lib/messaging";
import { cn } from "@/lib/utils";
import { AutoRefresh, Composer, RefreshOnMount, ThreadScroller } from "./client-parts";

type Viewer = "RETAILER" | "WHOLESALER";

const messageInclude = {
  product: {
    select: {
      slug: true,
      name: true,
      sku: true,
      colors: { take: 1, orderBy: { sortOrder: "asc" as const }, select: { imageUrl: true } },
    },
  },
  rfq: { select: { number: true, title: true } },
};

export async function MessagesView({
  user,
  viewer,
  activeId,
}: {
  user: SessionUser;
  viewer: Viewer;
  activeId?: string;
}) {
  const [t, locale] = await Promise.all([getTranslations("inbox"), getLocale()]);
  const basePath = viewer === "RETAILER" ? "/account/messages" : "/seller/messages";
  const storeId = user.store?.id;
  if (viewer === "WHOLESALER" && !storeId) notFound();

  // Load and mark the open thread first, so the list shows it as read.
  let active = null;
  let markedRead = false;
  if (activeId) {
    active = await prisma.conversation.findUnique({
      where: { id: activeId },
      include: {
        messages: { orderBy: { createdAt: "asc" }, include: messageInclude },
        store: { select: { name: true, slug: true, country: true, brandColor: true } },
        retailer: { select: { name: true, retailer: { select: { shopName: true, country: true, city: true } } } },
      },
    });
    const owns = active && (viewer === "RETAILER" ? active.retailerId === user.id : active.storeId === storeId);
    if (!active || !owns) notFound();
    const unread = viewer === "RETAILER" ? active.retailerUnread : active.sellerUnread;
    if (unread > 0) {
      await markConversationRead(active.id, viewer === "RETAILER" ? "retailer" : "seller");
      markedRead = true;
    }
  }

  const conversations = await prisma.conversation.findMany({
    where: viewer === "RETAILER" ? { retailerId: user.id } : { storeId },
    orderBy: { lastMessageAt: "desc" },
    include: {
      store: { select: { name: true, country: true, brandColor: true } },
      retailer: { select: { name: true, retailer: { select: { shopName: true, country: true } } } },
    },
  });

  const counterpart = (conversation: (typeof conversations)[number]) =>
    viewer === "RETAILER"
      ? { name: conversation.store.name, country: conversation.store.country, color: conversation.store.brandColor }
      : {
          name: conversation.retailer.retailer?.shopName ?? conversation.retailer.name,
          country: conversation.retailer.retailer?.country,
          color: "#3CBFA0",
        };

  return (
    <div>
      <PageHeader title={t("title")} subtitle={viewer === "RETAILER" ? t("subtitleRetailer") : t("subtitleSeller")} />
      {conversations.length === 0 && !active ? (
        <EmptyState
          icon={<MessagesSquare aria-hidden />}
          title={t("emptyTitle")}
          text={viewer === "RETAILER" ? t("emptyRetailer") : t("emptySeller")}
        />
      ) : (
        <div className="grid overflow-hidden rounded-card border border-line bg-surface shadow-card lg:h-[calc(100dvh-15rem)] lg:min-h-[34rem] lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className={cn("min-h-0 overflow-y-auto border-line lg:border-e", active && "hidden lg:block")}>
            <ul className="divide-y divide-line">
              {conversations.map((conversation) => {
                const other = counterpart(conversation);
                const unread = viewer === "RETAILER" ? conversation.retailerUnread : conversation.sellerUnread;
                const selected = conversation.id === active?.id;
                return (
                  <li key={conversation.id}>
                    <Link
                      href={`${basePath}/${conversation.id}`}
                      aria-current={selected ? "page" : undefined}
                      className={cn(
                        "flex gap-3 px-4 py-3.5 transition",
                        selected ? "bg-brand-50" : "hover:bg-canvas",
                      )}
                    >
                      <StoreAvatar name={other.name} color={other.color} className="size-11 text-sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("flex min-w-0 items-center gap-1.5 text-sm", unread ? "font-bold" : "font-semibold", "text-ink")}>
                            {other.country ? <Flag code={other.country} /> : null}
                            <span className="truncate">{other.name}</span>
                          </p>
                          <span className="shrink-0 text-[0.7rem] text-muted">
                            {formatDate(conversation.lastMessageAt, locale, { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <p className={cn("truncate text-xs", unread ? "font-semibold text-ink" : "text-muted")}>
                            {conversation.lastMessage || t("noMessagesYet")}
                          </p>
                          {unread > 0 ? (
                            <span
                              className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand-600 px-1.5 text-[0.7rem] font-bold text-white"
                              aria-label={t("unread", { count: unread })}
                            >
                              {unread}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </aside>

          <section className={cn("min-h-[30rem] min-w-0 flex-col lg:min-h-0", active ? "flex" : "hidden lg:flex")}>
            {active ? (
              <>
                <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                  <Link
                    href={basePath}
                    aria-label={t("backToList")}
                    className="grid size-10 place-items-center rounded-full hover:bg-ink/5 lg:hidden"
                  >
                    <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden />
                  </Link>
                  {viewer === "RETAILER" ? (
                    <>
                      <StoreAvatar name={active.store.name} color={active.store.brandColor} className="size-10 text-sm" />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate font-semibold text-ink">
                          <Flag code={active.store.country} />
                          {active.store.name}
                        </p>
                        <Link href={`/wholesalers/${active.store.slug}`} className="text-xs font-medium text-brand-700 hover:underline">
                          {t("viewStore")}
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <StoreAvatar
                        name={active.retailer.retailer?.shopName ?? active.retailer.name}
                        color="#3CBFA0"
                        className="size-10 text-sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate font-semibold text-ink">
                          {active.retailer.retailer ? <Flag code={active.retailer.retailer.country} /> : null}
                          {active.retailer.retailer?.shopName ?? active.retailer.name}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {active.retailer.name}
                          {active.retailer.retailer?.city ? ` · ${active.retailer.retailer.city}` : ""}
                        </p>
                      </div>
                    </>
                  )}
                </header>

                <ThreadScroller count={active.messages.length} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-canvas/60 px-4 py-5">
                  {active.messages.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="font-semibold text-ink">{t("noMessagesYet")}</p>
                      <p className="mt-1 text-sm text-muted">{t("startHint")}</p>
                    </div>
                  ) : (
                    active.messages.map((message) => {
                      const mine = message.senderId === user.id;
                      return (
                        <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                          <div
                            className={cn(
                              "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-xs sm:max-w-[75%]",
                              mine ? "rounded-ee-md bg-ink text-white" : "rounded-es-md border border-line bg-surface text-ink",
                            )}
                          >
                            {message.product ? (
                              <Link
                                href={`/products/${message.product.slug}`}
                                className={cn(
                                  "mb-2 flex items-center gap-3 rounded-xl p-2",
                                  mine ? "bg-white/10 hover:bg-white/15" : "bg-canvas hover:bg-cream",
                                )}
                              >
                                {message.product.colors[0] ? (
                                  <img src={message.product.colors[0].imageUrl} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
                                ) : null}
                                <span className="min-w-0">
                                  <span className="block text-[0.7rem] font-semibold tracking-wider uppercase opacity-80">
                                    {t("aboutProduct")}
                                  </span>
                                  <span className="block truncate font-semibold">{message.product.name}</span>
                                  {message.quantity ? (
                                    <span className="block text-xs opacity-80">{t("quantity", { count: message.quantity })}</span>
                                  ) : null}
                                </span>
                              </Link>
                            ) : null}
                            {message.rfq ? (
                              <Link
                                href={`/rfq/${message.rfq.number}`}
                                className={cn(
                                  "mb-2 flex items-center gap-2 rounded-xl p-2 text-xs font-semibold",
                                  mine ? "bg-white/10 hover:bg-white/15" : "bg-canvas hover:bg-cream",
                                )}
                              >
                                <ClipboardList className="size-4 shrink-0" aria-hidden />
                                <span className="truncate">
                                  {t("aboutRequest")}: {message.rfq.title}
                                </span>
                              </Link>
                            ) : null}
                            <p className="leading-relaxed whitespace-pre-line">{message.body}</p>
                            <p className={cn("mt-1 text-[0.7rem]", mine ? "text-white/75" : "text-muted")}>
                              {mine ? `${t("you")} · ` : ""}
                              {formatDateTime(message.createdAt, locale)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </ThreadScroller>
                <Composer conversationId={active.id} />
                <AutoRefresh />
                {markedRead ? <RefreshOnMount /> : null}
              </>
            ) : (
              <div className="grid flex-1 place-items-center p-10 text-center text-muted">
                <div>
                  <MessagesSquare className="mx-auto size-10 text-line-strong" aria-hidden />
                  <p className="mt-3">{t("selectConversation")}</p>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
