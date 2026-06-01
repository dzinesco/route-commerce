"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function HeroSection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap");

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes pulse-glow {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(201, 122, 62, 0.4);
          }
          50% {
            box-shadow: 0 0 20px 5px rgba(201, 122, 62, 0.2);
          }
        }

        @keyframes draw-path {
          from {
            stroke-dashoffset: 1000;
          }
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes bounce-down {
          0%,
          20%,
          50%,
          80%,
          100% {
            transform: translateY(0) translateX(-50%);
          }
          40% {
            transform: translateY(-8px) translateX(-50%);
          }
          60% {
            transform: translateY(-4px) translateX(-50%);
          }
        }

        @keyframes badge-enter {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(10px);
          }
          50% {
            transform: scale(1.05) translateY(-5px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
          opacity: 0;
        }

        .animate-fade-in-left {
          animation: fadeInLeft 0.9s ease-out forwards;
          opacity: 0;
        }

        .animate-fade-in-right {
          animation: fadeInRight 0.9s ease-out forwards;
          opacity: 0;
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float 6s ease-in-out infinite;
          animation-delay: -2s;
        }

        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }

        .animate-bounce-down {
          animation: bounce-down 2s ease-in-out infinite;
        }

        .animate-badge {
          animation: badge-enter 0.6s ease-out forwards;
          opacity: 0;
        }

        .path-animate {
          stroke-dasharray: 1000;
          animation: draw-path 2.5s ease-out forwards;
        }

        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-400 { animation-delay: 400ms; }
        .delay-500 { animation-delay: 500ms; }
        .delay-600 { animation-delay: 600ms; }
        .delay-700 { animation-delay: 700ms; }
        .delay-800 { animation-delay: 800ms; }

        .font-display {
          font-family: "Cormorant Garamond", Georgia, serif;
        }

        .text-gradient {
          background: linear-gradient(
            135deg,
            #1a4d2e 0%,
            #6b8f71 25%,
            #c97a3e 50%,
            #1a4d2e 75%,
            #1a4d2e 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient-shift 8s ease-in-out infinite;
        }

        @keyframes gradient-shift {
          0%,
          100% {
            background-position: 0% center;
          }
          50% {
            background-position: 100% center;
          }
        }

        .btn-primary {
          background: linear-gradient(135deg, #1a4d2e 0%, #2d6b42 100%);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .btn-primary::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          transition: left 0.5s ease;
        }

        .btn-primary:hover::before {
          left: 100%;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(26, 77, 46, 0.3);
        }

        .btn-secondary {
          border: 2px solid #1a4d2e;
          transition: all 0.3s ease;
        }

        .btn-secondary:hover {
          background: #1a4d2e;
          color: #faf8f5;
          transform: translateY(-2px);
        }

        .trust-card {
          backdrop-filter: blur(10px);
          background: rgba(250, 248, 245, 0.9);
          transition: all 0.3s ease;
        }

        .trust-card:hover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 15px 40px rgba(26, 77, 46, 0.15);
        }
      `}</style>

      <section
        className="min-h-screen relative overflow-hidden flex items-center"
        style={{ backgroundColor: "#faf8f5" }}
      >
        {/* Background Pattern - Subtle Grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(#1a4d2e 1px, transparent 1px),
              linear-gradient(90deg, #1a4d2e 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Decorative Elements */}
        <div
          className="absolute top-20 left-10 w-32 h-32 rounded-full opacity-10"
          style={{ backgroundColor: "#6b8f71" }}
        />
        <div
          className="absolute bottom-40 right-20 w-48 h-48 rounded-full opacity-5"
          style={{ backgroundColor: "#c97a3e" }}
        />

        <div className="container mx-auto px-6 lg:px-12 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column - Content */}
            <div className="space-y-8">
              {/* Animated Badge */}
              <div
                className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-full border animate-badge ${
                  mounted ? "delay-100" : ""
                }`}
                style={{
                  borderColor: "#c97a3e",
                  backgroundColor: "rgba(201, 122, 62, 0.08)",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: "#c97a3e" }}
                />
                <span
                  className="text-sm font-medium tracking-wide"
                  style={{ color: "#c97a3e" }}
                >
                  Farm-Fresh Delivery Platform
                </span>
              </div>

              {/* Main Headline */}
              <div className={mounted ? "animate-fade-in-up delay-200" : ""}>
                <h1
                  className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[0.95] tracking-tight"
                  style={{ color: "#1a1a1a" }}
                >
                  <span className="text-gradient">Harvest</span>
                  <br />
                  <span
                    className="text-gradient"
                    style={{ animationDelay: "0.5s" }}
                  >
                    Fresh Routes
                  </span>
                </h1>
              </div>

              {/* Subtext */}
              <p
                className={`text-lg sm:text-xl max-w-xl leading-relaxed ${
                  mounted ? "animate-fade-in-up" : ""
                }`}
                style={{
                  color: "#6b8f71",
                  animationDelay: mounted ? "400ms" : "0ms",
                }}
              >
                We connect produce farms with reliable trucking partners,
                ensuring your harvest reaches markets faster, fresher, and more
                efficiently than ever before.
              </p>

              {/* CTAs */}
              <div
                className={`flex flex-wrap gap-4 pt-4 ${mounted ? "animate-fade-in-up" : ""}`}
                style={{ animationDelay: mounted ? "500ms" : "0ms" }}
              >
                <Link 
                  href="/login" 
                  className="btn-primary inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white text-lg shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, rgba(26, 77, 46, 0.95) 0%, rgba(45, 107, 79, 0.95) 100%)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    boxShadow: "0 8px 32px rgba(26, 77, 46, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                  }}
                >
                  Start Your Route
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link 
                  href="/brands" 
                  className="btn-secondary inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg"
                  style={{
                    color: "#1a4d2e",
                    background: "rgba(250, 248, 245, 0.8)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(26, 77, 46, 0.3)",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                  }}
                >
                  Browse Farms
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div
                className={`flex flex-wrap gap-6 pt-6 ${
                  mounted ? "animate-fade-in-up" : ""
                }`}
                style={{ animationDelay: mounted ? "600ms" : "0ms" }}
              >
                {[
                  { stat: "500+", label: "Farm Brands" },
                  { stat: "98%", label: "On-Time" },
                  { stat: "50K+", label: "Deliveries" },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="trust-card rounded-2xl p-4 border"
                    style={{ borderColor: "rgba(107, 143, 113, 0.2)" }}
                  >
                    <div
                      className="font-display text-2xl sm:text-3xl font-bold"
                      style={{ color: "#1a4d2e" }}
                    >
                      {item.stat}
                    </div>
                    <div
                      className="text-sm font-medium"
                      style={{ color: "#6b8f71" }}
                    >
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Visual */}
            <div
              className={`relative lg:h-[600px] ${
                mounted ? "animate-fade-in-right" : ""
              }`}
              style={{ animationDelay: mounted ? "300ms" : "0ms" }}
            >
              {/* Main Visual Container */}
              <div className="relative h-full w-full">
                {/* SVG Map/Routes Visual */}
                <svg
                  viewBox="0 0 500 500"
                  className="w-full h-full"
                  style={{ maxHeight: "600px" }}
                >
                  {/* Background Map */}
                  <rect
                    x="50"
                    y="50"
                    width="400"
                    height="400"
                    rx="20"
                    fill="rgba(107, 143, 113, 0.08)"
                    stroke="rgba(107, 143, 113, 0.3)"
                    strokeWidth="1"
                  />

                  {/* Grid Lines */}
                  <g stroke="rgba(107, 143, 113, 0.15)" strokeWidth="0.5">
                    <line x1="50" y1="150" x2="450" y2="150" />
                    <line x1="50" y1="250" x2="450" y2="250" />
                    <line x1="50" y1="350" x2="450" y2="350" />
                    <line x1="150" y1="50" x2="150" y2="450" />
                    <line x1="250" y1="50" x2="250" y2="450" />
                    <line x1="350" y1="50" x2="350" y2="450" />
                  </g>

                  {/* Route Path */}
                  <path
                    d="M 100 380 Q 150 350, 180 280 T 250 200 Q 290 150, 350 120 T 400 100"
                    fill="none"
                    stroke="#c97a3e"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="1000"
                    className="path-animate"
                    style={{ animationDelay: "800ms" }}
                  />

                  {/* Secondary Route */}
                  <path
                    d="M 100 380 Q 200 420, 300 380 T 420 300"
                    fill="none"
                    stroke="#6b8f71"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="800"
                    className="path-animate"
                    style={{ animationDelay: "1200ms" }}
                    opacity="0.6"
                  />

                  {/* Farm Location */}
                  <g className="animate-fade-in-right" style={{ animationDelay: "1000ms" }}>
                    <circle
                      cx="100"
                      cy="380"
                      r="25"
                      fill="#1a4d2e"
                      opacity="0.2"
                    />
                    <circle
                      cx="100"
                      cy="380"
                      r="18"
                      fill="#1a4d2e"
                      opacity="0.4"
                    />
                    <circle cx="100" cy="380" r="10" fill="#1a4d2e" />
                    {/* Farm Icon */}
                    <path
                      d="M 100 372 L 100 388 M 95 377 L 100 372 L 105 377"
                      stroke="#faf8f5"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <text
                      x="100"
                      y="420"
                      textAnchor="middle"
                      fill="#1a4d2e"
                      fontSize="12"
                      fontWeight="600"
                    >
                      Farm Origin
                    </text>
                  </g>

                  {/* Distribution Hub */}
                  <g className="animate-fade-in-up" style={{ animationDelay: "1100ms" }}>
                    <circle
                      cx="250"
                      cy="200"
                      r="30"
                      fill="#c97a3e"
                      opacity="0.2"
                    />
                    <circle
                      cx="250"
                      cy="200"
                      r="22"
                      fill="#c97a3e"
                      opacity="0.4"
                    />
                    <circle cx="250" cy="200" r="14" fill="#c97a3e" />
                    {/* Hub Icon */}
                    <rect
                      x="243"
                      y="195"
                      width="14"
                      height="10"
                      fill="#faf8f5"
                      rx="2"
                    />
                    <text
                      x="250"
                      y="250"
                      textAnchor="middle"
                      fill="#c97a3e"
                      fontSize="12"
                      fontWeight="600"
                    >
                      Distribution Hub
                    </text>
                  </g>

                  {/* Stop Points */}
                  {[
                    { x: 180, y: 280, label: "Stop 1" },
                    { x: 350, y: 120, label: "Stop 2" },
                    { x: 400, y: 100, label: "Market" },
                  ].map((stop, i) => (
                    <g
                      key={i}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${1300 + i * 200}ms` }}
                    >
                      <circle
                        cx={stop.x}
                        cy={stop.y}
                        r="12"
                        fill="#faf8f5"
                        stroke="#6b8f71"
                        strokeWidth="2"
                      />
                      <circle
                        cx={stop.x}
                        cy={stop.y}
                        r="6"
                        fill="#6b8f71"
                      />
                      <text
                        x={stop.x}
                        y={stop.y + 28}
                        textAnchor="middle"
                        fill="#6b8f71"
                        fontSize="10"
                        fontWeight="500"
                      >
                        {stop.label}
                      </text>
                    </g>
                  ))}

                  {/* Decorative Trees/Fields */}
                  {([[80, 400], [420, 350], [70, 150], [430, 200], [150, 430], [380, 400]] as [number, number][]).map((coords, i) => (
                    <circle
                      key={i}
                      cx={coords[0]}
                      cy={coords[1]}
                      r="8"
                      fill="rgba(107, 143, 113, 0.4)"
                    />
                  ))}

                  {/* Compass Rose */}
                  <g transform="translate(420, 420)">
                    <circle
                      cx="0"
                      cy="0"
                      r="25"
                      fill="rgba(26, 77, 46, 0.1)"
                      stroke="#1a4d2e"
                      strokeWidth="1"
                    />
                    <path
                      d="M 0 -18 L 4 0 L 0 4 L -4 0 Z"
                      fill="#c97a3e"
                    />
                    <path
                      d="M 0 18 L 4 0 L 0 -4 L -4 0 Z"
                      fill="#6b8f71"
                    />
                    <text
                      x="0"
                      y="-22"
                      textAnchor="middle"
                      fill="#1a4d2e"
                      fontSize="10"
                      fontWeight="600"
                    >
                      N
                    </text>
                  </g>
                </svg>

                {/* Floating Stat Cards */}
                <div
                  className={`absolute top-8 -left-4 lg:left-8 animate-float ${
                    mounted ? "" : "opacity-0"
                  }`}
                  style={{ animationDelay: mounted ? "800ms" : "0ms" }}
                >
                  <div
                    className="animate-pulse-glow rounded-2xl p-4 shadow-xl border"
                    style={{
                      backgroundColor: "#faf8f5",
                      borderColor: "rgba(201, 122, 62, 0.3)",
                    }}
                  >
                    <div
                      className="text-2xl font-bold"
                      style={{ color: "#c97a3e" }}
                    >
                      2.4T
                    </div>
                    <div className="text-sm" style={{ color: "#6b8f71" }}>
                      Miles Saved
                    </div>
                  </div>
                </div>

                <div
                  className={`absolute bottom-16 -right-4 lg:right-12 animate-float-delayed ${
                    mounted ? "" : "opacity-0"
                  }`}
                  style={{ animationDelay: mounted ? "1000ms" : "0ms" }}
                >
                  <div
                    className="rounded-2xl p-4 shadow-xl border"
                    style={{
                      backgroundColor: "#faf8f5",
                      borderColor: "rgba(26, 77, 46, 0.3)",
                    }}
                  >
                    <div
                      className="text-2xl font-bold"
                      style={{ color: "#1a4d2e" }}
                    >
                      12hrs
                    </div>
                    <div className="text-sm" style={{ color: "#6b8f71" }}>
                      Avg Delivery
                    </div>
                  </div>
                </div>

                <div
                  className={`absolute top-1/2 -right-8 lg:-right-16 animate-float ${
                    mounted ? "" : "opacity-0"
                  }`}
                  style={{ animationDelay: mounted ? "1200ms" : "0ms" }}
                >
                  <div
                    className="rounded-2xl p-3 shadow-lg border"
                    style={{
                      backgroundColor: "rgba(107, 143, 113, 0.15)",
                      borderColor: "rgba(107, 143, 113, 0.4)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: "#1a4d2e" }}
                      />
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "#1a4d2e" }}
                      >
                        Live Tracking
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div
          className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 cursor-pointer ${
            mounted ? "animate-bounce-down" : "opacity-0"
          }`}
          style={{ animationDelay: mounted ? "1500ms" : "0ms" }}
          onClick={() =>
            window.scrollTo({
              top: window.innerHeight,
              behavior: "smooth",
            })
          }
        >
          <div
            className="flex flex-col items-center gap-2 px-4 py-2 rounded-full"
            style={{
              backgroundColor: "rgba(26, 77, 46, 0.1)",
              border: "1px solid rgba(26, 77, 46, 0.2)",
            }}
          >
            <span
              className="text-xs font-medium tracking-wider uppercase"
              style={{ color: "#1a4d2e" }}
            >
              Scroll
            </span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1a4d2e"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </div>
        </div>

        {/* Decorative Leaf Elements */}
        <svg
          className="absolute bottom-20 left-10 opacity-20"
          width="60"
          height="60"
          viewBox="0 0 60 60"
          fill="none"
        >
          <path
            d="M30 5 C45 15, 50 35, 30 55 C10 35, 15 15, 30 5"
            fill="#6b8f71"
          />
          <path d="M30 5 L30 55" stroke="#1a4d2e" strokeWidth="2" />
        </svg>

        <svg
          className="absolute top-32 right-20 opacity-20"
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
        >
          <path
            d="M20 3 C30 10, 33 23, 20 37 C7 23, 10 10, 20 3"
            fill="#c97a3e"
          />
          <path d="M20 3 L20 37" stroke="#1a4d2e" strokeWidth="1.5" />
        </svg>
      </section>
    </>
  );
}