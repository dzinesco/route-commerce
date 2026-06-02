import Link from "next/link";
import { formatDate } from "@/lib/format-date";

type StopCardProps = {
  slug: string;
  city: string;
  state: string;
  date: string;
  time: string;
  location: string;
  brandSlug?: string;
  brandAccent?: "green" | "orange" | "blue";
};

export default function StopCard({
  slug, city, state, date, time, location,
  brandSlug = "tuxedo", brandAccent = "green",
}: StopCardProps) {
  const ctaBg =
    brandAccent === "blue"
      ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
      : brandAccent === "green"
      ? "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
      : "bg-orange-500 hover:bg-orange-600 active:bg-orange-700";

  return (
    <div className="group overflow-hidden rounded-3xl bg-white ring-1 ring-stone-200/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/8 hover:ring-stone-300">
      <Link href={`/${brandSlug}/stops/${slug}`} className="block p-7">
        {/* Location */}
        <div className="flex items-start gap-4 mb-5">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${brandAccent === "blue" ? "bg-blue-50 group-hover:bg-blue-100" : brandAccent === "green" ? "bg-emerald-50 group-hover:bg-emerald-100" : "bg-orange-50 group-hover:bg-orange-100"}`}>
            <svg className={`h-5 w-5 ${brandAccent === "blue" ? "text-blue-600" : brandAccent === "green" ? "text-emerald-600" : "text-orange-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-2xl font-black text-stone-950 leading-tight tracking-tight">
              {city}, {state}
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-stone-500 leading-relaxed line-clamp-2">{location}</p>
          </div>
        </div>

        {/* Date & time */}
        <div className="flex items-center gap-2 pl-[2.75rem]">
          <svg className="h-4 w-4 text-stone-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <span className="text-sm font-semibold text-stone-600">
            {formatDate(date)} &middot; {time}
          </span>
        </div>
      </Link>

      {/* CTA */}
      <div className="px-7 pb-7 pt-1">
        <Link
          href={`/${brandSlug}/stops/${slug}`}
          className={`block w-full rounded-2xl ${ctaBg} text-white px-5 py-3.5 text-center font-bold text-sm uppercase tracking-wider transition-colors`}
        >
          Shop This Stop
        </Link>
      </div>
    </div>
  );
}