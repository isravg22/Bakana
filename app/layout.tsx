import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bakana Presupuestos",
  description: "Calculadora de presupuestos conectada a Google Sheets"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
