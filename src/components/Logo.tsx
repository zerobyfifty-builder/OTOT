import ototLogo from "@/assets/otot-logo.png";
import ototTreeIcon from "@/assets/otot-tree-icon.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  iconOnly?: boolean;
  variant?: "default" | "sidebar";
}

export const Logo = ({ size = "md", showText = true, iconOnly = false, variant = "default" }: LogoProps) => {
  const sizeClasses = {
    sm: { container: "h-10 w-10", text: "text-lg" },
    md: { container: "h-12", text: "text-2xl" },
    lg: { container: "h-16", text: "text-3xl" }
  };

  const classes = sizeClasses[size];

  if (iconOnly) {
    // Green tree icon for sidebar (visible on black background)
    if (variant === "sidebar") {
      return (
        <img 
          src={ototTreeIcon} 
          alt="OTOT" 
          className={`${classes.container}`}
          style={{ filter: 'brightness(0) saturate(100%) invert(71%) sepia(13%) saturate(1453%) hue-rotate(91deg) brightness(95%) contrast(90%)' }}
        />
      );
    }
    return (
      <img src={ototTreeIcon} alt="OTOT" className={`${classes.container} brightness-0 invert`} />
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <img src={ototLogo} alt="OTOT Logo" className={`${classes.container} [filter:brightness(0)_invert(1)]`} />
      {showText && (
        <span className={`${classes.text} font-bold text-foreground`}>OTOT</span>
      )}
    </div>
  );
};
