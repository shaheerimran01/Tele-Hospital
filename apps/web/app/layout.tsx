import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { CartProvider } from './components/cart/CartContext';
import CartDrawer from './components/cart/CartDrawer';
import LoginForm from './auth/LoginForm'; 
import AuthModalProvider from './components/auth/PharmacyAuthModal';
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

// Some browser extensions (for example Bitdefender's "bis_skin_checked")
// add attributes to every <div> before React hydrates the page, which makes
// React report a hydration mismatch in development. This runs before
// hydration and removes those attributes so the page matches the server HTML.
// It does not change anything the app renders.
const EXTENSION_ATTRIBUTES = ["bis_skin_checked", "bis_register", "bis_use", "bis_id"];
const stripExtensionAttributes = `(function () {
  var names = ${JSON.stringify(EXTENSION_ATTRIBUTES)};
  var selector = names.map(function (n) { return "[" + n + "]"; }).join(",");
  function clean(root) {
    if (!root || !root.querySelectorAll) return;
    for (var i = 0; i < names.length; i++) if (root.hasAttribute && root.hasAttribute(names[i])) root.removeAttribute(names[i]);
    var found = root.querySelectorAll(selector);
    for (var j = 0; j < found.length; j++) for (var k = 0; k < names.length; k++) found[j].removeAttribute(names[k]);
  }
  try {
    clean(document.documentElement);
    var observer = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        if (r.type === "attributes") r.target.removeAttribute(r.attributeName);
        else for (var j = 0; j < r.addedNodes.length; j++) clean(r.addedNodes[j]);
      }
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: names });
    window.addEventListener("load", function () {
      setTimeout(function () { clean(document.documentElement); observer.disconnect(); }, 3000);
    });
  } catch (e) {}
})();`;

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
        <Script id="strip-extension-attributes" strategy="beforeInteractive">
          {stripExtensionAttributes}
        </Script>
        <CartProvider>
          {children}
          <CartDrawer />
          <LoginForm />
          <AuthModalProvider /> 
        </CartProvider>
      </body>
    </html>
  );
}