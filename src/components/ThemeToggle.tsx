import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button 
        className="relative h-10 w-10 rounded-xl glass flex items-center justify-center"
        aria-label="Toggle theme"
      >
        <Sun className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative h-10 w-10 rounded-xl glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105 active:scale-95 focus-ring"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
    >
      <Sun 
        className="h-5 w-5 absolute rotate-0 scale-100 transition-all duration-500 dark:-rotate-90 dark:scale-0" 
        aria-hidden="true"
      />
      <Moon 
        className="h-5 w-5 absolute rotate-90 scale-0 transition-all duration-500 dark:rotate-0 dark:scale-100" 
        aria-hidden="true"
      />
    </button>
  );
}