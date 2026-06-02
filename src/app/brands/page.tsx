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
      gsap.from(".brand-card", { 
        y: 40, 
        opacity: 0, 
        duration: 0.6, 
        stagger: 0.15, 
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
            rotateY: x * 0.04,
            rotateX: -y * 0.04,
            scale: 1.01,
            duration: 0.3,
            ease: "power2.out",
          });
        });
        el.addEventListener("mouseleave", () => {
          gsap.to(el, {
            rotateY: 0,
            rotateX: 0,
            scale: 1,
            duration: 0.5,
            ease: "elastic.out(1, 0.5)",
          });
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const brands = [
    {
      name: "Tuxedo Corn",
      slug: "tuxedo",
      tagline: "Olathe Sweet — Colorado's Signature Sweet Corn",
      location: "Olathe, Colorado",
      description: "Three generations of Colorado farming heritage. Every ear hand-picked at peak ripeness.",
      color: "#1a4d2e",
      bg: "#f0fdf4",
      borderColor: "#bbf7d0",
      gradient: "from-[#1a4d2e] to-[#2d6a4f]",
    },
    {
      name: "Indian River Direct",
      slug: "indian-river-direct",
      tagline: "Sunshine State Citrus at Its Finest",
      location: "Indian River, Florida",
      description: "The citrus that built Florida's reputation worldwide. Grown in the mineral-rich soils along the St. Lucie River.",
      color: "#92400e",
      bg: "#fef3c7",
      borderColor: "#fde68a",
      gradient: "from-[#92400e] to-[#b45309]",
    },
  ];

  return (
    <div ref={containerRef} className="brands-page">
      {/* Subtle background pattern */}
      <div className="grid-pattern" />

      {/* Header */}
      <header className="header">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a4d2e] to-[#2d6a4f] flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-[#1a1a1a] tracking-tight">Route Commerce</span>
          </div>
          <Link href="/" className="text-sm font-medium text-[#666] hover:text-[#1a4d2e] transition-colors">
            ← Back to Home
          </Link>
        </div>
      </header>

      {/* Hero - Compact */}
      <section className="pt-24 pb-8">
        <div className="header-content text-center max-w-xl mx-auto px-6">
          <span className="inline-block text-[#1a4d2e] text-xs font-bold tracking-[0.15em] uppercase mb-2">Our Partner Farms</span>
          <h1 className="text-3xl sm:text-4xl font-black text-[#0a0a0a] mb-2 tracking-tight">
            Fresh From <span className="text-[#1a4d2e]">the Field</span>
          </h1>
          <p className="text-sm text-[#666]">
            Explore our network of premium produce farms.
          </p>
        </div>
      </section>

      {/* Brand Cards - Side by Side */}
      <section className="pb-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {brands.map((brand) => (
              <div 
                key={brand.slug} 
                className="brand-card tilt-3d group relative bg-white border border-[#e5e5e5] rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:border-[#d1d5db]"
              >
                {/* Accent bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${brand.gradient} rounded-t-2xl`} />
                
                <div className="flex items-start gap-4">
                  {/* Brand Initial Badge */}
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0 shadow-md"
                    style={{ backgroundColor: brand.color }}
                  >
                    {brand.name.split(' ').map(w => w[0]).join('')}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Location badge */}
                    <span 
                      className="inline-block text-[10px] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full mb-2"
                      style={{ 
                        color: brand.color, 
                        backgroundColor: brand.bg,
                        border: `1px solid ${brand.borderColor}`
                      }}
                    >
                      {brand.location}
                    </span>
                    
                    {/* Brand name */}
                    <h2 className="text-xl font-bold text-[#0a0a0a] mb-1">
                      {brand.name}
                    </h2>
                    
                    {/* Tagline */}
                    <p className="text-sm font-medium mb-2" style={{ color: brand.color }}>
                      {brand.tagline}
                    </p>
                    
                    {/* Description */}
                    <p className="text-xs text-[#666] leading-relaxed mb-4">
                      {brand.description}
                    </p>

                    {/* Stats - Compact */}
                    <div className="flex gap-4 mb-4">
                      <div>
                        <p className="text-lg font-bold" style={{ color: brand.color }}>24/7</p>
                        <p className="text-[10px] text-[#888] uppercase tracking-wider">Support</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold" style={{ color: brand.color }}>Same Day</p>
                        <p className="text-[10px] text-[#888] uppercase tracking-wider">Pickup</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold" style={{ color: brand.color }}>100%</p>
                        <p className="text-[10px] text-[#888] uppercase tracking-wider">Fresh</p>
                      </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex gap-2">
                      <Link 
                        href={`/${brand.slug}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-xs font-semibold transition-all hover:shadow-md"
                        style={{ backgroundColor: brand.color }}
                      >
                        Visit Store
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                      <Link 
                        href={`/${brand.slug}/stops`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#d1d5db] text-[#555] text-xs font-medium transition-all hover:border-[#1a4d2e] hover:text-[#1a4d2e]"
                      >
                        View Stops
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="footer">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-xs text-[#888]">
            <span>© 2024 Route Commerce</span>
            <div className="flex gap-4">
              <a href="/privacy-policy" className="hover:text-[#1a4d2e]">Privacy</a>
              <a href="/terms-and-conditions" className="hover:text-[#1a4d2e]">Terms</a>
              <a href="/contact" className="hover:text-[#1a4d2e]">Contact</a>
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
            linear-gradient(rgba(26, 77, 46, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(26, 77, 46, 0.02) 1px, transparent 1px);
          background-size: 40px 40px;
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
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .footer {
          position: relative;
          z-index: 50;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-top: 1px solid rgba(0, 0, 0, 0.05);
        }
      `}</style>
    </div>
  );
}