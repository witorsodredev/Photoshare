import { Cormorant_Garamond } from "next/font/google";

// Downloaded at build time and served from our own origin (fits the CSP;
// visitors never hit Google). Used for the client-facing album titles.
export const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-serif",
});
