"use client";

import { motion } from "framer-motion";
import LayoutContainer from "@/components/layout/LayoutContainer";

const TEAM_MEMBERS = [
  { name: "Dan", role: "Owner", description: "Leading Indian River Direct with a vision for farm-to-table freshness" },
  { name: "Angela", role: "Office Manager", description: "Ensuring every order runs smoothly and customers are cared for" },
  { name: "Mariah", role: "Digital Marketing Manager", description: "Connecting our grove with families across the Mid-East" },
  { name: "Kenny", role: "Driver/Sales Associate", description: "Delivering fresh fruit directly to your neighborhood" },
  { name: "Exzavier", role: "Driver/Sales Associate", description: "Bringing the grove to your doorstep with care" },
  { name: "Jaime", role: "Driver/Sales Associate", description: "Your friendly stop coordinator in the field" },
  { name: "Ponce", role: "Driver/Sales Associate", description: "Ensuring quality delivery across the region" },
];

export default function IndianRiverTeamSection() {
  return (
    <section className="py-24 md:py-32 bg-stone-50 backdrop-blur-sm bg-white/50 relative overflow-hidden">
      {/* Subtle decorative elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-blue-900/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-blue-900/5 rounded-full blur-3xl" />
      </div>

      <LayoutContainer>
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
          className="text-center mb-16 relative"
        >
          <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 mb-4 block">
            The People
          </span>
          <h2 className="text-5xl md:text-6xl font-black tracking-tight text-stone-950 leading-tight">
            Meet the Team
          </h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {TEAM_MEMBERS.map((member, index) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 48 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                duration: 0.8,
                delay: index * 0.08,
                ease: [0.22, 0.61, 0.36, 1],
              }}
              className="backdrop-blur-md bg-white/80 border border-white/50 rounded-3xl shadow-xl shadow-stone-200/50 p-6 text-center group hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 mx-auto mb-4 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300">
                <span className="text-2xl font-bold text-white">{member.name[0]}</span>
              </div>
              <h3 className="font-bold text-stone-950 text-lg">{member.name}</h3>
              <p className="text-blue-600 text-sm font-semibold mt-1">{member.role}</p>
              <p className="text-stone-500 text-sm mt-3 leading-relaxed">{member.description}</p>
            </motion.div>
          ))}
        </div>
      </LayoutContainer>
    </section>
  );
}