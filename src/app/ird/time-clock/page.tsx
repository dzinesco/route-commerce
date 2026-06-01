import TimeTrackingFieldClient from "@/components/time-tracking/TimeTrackingFieldClient";

const BRAND_ID = "b1cb7a96-d82b-40b1-80b1-d6dd26c56e28";
const BRAND_NAME = "Indian River Direct";
const BRAND_ACCENT = "blue";

export const metadata = {
  title: "Worker Clock — Indian River Direct",
};

export default function IRDTimeClockPage() {
  return (
    <TimeTrackingFieldClient
      brandId={BRAND_ID}
      brandName={BRAND_NAME}
      brandAccent={BRAND_ACCENT}
    />
  );
}