import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Parkinson's Voice Research Platform",
  description:
    "A polished research showcase for explainable Parkinson's disease prediction using voice-feature analysis, model comparison, and transparent interpretation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <Navbar />
          <main className="relative pb-16">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
