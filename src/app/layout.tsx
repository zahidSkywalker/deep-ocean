import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Farm Village — A Pixel Life",
  description: "A cozy auto-playing slice-of-life farm village built with pixel art",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="m-0 p-0 overflow-hidden bg-black w-screen h-screen">
        {children}
      </body>
    </html>
  );
}