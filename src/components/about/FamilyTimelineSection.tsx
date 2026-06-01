"use client";

import { motion } from "framer-motion";
import LayoutContainer from "@/components/layout/LayoutContainer";

const FAMILY_MEMBERS = [
  {
    initials: "JH",
    name: "John Harold",
    role: "Founder",
    bio: "John Harold began selling Olathe's sweet corn directly from pickups in the 1970s. With unwavering dedication to community, family, and agriculture, he built Tuxedo Corn into a thriving family operation. Prior to farming, John established the first Group Home on the Western Slope and opened Colorow Care Center in Montrose County.",
    era: "1970s",
  },
  {
    initials: "DH",
    name: "David Harold",
    role: "Second Generation",
    bio: "David leads sustainability efforts across Harold farms, implementing drip irrigation and joining the Fair Food Program to ensure responsible labor practices. He continues the family's commitment to raising top-quality corn while protecting the land for future generations.",
    era: "Present",
  },
  {
    initials: "JW",
    name: "John William Harold",
    role: "Mexico Operations",
    bio: "John William has worked in Guaymas, Sonora, Mexico for over three decades growing sweet corn, onions, wheat, and vegetables. His international operations extend the Harold family farming tradition across borders.",
    era: "1990s–Present",
  },
  {
    initials: "JH",
    name: "Joseph Harold",
    role: "Third Generation",
    bio: "Joseph works at the corn shed during summer and handles photography and beverages, carrying the family tradition into the next generation while learning every aspect of the business.",
    era: "Present",
  },
];

// Family member card with hover effects
function FamilyCard({ member, index }: { member: typeof FAMILY_MEMBERS[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: index * 0.12, ease: [0.22, 0.61, 0.36, 1] }}
      whileHover={{ y: -6 }}
      className="group relative"
    >
      {/* Era badge */}
      <div className="absolute -top-3 -left-3 z-10">
        <span className="inline-block bg-stone-900 text-stone-200 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">
          {member.era}
        </span>
      </div>

      <div className="relative bg-gradient-to-b from-white to-stone-50 rounded-3xl p-8 shadow-lg shadow-black/5 ring-1 ring-stone-200/40 overflow-hidden h-full">
        {/* Decorative top line */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-emerald-400 to-amber-500 origin-left"
        />

        {/* Avatar */}
        <div className="mb-6 relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-stone-900 to-stone-800 flex items-center justify-center shadow-xl shadow-stone-900/30">
            <span className="text-2xl font-black text-white tracking-tight">{member.initials}</span>
          </div>
          {/* Decorative corner accent */}
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-600/20 rounded-full blur-sm" />
        </div>

        {/* Content */}
        <div>
          <h3 className="text-xl font-black text-stone-950 tracking-tight">{member.name}</h3>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-emerald-700">{member.role}</p>
          <p className="mt-4 text-sm leading-relaxed text-stone-600">{member.bio}</p>
        </div>

        {/* Bottom accent */}
        <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
      </div>
    </motion.div>
  );
}

export default function FamilyTimelineSection() {
  return (
    <section className="py-24 md:py-32 bg-stone-100 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,100,50,0.08)_0%,transparent_50%)]" />

      <LayoutContainer>
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
          className="text-center mb-20"
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-700">The People Behind the Corn</span>
          <h2 className="mt-4 text-4xl md:text-5xl font-black tracking-tight text-stone-950 leading-tight">
            The Harold Family
          </h2>
          <div className="mt-8 mx-auto h-px w-24 bg-gradient-to-r from-emerald-600 via-emerald-400 to-transparent" />
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {FAMILY_MEMBERS.map((member, index) => (
            <FamilyCard key={member.name} member={member} index={index} />
          ))}
        </div>
      </LayoutContainer>
    </section>
  );
}
