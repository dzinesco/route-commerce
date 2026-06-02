"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { supabase } from "@/lib/supabase";
import StorefrontHeader from "@/components/storefront/StorefrontHeader";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import LayoutContainer from "@/components/layout/LayoutContainer";
import { formatDate } from "@/lib/format-date";

type Stop = {
  id: string;
  city: string;
  state: string;
  date: string;
  time: string;
  location: string;
  address: string | null;
  slug: string;
  cutoff_time: string | null;
};

const BRAND_NAME = "Tuxedo Corn";
const BRAND_SLUG = "tuxedo";
const BRAND_ACCENT = "green";

export default function TuxedoStopsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStops() {
      const { data } = await supabase
        .from("stops")
        .select("id, city, state, date, time, location, address, slug, cutoff_time")
        .eq("active", true)
        .eq("brand_id", "64294306-5f42-463d-a5e8-2ad6c81a96de") // Tuxedo brand
        .order("date", { ascending: true });

      setStops(data ?? []);
      setLoading(false);
    }
    loadStops();

    // GSAP animations
    if (typeof window !== "undefined" && containerRef.current) {
      const ctx = gsap.context(() => {
        gsap.from(".stop-card", {
          y: 30,
          opacity: 0,
          duration: 0.5,
          stagger: 0.08,
          ease: "power3.out",
        });
      }, containerRef);
      return () => ctx.revert();
    }
  }, []);

  const now = new Date();
  const upcomingStops = stops.filter(s => new Date(s.date) >= now);
  const pastStops = stops.filter(s => new Date(s.date) < now);

  return (
    <div ref={containerRef} className="min-h-screen bg-stone-50">
      <StorefrontHeader brandName={BRAND_NAME} brandSlug={BRAND_SLUG} brandAccent={BRAND_ACCENT as "green" | "orange" | "blue"} />

      <main className="py-16 md:py-20">
        <LayoutContainer>
          {/* Header */}
          <div className="max-w-4xl mx-auto mb-12 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-600 mb-4">
              {BRAND_NAME}
            </p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-stone-950 mb-4">
              Pickup Stops
            </h1>
            <p className="text-stone-500 text-lg">
              Fresh Olathe Sweet&trade; sweet corn delivered to a stop near you.
            </p>
            <div className="mt-6 h-1 w-12 bg-emerald-600 mx-auto rounded-full" />
          </div>

          {loading ? (
            <div className="max-w-4xl mx-auto space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-stone-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : upcomingStops.length === 0 ? (
            <div className="max-w-4xl mx-auto text-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-stone-800 mb-2">No Upcoming Stops</h2>
              <p className="text-stone-500">Check back soon for new pickup locations!</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-3">
              {upcomingStops.map((stop, index) => (
                <Link
                  key={stop.id}
                  href={`/tuxedo/stops/${stop.slug}`}
                  className="stop-card group block bg-white rounded-2xl p-5 shadow-sm ring-1 ring-stone-200/60 transition-all duration-300 hover:shadow-lg hover:ring-emerald-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Date badge */}
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex flex-col items-center justify-center text-white shadow-md shadow-emerald-500/20">
                        <span className="text-[10px] font-bold uppercase opacity-80">
                          {new Date(stop.date).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        <span className="text-xl font-black leading-none">
                          {new Date(stop.date).getDate()}
                        </span>
                      </div>
                    </div>

                    {/* Stop info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-stone-950 group-hover:text-emerald-700 transition-colors">
                        {stop.city}, {stop.state}
                      </h3>
                      <p className="text-sm text-stone-500 truncate">{stop.location}</p>
                      {stop.address && (
                        <p className="text-xs text-stone-400 truncate">{stop.address}</p>
                      )}
                    </div>

                    {/* Time & CTA */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-stone-700">{stop.time}</p>
                        {stop.cutoff_time && (
                          <p className="text-xs text-stone-400">Order by {stop.cutoff_time}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                        <svg className="w-5 h-5 text-emerald-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {/* Past stops */}
              {pastStops.length > 0 && (
                <div className="mt-8 pt-8 border-t border-stone-200">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-stone-400 mb-4">Past Stops</h2>
                  <div className="space-y-2 opacity-60">
                    {pastStops.slice(0, 5).map(stop => (
                      <div
                        key={stop.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-white/50 text-stone-500"
                      >
                        <div className="w-10 h-10 rounded-lg bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-500">
                          {new Date(stop.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{stop.city}, {stop.state}</p>
                          <p className="text-xs">{stop.location}</p>
                        </div>
                        <span className="text-xs">Completed</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </LayoutContainer>
      </main>

      <StorefrontFooter brandName={BRAND_NAME} brandSlug={BRAND_SLUG} brandAccent={BRAND_ACCENT as "green" | "orange" | "blue"} />
    </div>
  );
}