import { cn } from "@/lib/utils";
import { useRestaurantTheme } from "@/contexts/RestaurantThemeContext";

export default function BrandMark({ className = "" }: { className?: string }) {
  const { branding } = useRestaurantTheme();
  const displayName = branding.displayName || "BLACKDOT";

  return (
    <div className={cn("brand", "brand-mark", branding.displayName && "brand-mark-custom-name", branding.logoUrl && "brand-mark-with-logo", className)}>
      {branding.logoUrl ? <img src={branding.logoUrl} alt={branding.displayName || "Logo ristorante"} /> : <span>{displayName}</span>}
      <small>{branding.logoUrl && branding.displayName ? branding.displayName : "RESTAURANT"}</small>
    </div>
  );
}
