"use client";

import { motion } from "framer-motion";
import LayoutContainer from "@/components/layout/LayoutContainer";

interface IndianRiverContactSectionProps {
  phone?: string | null;
  email?: string | null;
}

export default function IndianRiverContactSection({
  phone = "772-971-4484",
  email = "Info@indianriverdirect.com",
}: IndianRiverContactSectionProps) {
  return (
    <section className="py-24 md:py-32 bg-stone-950 text-white relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-blue-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-emerald-900/10 rounded-full blur-3xl" />
      </div>

      <LayoutContainer>
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
            className="text-center mb-16"
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-blue-400/60">
              Get in Touch
            </span>
            <h2 className="mt-4 text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
              Contact Us
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12 max-w-4xl mx-auto">
            {/* Phone */}
            <motion.div
              initial={{ opacity: 0, y: 48 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 0.61, 0.36, 1] }}
              className="text-center group"
            >
              <div className="w-16 h-16 backdrop-blur-md bg-stone-800/70 border border-stone-700/50 rounded-2xl bg-stone-800 flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-900 transition-colors">
                <svg
                  className="w-7 h-7 text-stone-400 group-hover:text-blue-400 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                  />
                </svg>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-3">Phone</p>
              <p className="text-stone-300">{phone}</p>
            </motion.div>

            {/* Email */}
            <motion.div
              initial={{ opacity: 0, y: 48 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
              className="text-center group"
            >
              <div className="w-16 h-16 backdrop-blur-md bg-stone-800/70 border border-stone-700/50 rounded-2xl bg-stone-800 flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-900 transition-colors">
                <svg
                  className="w-7 h-7 text-stone-400 group-hover:text-blue-400 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5A2.25 2.25 0 002.25 6.75m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-3">Email</p>
              <p className="text-stone-300">{email}</p>
            </motion.div>

            {/* Location */}
            <motion.div
              initial={{ opacity: 0, y: 48 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
              className="text-center group"
            >
              <div className="w-16 h-16 backdrop-blur-md bg-stone-800/70 border border-stone-700/50 rounded-2xl bg-stone-800 flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-900 transition-colors">
                <svg
                  className="w-7 h-7 text-stone-400 group-hover:text-blue-400 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                  />
                </svg>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-3">Location</p>
              <p className="text-stone-300">Indian River Region, Florida</p>
            </motion.div>
          </div>

          {/* Business Hours */}
          <motion.div
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
            className="mt-16 max-w-md mx-auto"
          >
            <div className="backdrop-blur-md bg-stone-800/80 border border-stone-700/50 rounded-2xl p-6">
              <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-4 text-center">
                Business Hours
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-stone-400">Monday – Friday</p>
                  <p className="text-stone-300 font-medium">8:00 AM – 5:00 PM</p>
                </div>
                <div>
                  <p className="text-stone-400">Saturday</p>
                  <p className="text-stone-300 font-medium">9:00 AM – 2:00 PM</p>
                </div>
                <div>
                  <p className="text-stone-400">Sunday</p>
                  <p className="text-stone-300 font-medium">Closed</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </LayoutContainer>
    </section>
  );
}