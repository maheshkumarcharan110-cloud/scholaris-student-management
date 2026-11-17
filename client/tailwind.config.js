/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "rgb(var(--paper) / <alpha-value>)",
          deep: "rgb(var(--paper-deep) / <alpha-value>)",
        },
        surface: "rgb(var(--surface) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        ink: {
          50: "#F3F6FA",
          100: "#E3EAF2",
          200: "#C5D3E3",
          300: "#97AFC9",
          400: "#6486A8",
          500: "#43658A",
          600: "#2F4D70",
          700: "#243D5A",
          800: "#172B43",
          900: "#101F33",
          950: "#0A1626",
        },
        marigold: {
          50: "#FDF7EA",
          100: "#FAEDCE",
          200: "#F3D99B",
          300: "#EBC063",
          400: "#E4A83D",
          500: "#D18C24",
          600: "#B26C1B",
          700: "#8E5118",
          800: "#75421A",
          900: "#623719",
        },
        sage: {
          50: "#EEF5F0",
          100: "#D8E9DD",
          200: "#B4D3BF",
          300: "#86B599",
          400: "#5C9575",
          500: "#43795D",
          600: "#326049",
          700: "#294D3C",
          800: "#233E32",
          900: "#1D332A",
        },
        clay: {
          50: "#FCF1ED",
          100: "#F8E0D7",
          200: "#F0C1AE",
          300: "#E59B80",
          400: "#D87757",
          500: "#C65C3D",
          600: "#A94830",
          700: "#8B3A28",
          800: "#733226",
          900: "#602D24",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Fraunces Variable"', "ui-serif", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,31,51,0.04), 0 10px 30px -18px rgba(16,31,51,0.18)",
        float: "0 20px 50px -20px rgba(10,22,38,0.35)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.25s ease-out both",
        "scale-in": "scale-in 0.2s cubic-bezier(0.22,1,0.36,1) both",
        "slide-in-right": "slide-in-right 0.3s cubic-bezier(0.22,1,0.36,1) both",
        shimmer: "shimmer 1.6s infinite linear",
      },
    },
  },
  plugins: [],
};
