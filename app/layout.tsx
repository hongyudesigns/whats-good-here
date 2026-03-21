import type { Metadata, Viewport } from "next";
import { DM_Sans, Poppins } from "next/font/google";
import "./globals.css";

// DM Sans — UI chrome (headlines, search, pills, errors)
const uiFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

// Poppins — receipt content (restaurant, stats, dish rows)
const receiptFont = Poppins({
  subsets: ["latin"],
  variable: "--font-receipt",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "What's Good Here?",
  description: "Find the best dishes at Philly restaurants.",
  themeColor: "#483E65",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${uiFont.variable} ${receiptFont.variable} antialiased`}>
        <div className="app-gradient h-screen flex justify-center bg-[radial-gradient(125%_125%_at_50%_101%,rgba(255,228,131,1)_0%,rgba(255,160,119,1)_30%,rgba(201,97,107,1)_60%,rgba(72,62,101,1)_100%)]">
          <div className="w-full max-w-[390px] px-6 py-8">{children}</div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 bottom-0 z-50 bg-[#FFE483]"
          style={{ height: "env(safe-area-inset-bottom)" }}
        />
      </body>
    </html>
  );
}
