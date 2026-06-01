"use client";

import { motion } from "framer-motion";
import LayoutContainer from "@/components/layout/LayoutContainer";

// Custom checkmark icon with blue styling
function CustomCheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-6 h-6"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1" />
      <path
        d="M7 13L10 16L17 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const VALUES = [
  {
    title: "Farm Ownership",
    description: "We own and operate Fort B Groves, giving us complete control over quality from seed to delivery.",
  },
  {
    title: "Hand-Picked Freshness",
    description: "Every piece of fruit is hand-picked at peak ripeness, never machine-harvested.",
  },
  {
    title: "Direct to You",
    description: "Our trucks deliver straight from the grove, skipping distribution centers and store shelves.",
  },
  {
    title: "Quality Guaranteed",
    description: "Each box meets our strict quality standards before it leaves our farm.",
  },
];

export default function IndianRiverValuesSection() {
  return (
    <section className="py-24 md:py-32 bg-white backdrop-blur-sm bg-white/70 relative overflow-hidden">
      {/* Subtle decorative elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/3 left-0 w-64 h-64 bg-blue-900/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-0 w-64 h-64 bg-blue-900/5 rounded-full blur-3xl" />
      </div>

      <LayoutContainer>
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
          className="mx-auto max-w-2xl text-center mb-16 relative"
        >
          <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 mb-4 block">
            Why Choose Us
          </span>
          <h2 className="text-5xl md:text-6xl font-black tracking-tight text-stone-950 leading-tight">
            What Sets Us Apart
          </h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          {VALUES.map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 48 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                duration: 0.8,
                delay: index * 0.1,
                ease: [0.22, 0.61, 0.36, 1],
              }}
              className="backdrop-blur-md bg-white/70 border border-white/50 rounded-3xl shadow-xl shadow-stone-200/50 p-8 flex items-start gap-5 group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                <CustomCheckIcon />
              </div>
              <div>
                <h3 className="font-bold text-stone-950 text-lg">{value.title}</h3>
                <p className="text-stone-600 text-sm mt-2 leading-relaxed">{value.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </LayoutContainer>
    </section>
  );
}