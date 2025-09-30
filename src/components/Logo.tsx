import { TreePine } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export const Logo = ({ size = "md", showText = true }: LogoProps) => {
  const sizeClasses = {
    sm: { container: "w-8 h-8", icon: "h-4 w-4", text: "text-lg" },
    md: { container: "w-12 h-12", icon: "h-6 w-6", text: "text-2xl" },
    lg: { container: "w-16 h-16", icon: "h-8 w-8", text: "text-3xl" }
  };

  const classes = sizeClasses[size];

  return (
    <div className="flex items-center space-x-2">
      <div className={`${classes.container} bg-primary rounded-full flex items-center justify-center`}>
        <TreePine className={`${classes.icon} text-black`} />
      </div>
      {showText && (
        <span className={`${classes.text} font-bold text-foreground`}>OTOT</span>
      )}
    </div>
  );
};
