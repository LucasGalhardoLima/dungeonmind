import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#1A1A2E",
        accent: "#C9A84C",
        purple: "#4A2C6E",
        text: "#F0F0F0",
        muted: "#808080",
        danger: "#DC3232",
        success: "#32CD32",
      },
      borderRadius: {
        screen: "24px",
        card: "16px",
        button: "12px",
        chip: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
