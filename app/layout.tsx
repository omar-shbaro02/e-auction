import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Header } from "@/components/header";
import { siteDescription, siteName } from "@/lib/data";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl("/")),
  title: {
    default: `${siteName} | Wholesale and auction marketplace`,
    template: `%s | ${siteName}`
  },
  description: siteDescription,
  keywords: [
    "e-auction website",
    "buy now marketplace",
    "liquidation stock",
    "wholesale pallets",
    "auction marketplace SEO"
  ],
  openGraph: {
    title: `${siteName} | Wholesale and auction marketplace`,
    description: siteDescription,
    url: absoluteUrl("/"),
    siteName,
    locale: "en_GB",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | Wholesale and auction marketplace`,
    description: siteDescription
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<div className="header-fallback" />}>
          <Header />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
