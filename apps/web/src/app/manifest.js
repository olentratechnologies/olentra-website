export default function manifest() {
  return {
    name: "Olentra Technologies",
    short_name: "Olentra",
    description:
      "Enterprise engineering, AI systems, and launch-ready digital product delivery.",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    icons: [
      {
        src: "/icon.png",
        sizes: "1024x1024",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "1024x1024",
        type: "image/png",
      },
    ],
  };
}
