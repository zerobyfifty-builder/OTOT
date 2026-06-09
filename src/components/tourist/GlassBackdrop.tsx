/**
 * Tourist portal backdrop — pure CSS atmospheric scene
 * matching the AgrixAI reference: foggy teal gradient + soft
 * haze blobs + subtle diagonal light shafts.
 * Fixed behind all content; tourist routes render glass panels above it.
 */
export const GlassBackdrop = () => {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, hsl(155 25% 52%) 0%, hsl(160 28% 32%) 45%, hsl(165 35% 18%) 100%)",
      }}
    >
      {/* Soft haze — top-left */}
      <div
        className="absolute -top-40 -left-40 h-[640px] w-[640px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, hsl(150 35% 75% / 0.28) 0%, transparent 65%)",
          filter: "blur(20px)",
        }}
      />
      {/* Soft haze — top-right */}
      <div
        className="absolute -top-32 -right-32 h-[560px] w-[560px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, hsl(160 40% 70% / 0.22) 0%, transparent 65%)",
          filter: "blur(20px)",
        }}
      />
      {/* Lime glow accent — mid-right */}
      <div
        className="absolute top-1/3 -right-48 h-[520px] w-[520px] rounded-full opacity-25"
        style={{
          background:
            "radial-gradient(circle, hsl(78 95% 62% / 0.35) 0%, transparent 65%)",
        }}
      />
      {/* Diagonal light shafts */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          background:
            "repeating-linear-gradient(115deg, hsl(0 0% 100% / 0.4) 0px, hsl(0 0% 100% / 0.4) 2px, transparent 2px, transparent 180px)",
          mixBlendMode: "screen",
        }}
      />
      {/* Deep bottom vignette */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, hsl(165 40% 12% / 0.6) 100%)",
        }}
      />
    </div>
  );
};
