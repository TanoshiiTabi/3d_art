import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "3D Fragment FX Generator",
  description: "Upload an image and generate a 3D scroll-driven fragment assembly effect with React Three Fiber & GSAP.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#0a0a0f", color: "#e2e8f0" }}>
        {children}
      </body>
    </html>
  );
}
