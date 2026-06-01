"use client";

type HeroSectionProps = {
  eyebrow?: string;
  title: string;
  description: string;
  heroImageUrl?: string | null;
  heroVideoUrl?: string | null;
  primaryButton?: string;
  secondaryButton?: string;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
  brandAccent?: "green" | "orange" | "blue";
};

export default function HeroSection({
  eyebrow,
  title,
  description,
  heroImageUrl,
  heroVideoUrl,
  primaryButton,
  secondaryButton,
  onPrimaryClick,
  onSecondaryClick,
  brandAccent = "blue",
}: HeroSectionProps) {
  const hasHeroImage = !!heroImageUrl;
  const hasHeroVideo = !!heroVideoUrl;
  const isBlue = brandAccent === "blue";

  const btnBg = isBlue ? "bg-blue-600 hover:bg-blue-500 active:bg-blue-700" : "bg-stone-900 hover:bg-stone-800 active:bg-stone-950";

  if (hasHeroImage) {
    return (
      <section
        className="relative flex min-h-[560px] items-center overflow-hidden py-28"
        style={{
          backgroundImage: `url(${heroImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      >
        <div className="absolute inset-0" style={{
          background: isBlue
            ? "linear-gradient(135deg, rgba(0,119,190,0.25) 0%, rgba(0,119,190,0.08) 40%, transparent 70%), linear-gradient(to top, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.12) 55%, transparent 100%)"
            : "linear-gradient(135deg, rgba(0,0,0,0.20) 0%, transparent 45%), linear-gradient(to top, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)"
        }} />

        <div className="mx-auto w-full max-w-6xl px-6 relative z-10">
          {eyebrow && (
            <p className={`text-xs font-bold uppercase tracking-[0.25em] mb-6 ${isBlue ? "text-blue-200" : "text-white/60"}`}>
              {eyebrow}
            </p>
          )}
          <h1 className="text-7xl md:text-8xl font-black tracking-tight text-white leading-[1.0] max-w-3xl">
            {title}
          </h1>
          <p className="mt-8 text-2xl text-white/70 leading-relaxed max-w-lg font-light">
            {description}
          </p>

          {(primaryButton || secondaryButton) && (
            <div className="mt-12 flex flex-wrap gap-4">
              {primaryButton && (
                <button
                  onClick={onPrimaryClick}
                  className={`rounded-full ${btnBg} px-10 py-4 text-sm font-bold tracking-wider text-white transition-all hover:-translate-y-0.5`}
                >
                  {primaryButton}
                </button>
              )}
              {secondaryButton && (
                <button
                  onClick={onSecondaryClick}
                  className="rounded-full bg-white/10 backdrop-blur-sm border border-white/25 px-10 py-4 text-sm font-bold tracking-wider text-white hover:bg-white/20 hover:border-white/40 transition-all"
                >
                  {secondaryButton}
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (hasHeroVideo) {
    return (
      <section className="relative flex min-h-[560px] items-center overflow-hidden py-28">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          src={heroVideoUrl}
        />
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.6) 72%, rgba(0,0,0,0.88) 100%)"
        }} />

        <div className="mx-auto w-full max-w-6xl px-6 relative z-10">
          {eyebrow && (
            <p className="text-xs font-bold uppercase tracking-[0.25em] mb-6 text-blue-200">
              {eyebrow}
            </p>
          )}
          <h1 className="text-7xl md:text-8xl font-black tracking-tight text-white leading-[1.0] max-w-3xl">
            {title}
          </h1>
          <p className="mt-8 text-2xl text-white/70 leading-relaxed max-w-lg font-light">
            {description}
          </p>

          {(primaryButton || secondaryButton) && (
            <div className="mt-12 flex flex-wrap gap-4">
              {primaryButton && (
                <button
                  onClick={onPrimaryClick}
                  className="rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 px-10 py-4 text-sm font-bold tracking-wider text-white transition-all hover:-translate-y-0.5"
                >
                  {primaryButton}
                </button>
              )}
              {secondaryButton && (
                <button
                  onClick={onSecondaryClick}
                  className="rounded-full bg-white/10 backdrop-blur-sm border border-white/25 px-10 py-4 text-sm font-bold tracking-wider text-white hover:bg-white/20 hover:border-white/40 transition-all"
                >
                  {secondaryButton}
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="py-28 px-6 bg-gradient-to-br from-stone-100 via-stone-50 to-stone-100">
      <div className="mx-auto max-w-6xl">
        {eyebrow && (
          <p className={`text-xs font-bold uppercase tracking-[0.25em] mb-6 ${isBlue ? "text-blue-500" : "text-emerald-600"}`}>
            {eyebrow}
          </p>
        )}
        <h1 className="text-7xl md:text-8xl font-black tracking-tight leading-[1.0] max-w-3xl text-stone-950">
          {title}
        </h1>
        <p className="mt-8 text-2xl leading-relaxed max-w-lg font-light text-stone-600">
          {description}
        </p>

        {(primaryButton || secondaryButton) && (
          <div className="mt-12 flex flex-wrap gap-4">
            {primaryButton && (
              <button
                onClick={onPrimaryClick}
                className={`rounded-full ${btnBg} px-10 py-4 text-sm font-bold tracking-wider text-white transition-all hover:-translate-y-0.5`}
              >
                {primaryButton}
              </button>
            )}
            {secondaryButton && (
              <button
                onClick={onSecondaryClick}
                className="rounded-full bg-white px-10 py-4 text-sm font-bold tracking-wider text-stone-950 ring-1 ring-stone-300 hover:bg-stone-50 transition-all"
              >
                {secondaryButton}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}