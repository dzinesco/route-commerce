"use client";

import { useEffect, useRef, useState } from "react";

import { ReactElement } from "react";

interface Feature {
  icon: ReactElement;
  title: string;
  description: string;
  bgColor: string;
  borderColor: string;
  hoverBg: string;
}

interface Stat {
  prefix: string;
  number: number;
  suffix: string;
  label: string;
}

const features: Feature[] = [
  {
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    title: "Product Catalogs",
    description:
      "Showcase your seasonal produce with rich media galleries, detailed specs, and real-time availability updates.",
    bgColor: "#f0f5f1",
    borderColor: "#6b8f71",
    hoverBg: "#e8f0e9",
  },
  {
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
    ),
    title: "Route Planning",
    description:
      "Optimize delivery routes across your farm network with intelligent mapping and scheduling tools.",
    bgColor: "#fdf6f0",
    borderColor: "#c97a3e",
    hoverBg: "#fbeeda",
  },
  {
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
    title: "Order Management",
    description:
      "Track orders from placement through delivery with automated status updates and seamless integrations.",
    bgColor: "#f5f0f8",
    borderColor: "#7a5c9e",
    hoverBg: "#ece6f5",
  },
  {
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3h18v18H3zM21 9H3M9 21V9" />
      </svg>
    ),
    title: "Wholesale Portal",
    description:
      "Give buyers a dedicated space to browse pricing, request quotes, and place bulk orders on their schedule.",
    bgColor: "#f0f5f5",
    borderColor: "#5c8a8f",
    hoverBg: "#e5f0f2",
  },
  {
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
    title: "Harvest Reach",
    description:
      "Send email and SMS campaigns that keep buyers informed about seasonal availability and new harvests.",
    bgColor: "#faf5f0",
    borderColor: "#c97a3e",
    hoverBg: "#f5ebe0",
  },
  {
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    title: "Smart Analytics",
    description:
      "Uncover sales trends, buyer behavior, and operational insights with real-time dashboards and reports.",
    bgColor: "#f5f8f0",
    borderColor: "#6b8f71",
    hoverBg: "#eaf3e5",
  },
];

const stats: Stat[] = [
  { prefix: "", number: 500, suffix: "+", label: "Produce Brands" },
  { prefix: "", number: 50000, suffix: "+", label: "Orders Delivered" },
  { prefix: "", number: 98, suffix: "%", label: "On-Time Delivery" },
  { prefix: "$", number: 2, suffix: "M+", label: "Weekly Sales" },
];

export default function FeaturesAndStats() {
  const [countersStarted, setCountersStarted] = useState(false);
  const [counters, setCounters] = useState(stats.map(() => 0));
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !countersStarted) {
          setCountersStarted(true);
        }
      },
      { threshold: 0.3 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, [countersStarted]);

  useEffect(() => {
    if (!countersStarted) return;

    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;

      const easeOut = 1 - Math.pow(1 - progress, 3);

      setCounters(
        stats.map((stat) => {
          if (stat.number >= 1000) {
            return Math.floor(stat.number * easeOut);
          } else if (stat.number >= 100) {
            return Math.floor(stat.number * easeOut);
          } else if (stat.number >= 10) {
            return Math.floor(stat.number * easeOut);
          } else {
            return Math.floor(stat.number * easeOut);
          }
        })
      );

      if (step >= steps) {
        clearInterval(timer);
        setCounters(stats.map((stat) => stat.number));
      }
    }, interval);

    return () => clearInterval(timer);
  }, [countersStarted]);

  return (
    <div
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: "#faf8f5",
        color: "#1a1a1a",
        minHeight: "100vh",
      }}
    >
      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap");

        :global(body) {
          margin: 0;
          padding: 0;
        }

        .section-label {
          font-family: "Plus Jakarta Sans", sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #c97a3e;
          margin-bottom: 0.75rem;
        }

        .section-title {
          font-family: "Cormorant Garamond", serif;
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 600;
          color: #1a4d2e;
          line-height: 1.15;
          margin-bottom: 1rem;
        }

        .section-subtitle {
          font-family: "Plus Jakarta Sans", sans-serif;
          font-size: 1.125rem;
          color: #4a4a4a;
          line-height: 1.6;
          max-width: 540px;
        }

        .feature-card {
          border-radius: 16px;
          padding: 2rem;
          border: 1px solid transparent;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: default;
          opacity: 0;
          transform: translateY(24px);
          animation: fadeInUp 0.6s ease forwards;
        }

        .feature-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
        }

        .feature-icon {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
          transition: transform 0.3s ease;
        }

        .feature-card:hover .feature-icon {
          transform: scale(1.05);
        }

        .feature-title {
          font-family: "Cormorant Garamond", serif;
          font-size: 1.375rem;
          font-weight: 600;
          color: #1a4d2e;
          margin-bottom: 0.625rem;
          line-height: 1.3;
        }

        .feature-description {
          font-size: 0.9375rem;
          color: #555;
          line-height: 1.65;
        }

        .stat-block {
          text-align: center;
          opacity: 0;
          transform: translateY(20px);
          animation: fadeInUp 0.5s ease forwards;
        }

        .stat-number {
          font-family: "Cormorant Garamond", serif;
          font-size: clamp(2.5rem, 5vw, 4rem);
          font-weight: 700;
          color: #1a4d2e;
          line-height: 1;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 0.9375rem;
          color: #6b8f71;
          font-weight: 500;
          letter-spacing: 0.02em;
        }

        .stats-divider {
          width: 1px;
          background: linear-gradient(
            to bottom,
            transparent,
            #c97a3e40,
            transparent
          );
          align-self: stretch;
          margin: 0.1rem 0;
        }

        .section-divider {
          width: 48px;
          height: 2px;
          background: linear-gradient(
            to right,
            #c97a3e,
            #1a4d2e
          );
          border-radius: 1px;
          margin: 0;
        }

        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-24px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(24px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-left {
          animation: slideInLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-right {
          animation: slideInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-scale {
          animation: scaleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .stagger-1 { animation-delay: 0.1s; }
        .stagger-2 { animation-delay: 0.2s; }
        .stagger-3 { animation-delay: 0.3s; }
        .stagger-4 { animation-delay: 0.4s; }
        .stagger-5 { animation-delay: 0.5s; }
        .stagger-6 { animation-delay: 0.6s; }

        .stat-stagger-1 { animation-delay: 0.15s; }
        .stat-stagger-2 { animation-delay: 0.3s; }
        .stat-stagger-3 { animation-delay: 0.45s; }
        .stat-stagger-4 { animation-delay: 0.6s; }
      `}</style>

      {/* ─── FEATURES SECTION ─── */}
      <section
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "6rem 1.5rem",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            marginBottom: "4rem",
          }}
        >
          <div
            className="animate-scale"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span className="section-label" style={{ marginBottom: "0.75rem" }}>
              Platform Features
            </span>
            <div className="section-divider" style={{ marginBottom: "1.25rem" }} />
            <h2 className="section-title" style={{ marginBottom: "1rem" }}>
              Everything You Need
            </h2>
            <p
              className="section-subtitle"
              style={{
                maxWidth: "520px",
                marginBottom: "0",
                color: "#5a5a5a",
                fontSize: "1.0625rem",
              }}
            >
              From farm to table, manage your entire produce supply chain in one
              place.
            </p>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {features.map((feature, index) => (
            <div
              key={index}
              className={`feature-card stagger-${index + 1}`}
              style={{
                backgroundColor: feature.bgColor,
                borderColor: `rgba(${index % 2 === 0 ? "107,143,113" : "201,122,62"}, 0.15)`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = feature.hoverBg;
                e.currentTarget.style.borderColor = feature.borderColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = feature.bgColor;
                e.currentTarget.style.borderColor = `rgba(${
                  index % 2 === 0 ? "107,143,113" : "201,122,62"
                }, 0.15)`;
              }}
            >
              <div
                className="feature-icon"
                style={{
                  background: `linear-gradient(135deg, ${feature.borderColor}18, ${feature.borderColor}10)`,
                  color: feature.borderColor,
                  border: `1px solid ${feature.borderColor}20`,
                }}
              >
                {feature.icon}
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── STATS SECTION ─── */}
      <section
        ref={statsRef}
        style={{
          background: "#1a4d2e",
          padding: "5rem 1.5rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle background pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.04,
            backgroundImage:
              "radial-gradient(circle at 25% 25%, #faf8f5 1px, transparent 1px), radial-gradient(circle at 75% 75%, #faf8f5 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Decorative top line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background:
              "linear-gradient(to right, #c97a3e, #faf8f5, #c97a3e)",
          }}
        />

        <div
          style={{
            maxWidth: "1000px",
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <span
              style={{
                display: "block",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#c97a3e",
                marginBottom: "0.75rem",
              }}
            >
              Our Reach
            </span>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(2rem, 4vw, 2.75rem)",
                fontWeight: 600,
                color: "#faf8f5",
                lineHeight: 1.2,
                margin: "0 0 0.75rem",
              }}
            >
              Growing Together
            </h2>
            <div
              style={{
                width: "48px",
                height: "2px",
                background: "linear-gradient(to right, transparent, #c97a3e, transparent)",
                borderRadius: "1px",
                margin: "0 auto",
              }}
            />
          </div>

          {/* Stats Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "1rem",
              alignItems: "center",
            }}
          >
            {stats.map((stat, index) => (
              <div
                key={index}
                className={`stat-block stat-stagger-${index + 1}`}
              >
                <div
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "clamp(2.25rem, 4.5vw, 3.75rem)",
                    fontWeight: 700,
                    color: "#faf8f5",
                    lineHeight: 1,
                    marginBottom: "0.5rem",
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "center",
                    gap: "0.1em",
                  }}
                >
                  {stat.prefix && (
                    <span
                      style={{
                        fontSize: "0.55em",
                        fontWeight: 500,
                        color: "#c97a3e",
                        marginRight: "0.05em",
                      }}
                    >
                      {stat.prefix}
                    </span>
                  )}
                  <span>
                    {counters[index].toLocaleString()}
                  </span>
                  <span
                    style={{
                      fontSize: "0.55em",
                      fontWeight: 500,
                      color: "#c97a3e",
                      marginLeft: "0.05em",
                    }}
                  >
                    {stat.suffix}
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "#6b8f71",
                    letterSpacing: "0.02em",
                    margin: 0,
                  }}
                >
                  {stat.label}
                </p>

                {/* Divider between stats */}
                {index < stats.length - 1 && (
                  <div
                    style={{
                      display: "none",
                    }}
                    className="stats-divider"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}