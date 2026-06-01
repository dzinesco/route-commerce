"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";

type ProductCardProps = {
  id: string;
  name: string;
  description?: string | null;
  price: string;
  type: string;
  imageUrl?: string | null;
  brandSlug?: string;
  brandName?: string;
  brandId?: string;
  brandAccent?: "green" | "orange" | "blue";
  is_taxable?: boolean;
  pickup_type?: "scheduled_stop" | "shed";
  olatheSweetLogoUrlDark?: string | null;
  badge?: "best-seller" | "new" | "limited" | "organic";
  inStock?: boolean;
};

type FulfillmentChoice = "pickup" | "ship";

// Loading skeleton component
function ImageSkeleton() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-stone-100 via-stone-50 to-stone-100">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-stone-200/60 to-transparent" />
    </div>
  );
}

// Badge component
function Badge({ type }: { type: "best-seller" | "new" | "limited" | "organic" }) {
  const badgeConfig = {
    "best-seller": {
      label: "Best Seller",
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
    },
    "new": {
      label: "New",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
    },
    "limited": {
      label: "Limited",
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-200",
    },
    "organic": {
      label: "Organic",
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
    },
  };

  const config = badgeConfig[type];

  return (
    <span className={`rounded-full ${config.bg} border ${config.border} px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${config.text}`}>
      {config.label}
    </span>
  );
}

function FulfilmentModal({
  name,
  onChoice,
  onCancel,
}: {
  name: string;
  onChoice: (choice: FulfillmentChoice) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl"
      >
        <h3 className="text-xl font-bold text-stone-950 tracking-tight">
          How would you like to receive {name}?
        </h3>
        <p className="mt-2 text-sm text-stone-500">Choose your preferred fulfillment method.</p>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => onChoice("pickup")}
            className="w-full rounded-2xl border border-stone-200 bg-white px-5 py-5 text-left hover:bg-stone-50 transition-colors group flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-stone-950">Pick up at a stop</p>
              <p className="mt-1 text-sm text-stone-500">Collect at a local delivery stop</p>
            </div>
            <svg className="h-5 w-5 text-stone-300 group-hover:text-stone-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => onChoice("ship")}
            className="w-full rounded-2xl border border-stone-200 bg-white px-5 py-5 text-left hover:bg-stone-50 transition-colors group flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-stone-950">Ship to my door</p>
              <p className="mt-1 text-sm text-stone-500">Cooler boxes shipped after season ends</p>
            </div>
            <svg className="h-5 w-5 text-stone-300 group-hover:text-stone-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <button onClick={onCancel} className="mt-5 w-full text-center text-sm text-stone-400 hover:text-stone-700 transition-colors">
          Cancel
        </button>
      </motion.div>
    </div>
  );
}

export default function ProductCard({
  id, name, description, price, type, imageUrl,
  brandSlug, brandName, brandId,
  brandAccent = "green",
  is_taxable = true,
  pickup_type = "scheduled_stop",
  badge,
  inStock = true,
}: ProductCardProps) {
  const { addToCart } = useCart();
  const [showChoice, setShowChoice] = useState(false);
  const [added, setAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [buttonScale, setButtonScale] = useState(1);

  const isPickupOnly = type === "Pickup";
  const isShippingOnly = type === "Shipping";
  const isBoth = type === "Pickup & Shipping";

  function handleAddToCart() {
    const baseItem = { id, name, price, brand_id: brandId ?? "", brand_slug: brandSlug ?? "", is_taxable, pickup_type, description: description ?? "" };
    if (isPickupOnly || isShippingOnly) {
      addToCart(baseItem, isPickupOnly ? "pickup" : "ship");
      triggerAdded();
    } else if (isBoth) {
      setShowChoice(true);
    }
  }

  function handleChoice(choice: FulfillmentChoice) {
    setShowChoice(false);
    const baseItem = { id, name, price, brand_id: brandId ?? "", brand_slug: brandSlug ?? "", is_taxable, pickup_type, description: description ?? "" };
    addToCart(baseItem, choice);
    triggerAdded();
  }

  function triggerAdded() {
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleButtonPress() {
    setButtonScale(0.92);
  }

  function handleButtonRelease() {
    setButtonScale(1);
  }

  return (
    <>
      <AnimatePresence>
        {showChoice && (
          <FulfilmentModal name={name} onChoice={handleChoice} onCancel={() => setShowChoice(false)} />
        )}
      </AnimatePresence>

      <motion.div
        className="group relative flex flex-col bg-white rounded-3xl overflow-hidden ring-1 ring-stone-200/60 transition-shadow duration-300 hover:ring-stone-300 hover:shadow-xl hover:shadow-black/8"
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Image Container */}
        <div className="relative overflow-hidden bg-stone-100" style={{ height: "17rem" }}>
          {/* Loading skeleton */}
          {isLoading && <ImageSkeleton />}
          
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              style={{ objectFit: "cover" }}
              className={`transition-transform duration-500 ease-out group-hover:scale-105 ${isLoading ? "opacity-0" : "opacity-100"}`}
              onLoad={() => setIsLoading(false)}
            />
          ) : (
            <div className="flex w-full h-full items-center justify-center bg-gradient-to-br from-stone-100 to-stone-50">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-200">
                <svg className="h-7 w-7 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          )}
          
          {/* Gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/[0.06] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {badge && <Badge type={badge} />}
            <span className="rounded-full bg-white/95 backdrop-blur-sm px-3.5 py-1 text-[10px] font-bold text-stone-600 uppercase tracking-widest">
              {type}
            </span>
          </div>

          {/* Out of stock overlay */}
          {!inStock && (
            <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center">
              <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-stone-700">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-7 pb-8">
          <div className="flex-1 min-h-0">
            <h3 className="text-xl font-bold text-stone-950 leading-tight tracking-tight">
              {name}
            </h3>
            {description && (
              <p className="mt-2.5 text-sm text-stone-500 leading-relaxed line-clamp-2">
                {description}
              </p>
            )}
          </div>

          {/* Price + CTA */}
          <div className="flex items-end justify-between mt-6 pt-5 border-t border-stone-100">
            {/* Enhanced price treatment */}
            <div className="relative">
              <motion.div
                className="bg-gradient-to-br from-stone-50 to-white rounded-2xl px-4 py-2 -ml-2"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <p className="text-3xl font-black text-stone-950 tracking-tight leading-none">
                  {price}
                </p>
              </motion.div>
              {is_taxable && (
                <p className="mt-1 text-[10px] text-stone-400 uppercase tracking-wide ml-1">Tax included</p>
              )}
            </div>
            
            {/* Enhanced Add to Cart button with animation */}
            <motion.button
              onClick={handleAddToCart}
              onTapStart={handleButtonPress}
              onTap={handleButtonRelease}
              onTapCancel={handleButtonRelease}
              disabled={!inStock}
              className={`rounded-2xl px-7 py-3.5 text-sm font-bold tracking-wider transition-all duration-200 ${
                !inStock
                  ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                  : added
                    ? "bg-emerald-600 text-white"
                    : "bg-stone-900 text-white hover:bg-stone-800 active:bg-stone-950"
              }`}
              animate={{ scale: buttonScale }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              whileTap={{ scale: 0.95 }}
            >
              <AnimatePresence mode="wait">
                {added ? (
                  <motion.span
                    key="added"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-1.5"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Added
                  </motion.span>
                ) : (
                  <motion.span
                    key="add"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    {inStock ? "Add to Cart" : "Unavailable"}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  );
}