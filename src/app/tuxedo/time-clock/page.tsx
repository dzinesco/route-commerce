import TimeTrackingFieldClient from "@/components/time-tracking/TimeTrackingFieldClient";

const BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";
const BRAND_NAME = "Tuxedo Corn";
const BRAND_ACCENT = "green";

export const metadata = {
  title: "Worker Clock — Tuxedo Corn",
};

export default function TuxedoTimeClockPage() {
  return (
    <TimeTrackingFieldClient
      brandId={BRAND_ID}
      brandName={BRAND_NAME}
      brandAccent={BRAND_ACCENT}
    />
  );
}