import { redirect } from "next/navigation";
import WaterAdminPinClient from "./WaterAdminPinClient";

export const dynamic = "force-dynamic";

const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";

export default async function WaterAdminLoginPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Water Log Admin</h1>
          <p className="text-sm text-slate-500 mt-1">Enter your 4-digit admin PIN</p>
        </div>
        <WaterAdminPinClient brandId={TUXEDO_BRAND_ID} />
      </div>
    </div>
  );
}