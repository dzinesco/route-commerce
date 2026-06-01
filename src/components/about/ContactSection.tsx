"use client";

import { motion } from "framer-motion";
import LayoutContainer from "@/components/layout/LayoutContainer";

interface ContactSectionProps {
  address: string;
}

export default function ContactSection({ address }: ContactSectionProps) {
  return (
    <section className="py-24 md:py-32 bg-stone-950 text-white relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-emerald-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-amber-900/10 rounded-full blur-3xl" />
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
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-400/60">Get in Touch</span>
            <h2 className="mt-4 text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
              Visit Our Farm
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 48 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 0.61, 0.36, 1] }}
              className="text-center group"
            >
              <div className="w-16 h-16 rounded-2xl bg-stone-800 flex items-center justify-center mx-auto mb-6 group-hover:bg-emerald-900 transition-colors">
                <svg className="w-7 h-7 text-stone-400 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-3">Address</p>
              <p className="text-stone-300 leading-relaxed">{address}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 48 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
              className="text-center group"
            >
              <div className="w-16 h-16 rounded-2xl bg-stone-800 flex items-center justify-center mx-auto mb-6 group-hover:bg-emerald-900 transition-colors">
                <svg className="w-7 h-7 text-stone-400 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-3">Phone</p>
              <p className="text-stone-300">Shipping: 970-323-5631</p>
              <p className="text-stone-300 mt-1">Office: 970-323-6874</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 48 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
              className="text-center group"
            >
              <div className="w-16 h-16 rounded-2xl bg-stone-800 flex items-center justify-center mx-auto mb-6 group-hover:bg-emerald-900 transition-colors">
                <svg className="w-7 h-7 text-stone-400 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-3">Hours</p>
              <p className="text-stone-300">M–F: 7AM–6PM</p>
              <p className="text-stone-300 mt-1">Sat & Sun: 8AM–2PM</p>
            </motion.div>
          </div>
        </div>
      </LayoutContainer>
    </section>
  );
}
