"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import Link from "next/link";

export default function BrandsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ctx = gsap.context(() => {
      // Header animation
      gsap.from(".header-content", { 
        y: -30, 
        opacity: 0, 
        duration: 0.8, 
        ease: "power3.out" 
      });
      gsap.from(".farm-card", { 
        y: 60, 
        opacity: 0, 
        duration: 0.8, 
        stagger: 0.2, 
        ease: "power3.out" 
      });

      // 3D card tilt
      document.querySelectorAll(".tilt-3d").forEach((card) => {
        const el = card as HTMLElement;
        el.addEventListener("mousemove", (e: MouseEvent) => {
          const rect = el.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          gsap.to(el, {
            rotateY: x * 0.06,
            rotateX: -y * 0.06,
            scale: 1.02,
            duration: 0.3,
            ease: "power2.out",
          });
        });
        el.addEventListener("mouseleave", () => {
          gsap.to(el, {
            rotateY: 0,
            rotateX: 0,
            scale: 1,
            duration: 0.6,
            ease: "elastic.out(1, 0.5)",
          });
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const farms = [
    {
      name: "Tuxedo Corn",
      slug: "tuxedo",
      tagline: "Olathe Sweet — Colorado's Signature Sweet Corn",
      location: "Olathe, Colorado",
      description: "Three generations of Colorado farming heritage. Every ear hand-picked at peak ripeness from our Olathe Sweet seed, developed specifically for the mountain climate.",
      color: "#1a4d2e",
      bg: "#f0fdf4",
      borderColor: "#bbf7d0",
      initials: "TC",
    },
    {
      name: "Indian River Direct",
      slug: "indian-river-direct",
      tagline: "Sunshine State Citrus at Its Finest",
      location: "Indian River, Florida",
      description: "The citrus that built Florida's reputation worldwide. Grown in the mineral-rich soils along the St. Lucie River, our oranges and grapefruit are a tradition in homes nationwide.",
      color: "#92400e",
      bg: "#fef3c7",
      borderColor: "#fde68a",
      initials: "IR",
    },
  ];

  return (
    <div ref={containerRef} className="brands-page">
      {/* Grid pattern */}
      <div className="grid-pattern" />

      {/* Header */}
      <header className="header">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1a4d2e] to-[#2d6a4f] flex items-center justify-center shadow-lg shadow-[#1a4d2e]/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-[#1a1a1a] tracking-tight">Route Commerce</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-medium text-[#666] hover:text-[#1a4d2e] transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="min-h-[40vh] flex items-center justify-center pt-24 pb-12 relative overflow-hidden">
        <div className="absolute top-[20%] right-[10%] w-64 h-64 rounded-full bg-[#f0fdf4] -z-10" />
        <div className="absolute bottom-[10%] left-[5%] w-48 h-48 rounded-full bg-[#fef3c7] -z-10" />
        
        <div className="header-content text-center max-w-2xl mx-auto px-6">
          <span className="inline-block text-[#1a4d2e] text-sm font-bold tracking-[0.15em] uppercase mb-4">Our Partner Farms</span>
          <h1 className="font-black text-5xl sm:text-6xl md:text-7xl text-[#0a0a0a] mb-4 tracking-tight">
            Fresh From<br />
            <span className="text-[#1a4d2e]">the Field</span>
          </h1>
          <p className="text-lg text-[#666] max-w-lg mx-auto">
            Explore our network of premium produce farms. Each brings decades of agricultural expertise and commitment to quality.
          </p>
        </div>
      </section>

      {/* Farm Cards */}
      <section className="pb-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="space-y-8">
            {farms.map((farm) => (
              <div key={farm.slug} className="farm-card tilt-3d group relative rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl">
                {/* Background accent */}
                <div 
                  className="absolute inset-0 opacity-[0.03] -z-10" 
                  style={{ backgroundColor: farm.color }}
                />
                
                <div className="relative bg-white border-2 border-[#e5e5e5] rounded-3xl p-8 md:p-12">
                  <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Farm Initials Badge */}
                    <div 
                      className="w-24 h-24 rounded-3xl flex items-center justify-center text-white font-black text-3xl flex-shrink-0 shadow-lg"
                      style={{ backgroundColor: farm.color }}
                    >
                      {farm.initials}
                    </div>

                    {/* Farm Info */}
                    <div className="flex-1">
                      <div className="mb-2">
                        <span 
                          className="text-xs font-bold tracking-[0.15em] uppercase px-3 py-1 rounded-full"
                          style={{ 
                            color: farm.color, 
                            backgroundColor: farm.bg,
                            border: `1px solid ${farm.borderColor}`
                          }}
                        >
                          {farm.location}
                        </span>
                      </div>
                      
                      <h2 className="text-3xl md:text-4xl font-black text-[#0a0a0a] mb-2">
                        {farm.name}
                      </h2>
                      
                      <p className="text-lg font-medium text-[#1a4d2e] mb-4">
                        {farm.tagline}
                      </p>
                      
                      <p className="text-[#666] leading-relaxed mb-6 max-w-xl">
                        {farm.description}
                      </p>

                      {/* Stats */}
                      <div className="flex flex-wrap gap-6 mb-8">
                        <div>
                          <p className="text-2xl font-bold" style={{ color: farm.color }}>24/7</p>
                          <p className="text-xs text-[#888] uppercase tracking-wider">Customer Support</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold" style={{ color: farm.color }}>Same Day</p>
                          <p className="text-xs text-[#888] uppercase tracking-wider">Pickup Available</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold" style={{ color: farm.color }}>100%</p>
                          <p className="text-xs text-[#888] uppercase tracking-wider">Farm Fresh</p>
                        </div>
                      </div>

                      {/* CTA */}
                      <div className="flex flex-wrap items-center gap-4">
                        <Link 
                          href={`/${farm.slug}`}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold transition-all hover:shadow-lg group"
                          style={{ backgroundColor: farm.color }}
                        >
                          Visit Farm Store
                          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                        <Link 
                          href={`/${farm.slug}/stops`}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-[#d1d5db] text-[#333] font-medium transition-all hover:border-[#1a4d2e] hover:text-[#1a4d2e]"
                        >
                          View Pickup Stops
                        </Link>
                      </div>
                    </div>

                    {/* Decorative Element */}
                    <div 
                      className="hidden lg:block w-32 h-32 rounded-2xl opacity-20 flex-shrink-0"
                      style={{ backgroundColor: farm.color }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a4d2e] to-[#2d6a4f] flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-sm text-[#666]">2024 Route Commerce. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-[#888]">
              <a href="/privacy-policy" className="hover:text-[#1a4d2e] transition-colors">Privacy</a>
              <a href="/terms-and-conditions" className="hover:text-[#1a4d2e] transition-colors">Terms</a>
              <a href="/contact" className="hover:text-[#1a4d2e] transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .brands-page {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          background: #ffffff;
          min-height: 100vh;
        }

        .grid-pattern {
          position: fixed;
          inset: 0;
          background-image: 
            linear-gradient(rgba(26, 77, 46, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(26, 77, 46, 0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
          z-index: 0;
        }

        .header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .footer {
          position: relative;
          z-index: 50;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(0, 0, 0, 0.05);
        }
      `}</style>
    </div>
  );
}