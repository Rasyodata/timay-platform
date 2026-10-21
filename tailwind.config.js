/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Kurumsal "banka" teması — derin lacivert + beyaz + gri (güven/profesyonel) ──
        // Surfaces (light-first)
        base: "#F4F6F9", // page plane (soğuk açık gri)
        panel: "#FFFFFF", // card / panel surface (beyaz)
        elevated: "#ECF0F5", // hover / raised surface
        line: "#D6DDE6", // hairline border
        // Ink
        ink: "#0F2544", // primary text (derin lacivert)
        muted: "#5A6B82", // secondary text
        faint: "#8795A8", // faint text
        // Accents (kurumsal lacivert-mavi öncelikli)
        neon: {
          blue: "#0A4EA2", // kurumsal banka mavisi (CTA/vurgu)
          violet: "#4B3FB0",
          emerald: "#1E7A46",
          emeraldGlow: "#2E9158",
          amber: "#B5731A",
          rose: "#C1292E",
        },
        // Marka laciverti (shell / üst-sol bar için)
        navy: {
          DEFAULT: "#0F2E57",
          deep: "#0A2342",
          soft: "#1C4379",
        },
        // Chart-series palette (açık yüzeyde okunur — kurumsal)
        series: {
          1: "#0A4EA2", // lacivert-mavi — portföy / yatırım
          2: "#1E7A46", // yeşil — emlak / getiri
          3: "#4B3FB0", // indigo — ortaklık
          4: "#B5731A", // amber — fon
          5: "#9C2A6B", // bordo-magenta — startup
        },
        // Status (reserved)
        good: "#1E7A46",
        warning: "#B5731A",
        critical: "#C1292E",
      },
      fontFamily: {
        // maxcrea.com tipografisi: gövde + başlık Montserrat (geometrik sans).
        sans: [
          "Montserrat",
          '"Segoe UI"',
          "system-ui",
          "sans-serif",
        ],
        // Başlıklar için de Montserrat (tek tip geometrik görünüm).
        display: [
          "Montserrat",
          '"Segoe UI"',
          "system-ui",
          "sans-serif",
        ],
        mono: [
          '"JetBrains Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        card: "0 0 0 1px rgba(0,0,0,0.05), 0 2px 10px -4px rgba(0,0,0,0.12)",
        "glow-emerald": "0 0 0 1px rgba(16,126,62,0.25), 0 4px 16px -6px rgba(16,126,62,0.30)",
        "glow-blue": "0 0 0 1px rgba(0,112,242,0.25), 0 4px 16px -6px rgba(0,112,242,0.30)",
        "glow-violet": "0 0 0 1px rgba(120,88,255,0.25), 0 4px 16px -6px rgba(120,88,255,0.30)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "pulse-dot": {
          "0%,100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(0.85)" },
        },
        // ── Login-screen motion ──────────────────────────────────────────
        drift: {
          "0%,100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(6%,-8%) scale(1.12)" },
          "66%": { transform: "translate(-5%,6%) scale(0.94)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
        "gradient-pan": {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        shimmer: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(220%)" },
        },
        "grid-pan": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "60px 60px" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        equalize: {
          "0%,100%": { transform: "scaleY(0.35)" },
          "50%": { transform: "scaleY(1)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
        "slide-in": "slide-in 0.28s cubic-bezier(0.22,1,0.36,1) both",
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
        "drift-slow": "drift 16s ease-in-out infinite",
        "drift-slower": "drift 22s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "gradient-pan": "gradient-pan 6s ease infinite",
        shimmer: "shimmer 2.8s ease-in-out infinite",
        "grid-pan": "grid-pan 8s linear infinite",
        rise: "rise 0.6s cubic-bezier(0.22,1,0.36,1) both",
        "spin-slow": "spin-slow 14s linear infinite",
        equalize: "equalize 1.2s ease-in-out infinite",
        marquee: "marquee 38s linear infinite",
      },
    },
  },
  plugins: [],
};
