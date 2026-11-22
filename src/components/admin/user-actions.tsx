import { getTranslations } from "next-intl/server";
import { setUserStatus, toggleStoreVerified } from "@/actions/admin";
import { buttonClasses } from "@/components/ui/button";

/** Approve / reject / suspend buttons for one member (server-rendered forms). */
export async function UserActions({
  user,
}: {
  user: { id: string; role: string; status: string; store?: { id: string; verified: boolean } | null };
}) {
  const t = await getTranslations("admin");
  const statusButton = (status: string, label: string, variant: "primary" | "outline" | "danger") => (
    <form action={setUserStatus}>
      <input type="hidden" name="userId" value={user.id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={buttonClasses({ size: "sm", variant })}>
        {label}
      </button>
    </form>
  );

  if (user.role === "ADMIN") return null;
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {user.status === "PENDING" ? (
        <>
          {statusButton("APPROVED", t("approve"), "primary")}
          {statusButton("REJECTED", t("reject"), "danger")}
        </>
      ) : user.status === "APPROVED" ? (
        statusButton("SUSPENDED", t("suspend"), "danger")
      ) : (
        statusButton("APPROVED", t("reactivate"), "outline")
      )}
      {user.store ? (
        <form action={toggleStoreVerified}>
          <input type="hidden" name="storeId" value={user.store.id} />
          <button type="submit" className={buttonClasses({ size: "sm", variant: "outline" })}>
            {user.store.verified ? t("unverify") : t("verify")}
          </button>
        </form>
      ) : null}
    </div>
  );
}
