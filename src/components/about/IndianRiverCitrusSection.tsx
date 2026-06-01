"use client";

import { motion } from "framer-motion";
import LayoutContainer from "@/components/layout/LayoutContainer";

// Custom SVG Icons for Citrus Varieties
function NavelOrangeIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-12 h-12"
      aria-hidden="true"
    >
      {/* Orange body */}
      <ellipse cx="24" cy="26" rx="18" ry="17" fill="currentColor" opacity="0.15" />
      <ellipse cx="24" cy="26" rx="18" ry="17" stroke="currentColor" strokeWidth="1.2" />
      
      {/* Navel (belly button) */}
      <circle cx="24" cy="34" r="3" fill="currentColor" opacity="0.4" />
      <circle cx="24" cy="34" r="3" stroke="currentColor" strokeWidth="1" />
      
      {/* Stem */}
      <path
        d="M24 9 C24 9 22 6 24 4 C26 6 27 7 24 9Z"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="currentColor"
        opacity="0.6"
      />
      <path d="M24 9 L24 12" stroke="currentColor" strokeWidth="1.2" />
      
      {/* Highlight */}
      <ellipse cx="18" cy="20" rx="4" ry="3" fill="currentColor" opacity="0.1" />
      
      {/* Texture dots */}
      <circle cx="16" cy="26" r="0.8" fill="currentColor" opacity="0.2" />
      <circle cx="32" cy="24" r="0.8" fill="currentColor" opacity="0.2" />
      <circle cx="20" cy="32" r="0.8" fill="currentColor" opacity="0.2" />
      <circle cx="28" cy="30" r="0.8" fill="currentColor" opacity="0.2" />
      
      {/* Juice droplets */}
      <path d="M14 40 Q15 42 14 44 Q13 42 14 40Z" fill="currentColor" opacity="0.3" />
      <path d="M34 42 Q35 44 34 46 Q33 44 34 42Z" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

function TangerineIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-12 h-12"
      aria-hidden="true"
    >
      {/* Tangerine body - slightly flatter */}
      <ellipse cx="24" cy="26" rx="17" ry="16" fill="currentColor" opacity="0.15" />
      <ellipse cx="24" cy="26" rx="17" ry="16" stroke="currentColor" strokeWidth="1.2" />
      
      {/* Segment lines */}
      <path d="M24 10 Q24 26 24 42" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
      <path d="M7 26 Q24 26 41 26" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
      <path d="M11 16 Q24 22 37 32" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
      <path d="M11 36 Q24 30 37 16" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
      
      {/* Easy peel indication - slightly separated skin line at top */}
      <path
        d="M12 12 Q24 8 36 12"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeDasharray="2 2"
        opacity="0.5"
      />
      
      {/* Stem */}
      <path d="M24 10 L24 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M20 7 Q24 5 28 7"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
      />
      
      {/* Leaf */}
      <path
        d="M28 6 Q32 4 34 8 Q30 10 28 6Z"
        fill="currentColor"
        opacity="0.5"
        stroke="currentColor"
        strokeWidth="0.5"
      />
      
      {/* Highlight */}
      <ellipse cx="17" cy="22" rx="5" ry="4" fill="currentColor" opacity="0.1" />
    </svg>
  );
}

function GrapefruitIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-12 h-12"
      aria-hidden="true"
    >
      {/* Grapefruit body - larger, darker */}
      <ellipse cx="24" cy="26" rx="19" ry="18" fill="currentColor" opacity="0.15" />
      <ellipse cx="24" cy="26" rx="19" ry="18" stroke="currentColor" strokeWidth="1.2" />
      
      {/* Section lines - more prominent for grapefruit */}
      <path d="M24 8 Q24 26 24 44" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      <path d="M5 26 Q24 26 43 26" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      <path d="M9 15 Q24 22 39 35" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
      <path d="M9 37 Q24 30 39 15" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
      
      {/* Inner segments suggestion */}
      <path d="M13 20 Q20 23 27 20" stroke="currentColor" strokeWidth="0.4" opacity="0.25" />
      <path d="M13 32 Q20 29 27 32" stroke="currentColor" strokeWidth="0.4" opacity="0.25" />
      
 {/* Stem with leaf */}
      <path d="M24 8 L24 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse
        cx="27"
        cy="6"
        rx="5"
        ry="3"
        transform="rotate(30 27 6)"
        fill="currentColor"
        opacity="0.4"
        stroke="currentColor"
        strokeWidth="0.5"
      />
      
      {/* Highlight - subtle */}
      <ellipse cx="16" cy="19" rx="5" ry="4" fill="currentColor" opacity="0.08" />
      
      {/* Bottom texture */}
      <circle cx="20" cy="36" r="0.6" fill="currentColor" opacity="0.15" />
      <circle cx="28" cy="38" r="0.6" fill="currentColor" opacity="0.15" />
    </svg>
  );
}

const CITRUS_VARIETIES = [
  {
    name: "Navel Oranges",
    description: "Sweet and juicy, perfect for eating or juicing",
    icon: NavelOrangeIcon,
  },
  {
    name: "Tangerines",
    description: "Easy-to-peel and bursting with flavor",
    icon: TangerineIcon,
  },
  {
    name: "Grapefruits",
    description: "Bold and tangy, a morning favorite",
    icon: GrapefruitIcon,
  },
];

export default function IndianRiverCitrusSection() {
  return (
    <section className="py-24 md:py-32 bg-white relative overflow-hidden">
      <LayoutContainer>
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
          className="mx-auto max-w-2xl text-center mb-16"
        >
          <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 mb-4 block">
            Our Products
          </span>
          <h2 className="text-5xl md:text-6xl font-black tracking-tight text-stone-950 leading-tight">
            The Fruits of Our Labor
          </h2>
          <p className="mt-6 text-stone-700 leading-relaxed text-lg">
            We are continuously striving for excellence, refining our practices to bring you the best citrus possible. For years, our fruits have been enjoyed by families across the Mid-East — from our sweet navel oranges and easy-to-peel tangerines, to our bold, tangy grapefruits.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
          {CITRUS_VARIETIES.map((citrus, index) => (
            <motion.div
              key={citrus.name}
              initial={{ opacity: 0, y: 48 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                duration: 0.8,
                delay: index * 0.1,
                ease: [0.22, 0.61, 0.36, 1],
              }}
              className="backdrop-blur-md bg-blue-50/70 border border-blue-200/50 rounded-3xl p-8 shadow-xl shadow-blue-200/50 text-center hover:shadow-md hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-20 h-20 rounded-2xl bg-white ring-1 ring-blue-100 flex items-center justify-center mx-auto mb-6 text-blue-500">
                <citrus.icon />
              </div>
              <h3 className="text-lg font-bold text-stone-950">{citrus.name}</h3>
              <p className="text-stone-600 text-sm mt-2 leading-relaxed">
                {citrus.description}
              </p>
            </motion.div>
          ))}
        </div>
      </LayoutContainer>
    </section>
  );
}
