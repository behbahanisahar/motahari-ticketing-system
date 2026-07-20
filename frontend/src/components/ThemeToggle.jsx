import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className={cn(
        "h-9 w-9 rounded-xl px-0",
        "border-[hsl(var(--header-border))] bg-[hsl(var(--header-control-bg))] text-[hsl(var(--header-fg))] hover:bg-[hsl(var(--header-control-hover))] hover:text-[hsl(var(--header-fg))]",
        className
      )}
      aria-label={isDark ? "فعال‌سازی تم روشن" : "فعال‌سازی تم تیره"}
      title={isDark ? "تم روشن" : "تم تیره"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
