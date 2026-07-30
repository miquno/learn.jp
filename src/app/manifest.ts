import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LearnJP",
    short_name: "LearnJP",
    description: "Learn Japanese from zero to JLPT N1",
    start_url: "/",
    display: "standalone",
    background_color: "#1a1c22",
    theme_color: "#1a1c22",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
