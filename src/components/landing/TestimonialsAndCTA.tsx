"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const testimonials = [
  {
    initials: "TC",
    name: "Tuxedo Corn Co.",
    location: "Olathe, Colorado",
    quote:
      "Route Commerce transformed how we manage our wholesale operations. Our pickup efficiency increased by 40% in the first month.",
  },
  {
    initials: "IR",
    name: "Indian River Citrus",
    location: "Indian River, Florida",
    quote:
      "The Harvest Reach feature alone has recovered thousands in abandoned cart revenue. Game changer for our business.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const,
    },
  },
};

const cardHoverVariants = {
  rest: { y: 0, boxShadow: "0 4px 24px rgba(26, 77, 46, 0.08)" },
  hover: {
    y: -4,
    boxShadow: "0 12px 40px rgba(26, 77, 46, 0.12)",
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

export default function TestimonialsAndCTA() {
  return (
    <>
      {/* ─── Testimonials Section ─────────────────────────────────────────────── */}
      <section
        style={{
          background: "linear-gradient(180deg, #faf8f5 0%, #f5f2ed 100%)",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {/* Decorative botanical accent */}
        <div
          style={{
            position: "absolute",
            left: "5%",
            top: "20%",
            width: "120px",
            height: "120px",
            opacity: 0.06,
            background: "radial-gradient(ellipse at center, #1a4d2e 0%, transparent 70%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />
        <div
          style={{
            position: "absolute",
            right: "8%",
            bottom: "15%",
            width: "80px",
            height: "80px",
            opacity: 0.05,
            background: "radial-gradient(ellipse at center, #c97a3e 0%, transparent 70%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-6xl px-6 py-24">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
            className="mb-16 text-center"
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#6b8f71",
                marginBottom: "12px",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              Testimonials
            </span>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
                fontWeight: 600,
                lineHeight: 1.1,
                color: "#1a1a1a",
                letterSpacing: "-0.02em",
              }}
            >
              Trusted by Farms
            </h2>
            <p
              style={{
                marginTop: "16px",
                fontSize: "1.125rem",
                color: "#555555",
                maxWidth: "480px",
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              Produce operations across the country rely on Route Commerce to power their farm-fresh distribution.
            </p>
          </motion.div>

          {/* Testimonial cards */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "24px",
              maxWidth: "800px",
              margin: "0 auto",
            }}
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                style={{
                  background: "linear-gradient(145deg, #ffffff 0%, #fdfcfa 100%)",
                  borderRadius: "20px",
                  padding: "32px",
                  border: "1px solid rgba(26, 77, 46, 0.08)",
                  position: "relative",
                  overflow: "hidden",
                }}
                whileHover="hover"
                initial="rest"
                animate="rest"
              >
                {/* Decorative quote mark */}
                <div
                  style={{
                    position: "absolute",
                    top: "-8px",
                    right: "20px",
                    fontSize: "80px",
                    fontFamily: "'Cormorant Garamond', serif",
                    color: "rgba(26, 77, 46, 0.06)",
                    lineHeight: 1,
                    pointerEvents: "none",
                  }}
                  aria-hidden="true"
                >
                  &ldquo;
                </div>

                {/* Avatar with gradient */}
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, #1a4d2e 0%, #6b8f71 50%, #c97a3e 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "20px",
                    boxShadow: "0 4px 12px rgba(26, 77, 46, 0.15)",
                  }}
                >
                  <span
                    style={{
                      color: "#ffffff",
                      fontSize: "1rem",
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                    }}
                  >
                    {testimonial.initials}
                  </span>
                </div>

                {/* Quote text */}
                <blockquote
                  style={{
                    fontSize: "1rem",
                    lineHeight: 1.7,
                    color: "#1a1a1a",
                    margin: 0,
                    marginBottom: "20px",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>

                {/* Attribution */}
                <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: "16px" }}>
                  <p
                    style={{
                      fontWeight: 700,
                      fontSize: "0.9375rem",
                      color: "#1a1a1a",
                      margin: 0,
                    }}
                  >
                    {testimonial.name}
                  </p>
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "#6b8f71",
                      margin: 0,
                      marginTop: "4px",
                      fontWeight: 500,
                    }}
                  >
                    {testimonial.location}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "40px",
              marginTop: "48px",
              flexWrap: "wrap",
            }}
          >
            {[
              { value: "200+", label: "Farms & Co-ops" },
              { value: "40%", label: "Avg. Efficiency Gain" },
              { value: "94%", label: "Customer Retention" },
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "2.5rem",
                    fontWeight: 600,
                    color: "#1a4d2e",
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: "0.8125rem",
                    color: "#6b8f71",
                    marginTop: "6px",
                    fontWeight: 500,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── CTA Section ──────────────────────────────────────────────────────── */}
      <section
        style={{
          background: "linear-gradient(180deg, #f5f2ed 0%, #faf8f5 50%, #faf8f5 100%)",
          position: "relative",
          overflow: "hidden",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {/* Decorative gradient orbs */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "10%",
            width: "300px",
            height: "300px",
            background: "radial-gradient(circle, rgba(26, 77, 46, 0.08) 0%, transparent 70%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />
        <div
          style={{
            position: "absolute",
            bottom: "0",
            right: "5%",
            width: "250px",
            height: "250px",
            background: "radial-gradient(circle, rgba(201, 122, 62, 0.06) 0%, transparent 70%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />

        {/* Botanical line decoration */}
        <svg
          style={{
            position: "absolute",
            top: "20px",
            right: "15%",
            width: "60px",
            height: "100px",
            opacity: 0.15,
          }}
          viewBox="0 0 60 100"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M30 100 C30 60, 10 50, 30 20 C50 50, 30 60, 30 100"
            stroke="#1a4d2e"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M30 70 C20 60, 15 55, 25 45"
            stroke="#1a4d2e"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M30 70 C40 60, 45 55, 35 45"
            stroke="#1a4d2e"
            strokeWidth="1.5"
            fill="none"
          />
          <circle cx="30" cy="15" r="3" fill="#6b8f71" />
          <circle cx="22" cy="42" r="2" fill="#c97a3e" />
          <circle cx="38" cy="42" r="2" fill="#c97a3e" />
        </svg>

        <div className="relative mx-auto max-w-4xl px-6 py-28 text-center">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
          >
            {/* Section label */}
            <span
              style={{
                display: "inline-block",
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#c97a3e",
                marginBottom: "16px",
                padding: "6px 14px",
                background: "rgba(201, 122, 62, 0.1)",
                borderRadius: "20px",
              }}
            >
              Get Started Today
            </span>

            {/* Headline */}
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(2.75rem, 6vw, 4rem)",
                fontWeight: 600,
                lineHeight: 1.1,
                color: "#1a1a1a",
                letterSpacing: "-0.02em",
                marginBottom: "20px",
              }}
            >
              Ready to Grow Your Routes?
            </h2>

            {/* Subtitle */}
            <p
              style={{
                fontSize: "1.125rem",
                lineHeight: 1.7,
                color: "#555555",
                maxWidth: "560px",
                margin: "0 auto 36px",
              }}
            >
              Join hundreds of produce brands who trust Route Commerce to power their farm-fresh operations.
            </p>

            {/* CTA Buttons */}
            <div
              style={{
                display: "flex",
                gap: "16px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              {/* Primary button */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Link
                  href="/admin"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "16px 32px",
                    background: "rgba(26, 77, 46, 0.9)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "1px solid rgba(255, 255, 255, 0.25)",
                    color: "#ffffff",
                    fontSize: "1rem",
                    fontWeight: 600,
                    borderRadius: "12px",
                    cursor: "pointer",
                    textDecoration: "none",
                    boxShadow: "0 8px 32px rgba(26, 77, 46, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 rgba(0, 0, 0, 0.1)",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(45, 107, 79, 0.95)";
                    e.currentTarget.style.boxShadow = "0 12px 40px rgba(26, 77, 46, 0.45), inset 0 1px 0 rgba(255,255,255, 0.2)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255, 0.35)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(26, 77, 46, 0.9)";
                    e.currentTarget.style.boxShadow = "0 8px 32px rgba(26, 77, 46, 0.35), inset 0 1px 0 rgba(255,255,255, 0.15), inset 0 -1px 0 rgba(0, 0, 0, 0.1)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255, 0.25)";
                  }}
                >
                  Start Free Trial
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>
              </motion.div>

              {/* Secondary button */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Link
                  href="/brands"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "16px 32px",
                    background: "rgba(250, 248, 245, 0.8)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "1px solid rgba(26, 77, 46, 0.2)",
                    color: "#1a4d2e",
                    fontSize: "1rem",
                    fontWeight: 600,
                    borderRadius: "12px",
                    cursor: "pointer",
                    textDecoration: "none",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
                    e.currentTarget.style.borderColor = "rgba(26, 77, 46, 0.4)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(26, 77, 46, 0.12), inset 0 1px 0 rgba(255,255,255, 0.6)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(250, 248, 245, 0.8)";
                    e.currentTarget.style.borderColor = "rgba(26, 77, 46, 0.2)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  View Farms
                </Link>
              </motion.div>
            </div>

            {/* Disclaimer */}
            <p
              style={{
                marginTop: "24px",
                fontSize: "0.8125rem",
                color: "#888888",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ opacity: 0.6 }}
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              No credit card required · 14-day free trial · Cancel anytime
            </p>
          </motion.div>

          {/* Bottom decorative element */}
          <div
            style={{
              marginTop: "60px",
              display: "flex",
              justifyContent: "center",
              gap: "8px",
              opacity: 0.3,
            }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  width: i === 2 ? "24px" : "6px",
                  height: "6px",
                  borderRadius: "3px",
                  background: i === 2 ? "#1a4d2e" : "#1a4d2e",
                  opacity: i === 2 ? 1 : 0.4,
                }}
              />
            ))}
          </div>
        </div>
      </section>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes pulse-soft {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }

        /* Scroll-triggered animations */
        section {
          scroll-margin-top: 80px;
        }

        /* Ensure smooth transitions */
        a, button {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </>
  );
}
