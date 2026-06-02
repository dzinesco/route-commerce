"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: string;
  type: string;
  imageUrl: string | null;
}

interface CinematicShowcaseProps {
  products: Product[];
  brandSlug?: string;
}

// Single product card with scroll-driven morphing
function MorphingProductCard({
  product,
  index,
  isActive,
}: {
  product: Product;
  index: number;
  isActive: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !cardRef.current) return;

    const ctx = gsap.context(() => {
      // Morphing effect based on scroll position
      gsap.to(cardRef.current, {
        scale: isActive ? 1.02 : 0.95,
        opacity: isActive ? 1 : 0.5,
        y: isActive ? 0 : index * 20,
        duration: 0.6,
        ease: "power3.out",
      });

      // Subtle rotation for depth
      gsap.to(cardRef.current, {
        rotateY: isActive ? 0 : (index % 2 === 0 ? -5 : 5),
        duration: 0.8,
        ease: "power2.out",
      });
    }, cardRef);

    return () => ctx.revert();
  }, [isActive, index]);

  return (
    <div
      ref={cardRef}
      className="relative flex-shrink-0 w-[85vw] sm:w-[70vw] md:w-[45vw] lg:w-[35vw]"
      style={{ perspective: "1000px" }}
    >
      <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-gradient-to-br from-stone-900 to-stone-950">
        {/* Image with parallax */}
        <div ref={imageRef} className="absolute inset-0">
          {product.imageUrl && (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              style={{
                transform: isActive ? "scale(1.05)" : "scale(1)",
                transition: "transform 0.6s ease-out",
              }}
            />
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/80 mb-2">
            {product.type}
          </p>
          <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-sm text-white/60 line-clamp-2 mb-4">
              {product.description}
            </p>
          )}
          <p className="text-2xl font-black text-white">{product.price}</p>
        </div>

        {/* Shine effect */}
        <div
          className="absolute inset-0 opacity-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)",
          }}
        />
      </div>
    </div>
  );
}

export default function CinematicShowcase({
  products,
  brandSlug = "tuxedo",
}: CinematicShowcaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    const ctx = gsap.context(() => {
      // Scroll-driven product switching
      const productSwitchTrigger = ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
        onUpdate: (self) => {
          setScrollProgress(self.progress);

          // Calculate which product should be active
          const progress = self.progress;
          const productCount = products.length;
          const segmentSize = 1 / productCount;

          let newIndex = Math.min(
            Math.floor(progress / segmentSize),
            productCount - 1
          );
          newIndex = Math.max(0, newIndex);

          setActiveIndex(newIndex);
        },
      });

      // Parallax for background text
      gsap.to(".showcase-headline", {
        y: -100,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        },
      });

      // Scale reveal for cards
      gsap.fromTo(
        ".product-card-wrapper",
        { opacity: 0, y: 100, scale: 0.9 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: "back.out(1.4)",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [products.length]);

  if (products.length === 0) return null;

  return (
    <section
      ref={containerRef}
      className="relative bg-stone-950"
      style={{ height: `${products.length * 100}vh` }}
    >
      {/* Sticky container */}
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Background headline with parallax */}
        <div className="showcase-headline absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <h2
            className="text-[25vw] font-black text-white/5 leading-none select-none whitespace-nowrap"
            style={{ transform: "translateY(100px)" }}
          >
            HARVEST
          </h2>
        </div>

        {/* Progress dots */}
        <div className="absolute right-8 md:right-12 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
          {products.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-500 ${
                i === activeIndex
                  ? "bg-emerald-500 scale-150"
                  : "bg-white/30 scale-100"
              }`}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-amber-500 transition-all duration-300"
            style={{ width: `${scrollProgress * 100}%` }}
          />
        </div>

        {/* Main content */}
        <div className="relative h-full flex flex-col justify-end pb-24 md:pb-32">
          {/* Section header */}
          <div className="absolute top-1/4 left-8 md:left-16 z-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-500/80 mb-4">
              This Season&apos;s Harvest
            </p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.05] max-w-xl">
              Picked This
              <br />
              Morning
            </h2>
          </div>

          {/* Product showcase */}
          <div className="relative w-full overflow-visible">
            <div
              className="flex gap-6 px-8 md:px-16"
              style={{
                transform: `translateX(${-activeIndex * 15}vw)`,
                transition: "transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1)",
              }}
            >
              {products.map((product, i) => (
                <div
                  key={product.id}
                  className="product-card-wrapper"
                  style={{
                    opacity: i === activeIndex ? 1 : 0.3,
                    transform: `scale(${i === activeIndex ? 1 : 0.85})`,
                    transition: "all 0.6s cubic-bezier(0.22, 0.61, 0.36, 1)",
                  }}
                >
                  <MorphingProductCard
                    product={product}
                    index={i}
                    isActive={i === activeIndex}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Active product info */}
          <div className="mt-8 px-8 md:px-16 max-w-xl">
            <div
              className="transition-all duration-500"
              style={{ opacity: 1, transform: "translateY(0)" }}
            >
              <p className="text-sm text-white/50 mb-2">
                {products[activeIndex]?.name}
              </p>
              <p className="text-xs text-white/30 max-w-md">
                {products[activeIndex]?.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
