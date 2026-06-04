"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  tabKey: string;
  children: React.ReactNode;
};

/**
 * Fades the content of a tabbed panel when the active tab changes.
 * The tab key drives the animation, so switching tabs triggers a quick
 * fade-in of the new content. No motion when the tab key is stable
 * (i.e. on first render of a given tab).
 */
export function TabSwitcher({ tabKey, children }: Props) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={tabKey}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
