import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Twitch Todo Widget Platform",
  description: "Streamer-only dashboard for hosted stream widgets."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
