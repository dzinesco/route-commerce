import { redirect } from "next/navigation";

export default function AdminNewOrderRedirect() {
  // Preserve the "create first order" intent but route to the supported flow
  redirect("/admin/orders?new=true");
}
