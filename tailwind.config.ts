import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface:                    "var(--color-surface)",
        "surface-container-lowest": "var(--color-surface-container-lowest)",
        "surface-container-low":    "var(--color-surface-container-low)",
        "surface-container":        "var(--color-surface-container)",
        "surface-container-high":   "var(--color-surface-container-high)",
        "surface-container-highest":"var(--color-surface-container-highest)",
        "on-surface":               "var(--color-on-surface)",
        "on-surface-variant":       "var(--color-on-surface-variant)",
        "outline-variant":          "var(--color-outline-variant)",
        outline:                    "var(--color-outline-variant)",
        primary:                    "var(--color-primary)",
        "on-primary":               "var(--color-on-primary)",
        "primary-container":        "var(--color-primary-container)",
        secondary:                  "var(--color-secondary)",
        "on-secondary":             "var(--color-on-secondary)",
        "secondary-container":      "var(--color-secondary-container)",
        tertiary:                   "var(--color-tertiary)",
        error:                      "var(--color-error)",
        "error-container":          "var(--color-error-container)",
        // Static palette helpers
        "surface-dim":              "#d2d9f4",
        "secondary-fixed":          "var(--color-secondary-container)",
        "tertiary-fixed":           "rgba(52,211,153,0.12)",
        "primary-fixed":            "rgba(26,86,232,0.1)",
        background:                 "var(--color-surface)",
        "on-background":            "var(--color-on-surface)",
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        sm: "0.375rem",
        md: "0.625rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
        full: "9999px",
      },
      spacing: {
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2rem",
        gutter: "1.5rem",
        "gutter-mobile": "1rem",
        margin: "2rem",
        "margin-mobile": "1rem",
      },
      fontFamily: {
        sans:    ["'Hanken Grotesk'", "Inter", "sans-serif"],
        display: ["'Manrope'", "sans-serif"],
        body:    ["'Hanken Grotesk'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "Menlo", "monospace"],
      },
      fontSize: {
        "label-sm":   ["11px", { lineHeight: "1.4", letterSpacing: "0.01em" }],
        "body-sm":    ["13px", { lineHeight: "1.5" }],
        "body-md":    ["14px", { lineHeight: "1.6" }],
        "numeric-md": ["18px", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "numeric-lg": ["28px", { lineHeight: "1.1", letterSpacing: "-0.03em" }],
      },
      boxShadow: {
        "card":      "var(--card-shadow)",
        "card-hover":"var(--card-shadow-hover)",
        xs:          "0 1px 2px rgba(0,0,0,0.05)",
      },
      backdropBlur: {
        xl: "24px",
        "2xl": "40px",
      },
      animation: {
        "slide-in":   "slide-in-from-top 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        "ambient":    "ambient-pulse 2s ease-in-out infinite",
        "shimmer":    "shimmer-line 2s linear infinite",
        "count-up":   "count-up 0.4s cubic-bezier(0.34,1.56,0.64,1)",
      },
    },
  },
  plugins: [],
};

export default config;
