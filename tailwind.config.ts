import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
    },
    extend: {
      zIndex: {
        'modal-backdrop': '80',
        'modal-content': '90',
        'sheet': '90',
        'drawer': '90',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        surface: {
          1: "hsl(var(--surface-1))",
          2: "hsl(var(--surface-2))",
          3: "hsl(var(--surface-3))",
        },
      },
      spacing: {
        // Design token spacing scale
        0: "var(--space-0)",
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        7: "var(--space-7)",
        8: "var(--space-8)",
        9: "var(--space-9)",
        10: "var(--space-10)",
        11: "var(--space-11)",
        12: "var(--space-12)",
        13: "var(--space-13)",
        14: "var(--space-14)",
        15: "var(--space-15)",
        16: "var(--space-16)",
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        glow: "var(--shadow-glow)",
        // Legacy shadow names for backward compatibility
        subtle: "var(--shadow-subtle)",
        medium: "var(--shadow-medium)",
        strong: "var(--shadow-strong)",
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
            opacity: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
            opacity: "1",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
            opacity: "1",
          },
          to: {
            height: "0",
            opacity: "0",
          },
        },
        "fade-in": {
          from: {
            opacity: "0",
            transform: "translateY(10px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "fade-out": {
          from: {
            opacity: "1",
          },
          to: {
            opacity: "0",
          },
        },
        "scale-in": {
          from: {
            opacity: "0",
            transform: "scale(0.95)",
          },
          to: {
            opacity: "1",
            transform: "scale(1)",
          },
        },
        "scale-out": {
          from: {
            opacity: "1",
            transform: "scale(1)",
          },
          to: {
            opacity: "0",
            transform: "scale(0.95)",
          },
        },
        "slide-up": {
          from: {
            transform: "translateY(10px)",
            opacity: "0",
          },
          to: {
            transform: "translateY(0)",
            opacity: "1",
          },
        },
        "slide-down": {
          from: {
            transform: "translateY(-10px)",
            opacity: "0",
          },
          to: {
            transform: "translateY(0)",
            opacity: "1",
          },
        },
        "shimmer": {
          "0%": {
            backgroundPosition: "-200% 0",
          },
          "100%": {
            backgroundPosition: "200% 0",
          },
        },
        "pulse-subtle": {
          "0%, 100%": {
            opacity: "1",
          },
          "50%": {
            opacity: "0.8",
          },
        },
        "float": {
          "0%, 100%": {
            transform: "translateY(0px)",
          },
          "50%": {
            transform: "translateY(-10px)",
          },
        },
        "glow-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 20px hsl(var(--primary) / 0.3)",
            transform: "scale(1)",
          },
          "50%": {
            boxShadow: "0 0 30px hsl(var(--primary) / 0.5)",
            transform: "scale(1.02)",
          },
        },
        "sparkle-pulse": {
          "0%, 100%": {
            opacity: "1",
            transform: "scale(1)",
          },
          "50%": {
            opacity: "0.7",
            transform: "scale(1.15)",
          },
        },
        "slide-in-right": {
          from: {
            transform: "translateX(100%)",
            opacity: "0",
          },
          to: {
            transform: "translateX(0)",
            opacity: "1",
          },
        },
        "slide-out-right": {
          from: {
            transform: "translateX(0)",
            opacity: "1",
          },
          to: {
            transform: "translateX(100%)",
            opacity: "0",
          },
        },
        "slide-in-bottom": {
          from: {
            transform: "translateY(100%)",
            opacity: "0",
          },
          to: {
            transform: "translateY(0)",
            opacity: "1",
          },
        },
        "slide-out-bottom": {
          from: {
            transform: "translateY(0)",
            opacity: "1",
          },
          to: {
            transform: "translateY(100%)",
            opacity: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        "fade-out": "fade-out 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "scale-in": "scale-in 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        "scale-out": "scale-out 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-up": "slide-up 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-down": "slide-down 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        "shimmer": "shimmer 2s linear infinite",
        "pulse-subtle": "pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 3s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "sparkle-pulse": "sparkle-pulse 1.5s ease-in-out infinite",
        "slide-in-right": "slide-in-right 0.26s cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-out-right": "slide-out-right 0.26s cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-in-bottom": "slide-in-bottom 0.26s cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-out-bottom": "slide-out-bottom 0.26s cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
