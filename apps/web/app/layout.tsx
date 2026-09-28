import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from './components/cart/CartContext';
import CartDrawer from './components/cart/CartDrawer';
import LoginForm from './auth/LoginForm'; 
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
  title: "Tabibistan: Pakistan's Leading Online Pharmacy & Healthcare Platform",
  description: "Order medicines, book lab tests, consult doctors, and buy health products online in Pakistan with Tabibistan.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <CartProvider>
          {children}
          <CartDrawer />
          <LoginForm /> 
        </CartProvider>
      </body>
    </html>
  );
}