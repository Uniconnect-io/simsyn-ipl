import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://sipl.uniconnect.io'),
  title: "Simsyn IPL 2026 | The Innovation League",
  description: "Where Ideas Compete. Products Are Born. The ultimate innovation tournament for tech leaders.",
  keywords: ["Simsyn", "IPL", "Innovation", "League", "2026", "Tech", "Tournament"],
  authors: [{ name: "Simsyn Team" }],
  icons: {
    icon: "/assets/logo.png",
    apple: "/assets/logo.png",
  },
  openGraph: {
    title: "Simsyn IPL 2026 | The Innovation League",
    description: "The ultimate innovation tournament. Where Ideas Compete and Products Are Born. Join the tech elite.",
    url: "https://sipl.uniconnect.io",
    siteName: "Simsyn IPL",
    images: [
      {
        url: "/assets/logo.png",
        width: 1200,
        height: 630,
        alt: "Simsyn IPL 2026 - Innovation Premier League",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Simsyn IPL 2026 | The Innovation League",
    description: "Where Ideas Compete. Products Are Born. The ultimate tech tournament.",
    images: ["/assets/logo.png"],
    creator: "@simsyn",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
