import forestBg from "@/assets/tourist-bg-forest.jpg";

/**
 * Full-bleed cinematic backdrop for the tourist portal.
 * Fixed behind all content; tourist routes render glass panels above it.
 */
export const GlassBackdrop = () => {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Forest hero image */}
      <img
        src={forestBg}
        alt=""
        width={1920}
        height={1080}
        className="absolute inset-0 h-full w-full object-cover scale-105"
        style={{ filter: "blur(2px) saturate(110%)" }}
      />
      {/* Dark green gradient overlay for legibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, hsl(150 50% 6% / 0.55) 0%, hsl(150 50% 6% / 0.78) 70%, hsl(150 55% 4% / 0.92) 100%)",
        }}
      />
      {/* Subtle lime glow top-right */}
      <div
        className="absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full opacity-25"
        style={{
          background:
            "radial-gradient(circle, hsl(75 100% 65% / 0.35) 0%, transparent 65%)",
        }}
      />
      {/* Soft moss glow bottom-left */}
      <div
        className="absolute -bottom-40 -left-40 h-[520px] w-[520px] rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle, hsl(122 39% 49% / 0.4) 0%, transparent 65%)",
        }}
      />
    </div>
  );
};
