import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bakana Presupuestos",
  description: "Calculadora de presupuestos conectada a Google Sheets"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={manrope.className}>
      <body>{children}</body>
    </html>
  );
}
