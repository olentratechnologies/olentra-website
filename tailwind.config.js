/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "sans-serif"],
        inter: ["Manrope", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        olentra: {
          cyan: "#00f0ff",
          purple: "#8a2be2",
          pink: "#ff007f",
          dark: "#070b12",
          obsidian: "#070b12",
          navy: "#0f1723",
          ice: "#8ac8fa",
          glow: "#152943",
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 15px rgba(0, 240, 255, 0.5)',
        'glow-purple': '0 0 15px rgba(138, 43, 226, 0.5)',
        'glow-pink': '0 0 15px rgba(255, 0, 127, 0.5)',
        'glow-ice': '0 0 20px rgba(138, 200, 250, 0.35)',
      },
      backgroundImage: {
        'cyber-grid': `linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                       linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
        'synthwave-gradient': 'linear-gradient(135deg, rgba(138,43,226,0.2) 0%, rgba(0,240,255,0.2) 100%)',
        'founders-hero': 'radial-gradient(ellipse at 65% 48%, #152943 0, transparent 50%), linear-gradient(110deg, #070b12, #0b111b)',
        'founders-vision': 'radial-gradient(ellipse at 50% 50%, #102238 0, transparent 55%)',
        'founders-message': 'radial-gradient(ellipse at 90% 70%, #132135, transparent 65%)',
        'founders-closing': 'radial-gradient(ellipse at 50% 100%, #172b45, transparent 65%)',
      },
      backgroundSize: {
        'cyber-grid': '40px 40px',
        'founders-grid': '100px 100px',
      },
      keyframes: {},
      animation: {},
    },
  },
  plugins: [require("tailwindcss-animate")],
};
