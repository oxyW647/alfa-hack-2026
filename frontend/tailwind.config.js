export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        red: { 50: "#FFEDEB", 100: "#FDD9D5", 500: "#EF3124", 600: "#D9261A", 700: "#B71D12" },
        ink: {
          900: "#17171A",
          800: "#26262B",
          600: "#4A4B52",
          500: "#64666E",
          400: "#A3A5AC",
          300: "#C9CACF",
        },
        line: "#E3E4E8",
        mist: { 50: "#F8F8FA", 100: "#F1F2F4", 200: "#ECEDF0", 300: "#D3D5DA", 400: "#8C8E96" },
        lime: { 100: "#E9FAB5", 500: "#C6F135", 600: "#A8D62A", 700: "#7FB800", 900: "#3F5A00" },
        violet: { 100: "#EFE7FF", 500: "#7B3FF2", 900: "#5726C2" },
        sky: { 100: "#E4EDFF", 500: "#2B6BF3", 900: "#1A4FC8" },
        amber: { 100: "#FFF2D6", 500: "#FFB422", 900: "#8A5200" },
        pine: "#0E7A3D",
      },
      fontFamily: {
        sans: ['"Golos Text Variable"', '"Segoe UI"', "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      borderRadius: { field: "14px", card: "20px", section: "28px" },
      boxShadow: {
        sm: "0 1px 2px rgba(23,23,26,0.06)",
        md: "0 6px 20px rgba(23,23,26,0.08)",
        lg: "0 18px 44px rgba(23,23,26,0.14)",
        focus: "0 0 0 2px #FFFFFF, 0 0 0 4px #EF3124",
        glow: "0 10px 28px rgba(239,49,36,0.18)",
      },
      keyframes: {
        pulseSoft: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.55" } },
      },
      animation: { pulseSoft: "pulseSoft 1.6s ease-in-out infinite" },
    },
  },
  plugins: [],
};
