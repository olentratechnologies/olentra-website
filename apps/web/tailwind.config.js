const path = require("node:path");

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("@olentra/ui/tailwind-preset")],
  content: [
    path.resolve(__dirname, "src/**/*.{js,jsx,ts,tsx,mdx}"),
    path.resolve(__dirname, "../../packages/*/src/**/*.{js,jsx,mjs}"),
  ],
};
