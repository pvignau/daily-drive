import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Drive",
  description: "Your personalized daily mix of music and podcasts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-surface text-on-surface min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
