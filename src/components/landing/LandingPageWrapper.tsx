"use client";

import React, { useState } from "react";

// ============================================
// HEADER COMPONENT
// ============================================
interface HeaderProps {
  className?: string;
}

export function Header({ className = "" }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Stats", href: "#stats" },
    { label: "Reviews", href: "#reviews" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 backdrop-blur-md bg-[#faf8f5]/90 border-b border-[#6b8f71]/20 shadow-sm ${className}`}
      style={{ scrollBehavior: "smooth" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a
            href="#"
            className="flex items-center gap-3 group"
            style={{ textDecoration: "none" }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-105"
              style={{ backgroundColor: "#1a4d2e" }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13 2L4.5 13.5H11.5L10.5 22L19 10.5H12L13 2Z"
                  fill="#faf8f5"
                  stroke="#faf8f5"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span
              className="text-xl font-semibold tracking-tight"
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                color: "#1a1a1a",
              }}
            >
              Route Commerce
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium transition-colors hover:opacity-70"
                style={{
                  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                  color: "#1a1a1a",
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="/login"
              className="text-sm font-medium transition-opacity hover:opacity-70"
              style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                color: "#1a4d2e",
              }}
            >
              Sign In
            </a>
            <a
              href="/admin"
              className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
              style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                background: "rgba(26, 77, 46, 0.9)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#faf8f5",
                boxShadow: "0 4px 16px rgba(26, 77, 46, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
              }}
            >
              Get Started
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ backgroundColor: "transparent" }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {mobileMenuOpen ? (
                <path
                  d="M6 18L18 6M6 6l12 12"
                  stroke="#1a1a1a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <path
                  d="M4 6h16M4 12h16M4 18h16"
                  stroke="#1a1a1a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div
            className="md:hidden py-4 border-t"
            style={{
              borderColor: "#6b8f71/20",
              backgroundColor: "#faf8f5",
            }}
          >
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="px-4 py-3 text-base font-medium rounded-lg transition-colors hover:bg-[#6b8f71]/10"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                    color: "#1a1a1a",
                  }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div
                className="flex flex-col gap-2 mt-2 pt-4 px-4"
                style={{ borderTop: "1px solid #6b8f71/20" }}
              >
                <a
                  href="/login"
                  className="py-3 text-base font-medium"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                    color: "#1a4d2e",
                  }}
                >
                  Sign In
                </a>
                <a
                  href="/admin"
                  className="py-3 rounded-full text-base font-semibold text-center"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                    background: "rgba(26, 77, 46, 0.9)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    color: "#faf8f5",
                    boxShadow: "0 4px 16px rgba(26, 77, 46, 0.2)",
                  }}
                >
                  Get Started
                </a>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

// ============================================
// FOOTER COMPONENT
// ============================================
interface FooterProps {
  className?: string;
}

export function Footer({ className = "" }: FooterProps) {
  const footerLinks = [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
    { label: "Contact", href: "#" },
  ];

  return (
    <footer
      className={`w-full py-8 border-t bg-[#faf8f5] ${className}`}
      style={{ borderColor: "#6b8f71/20" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo + Copyright */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#1a4d2e" }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13 2L4.5 13.5H11.5L10.5 22L19 10.5H12L13 2Z"
                  fill="#faf8f5"
                  stroke="#faf8f5"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span
              className="text-sm"
              style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                color: "#1a1a1a",
                opacity: 0.7,
              }}
            >
              © 2025 Route Commerce. All rights reserved.
            </span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6">
            {footerLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium transition-opacity hover:opacity-70"
                style={{
                  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                  color: "#6b8f71",
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// WRAPPER COMPONENT
// ============================================
interface SectionProps {
  children?: React.ReactNode;
}

interface WrapperProps {
  children?: React.ReactNode;
  className?: string;
}

export function LandingPageWrapper({ children, className = "" }: WrapperProps) {
  return (
    <>
      {/* Google Fonts Import */}
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap");
      `}</style>

      <div
        className={`min-h-screen flex flex-col ${className}`}
        style={{
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          scrollBehavior: "smooth",
        }}
      >
        <Header />

        {/* Main Content with Organic Background */}
        <main
          className="flex-1 relative overflow-hidden"
          style={{
            backgroundColor: "#faf8f5",
          }}
        >
          {/* Decorative organic shapes */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            {/* Top-right blob */}
            <div
              className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-30"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, #c97a3e20 0%, transparent 70%)",
                filter: "blur(40px)",
              }}
            />
            {/* Bottom-left blob */}
            <div
              className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full opacity-20"
              style={{
                background:
                  "radial-gradient(circle at 70% 70%, #6b8f7130 0%, transparent 70%)",
                filter: "blur(60px)",
              }}
            />
            {/* Center accent blob */}
            <div
              className="absolute top-1/3 left-1/4 w-72 h-72 rounded-full opacity-10"
              style={{
                background:
                  "radial-gradient(circle, #1a4d2e15 0%, transparent 70%)",
                filter: "blur(30px)",
              }}
            />
            {/* Organic shape 1 - leaf-like */}
            <svg
              className="absolute top-20 right-20 w-40 h-40 opacity-10"
              viewBox="0 0 100 100"
              fill="none"
            >
              <path
                d="M50 10 C70 30, 80 50, 70 80 C60 95, 40 95, 30 80 C20 50, 30 30, 50 10"
                fill="#1a4d2e"
              />
            </svg>
            {/* Organic shape 2 - wavy line */}
            <svg
              className="absolute bottom-32 left-10 w-60 h-20 opacity-10"
              viewBox="0 0 200 40"
              fill="none"
            >
              <path
                d="M0 20 Q25 0, 50 20 T100 20 T150 20 T200 20"
                stroke="#6b8f71"
                strokeWidth="2"
                fill="none"
              />
            </svg>
            {/* Organic shape 3 - circle cluster */}
            <svg
              className="absolute top-1/2 right-1/4 w-32 h-32 opacity-5"
              viewBox="0 0 100 100"
              fill="none"
            >
              <circle cx="50" cy="50" r="45" fill="#c97a3e" />
              <circle cx="35" cy="35" r="25" fill="#1a4d2e" />
              <circle cx="65" cy="60" r="20" fill="#6b8f71" />
            </svg>
          </div>

          {/* Content area */}
          <div className="relative z-10">{children}</div>
        </main>

        <Footer />
      </div>
    </>
  );
}

// ============================================
// UTILITY: Section Wrapper
// ============================================
export function Section({
  children,
  className = "",
  id,
}: {
  children?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`relative z-10 ${className}`}>
      {children}
    </section>
  );
}

// ============================================
// DEFAULT EXPORT: Complete Landing Page
// ============================================
export default function LandingPage({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <LandingPageWrapper>{children}</LandingPageWrapper>
  );
}