import type { Metadata } from "next";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${uiFont.variable} ${receiptFont.variable} antialiased`}
      >
        <div className="min-h-screen flex justify-center">
          <div className="w-full max-w-[390px] px-5 py-8">{children}</div>
        </div>
      </body>
    </html>
  );
}
