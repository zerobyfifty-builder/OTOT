import ototLogo from "@/assets/otot-logo.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export const Logo = ({ size = "md", showText = true }: LogoProps) => {
  const sizeClasses = {
    sm: { container: "h-8", text: "text-lg" },
    md: { container: "h-12", text: "text-2xl" },
    lg: { container: "h-16", text: "text-3xl" }
  };

  const classes = sizeClasses[size];

  return (
    <div className="flex items-center space-x-2">
      <img src={ototLogo} alt="OTOT Logo" className={classes.container} />
      {showText && (
        <span className={`${classes.text} font-bold text-foreground`}>OTOT</span>
      )}
    </div>
  );
};
