/**
 * Tourist portal backdrop — pure CSS atmospheric scene
 * matching the AgrixAI reference: deep forest-teal gradient with
 * soft haze, muted light shafts, and dark vignette.
 */
export const GlassBackdrop = () => {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, hsl(152 18% 30%) 0%, hsl(155 22% 18%) 50%, hsl(155 30% 9%) 100%)",
      }}
    >
      {/* Soft top haze — desaturated */}
      <div
        className="absolute -top-40 left-0 right-0 h-[520px]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, hsl(150 18% 55% / 0.22) 0%, transparent 70%)",
          filter: "blur(24px)",
        }}
      />
      {/* Subtle olive glow — mid */}
      <div
        className="absolute top-1/4 -right-40 h-[480px] w-[480px] rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle, hsl(72 35% 50% / 0.22) 0%, transparent 65%)",
        }}
      />
      {/* Diagonal light shafts — very subtle */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          background:
            "repeating-linear-gradient(115deg, hsl(0 0% 100% / 0.4) 0px, hsl(0 0% 100% / 0.4) 2px, transparent 2px, transparent 220px)",
          mixBlendMode: "screen",
        }}
      />
      {/* Deep bottom vignette */}
      <div
        className="absolute inset-x-0 bottom-0 h-2/3"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, hsl(155 35% 6% / 0.75) 100%)",
        }}
      />
    </div>
  );
};
