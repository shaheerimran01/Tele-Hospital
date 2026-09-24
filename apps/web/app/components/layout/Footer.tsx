export default function Footer() {
  const knowUs = [
    'About Us',
    'Contact Us',
    'Press Coverage',
    'Careers',
    'Business Partnership',
    'Become a Health Partner',
  ];

  const ourPolicies = [
    'Privacy Policy',
    'Terms and Conditions',
    'Editorial Policy',
    'Return Policy',
    'IP Policy',
    'Grievance Redressal Policy',
  ];

  const ourServices = [
    'Order Medicines',
    'Book Lab Tests',
    'Consult a Doctor',
    'Ayurveda Articles',
    'Care Plan',
  ];

  return (
    <footer className="bg-[#101426] text-gray-400 pt-12 pb-10">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-gray-800">
          {/* Col 1: KNOW US */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              KNOW US
            </h3>
            <ul className="space-y-2.5 text-xs">
              {knowUs.map((link) => (
                <li key={link}>
                  <a href="#" className="hover:text-white transition">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 2: OUR POLICIES */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              OUR POLICIES
            </h3>
            <ul className="space-y-2.5 text-xs">
              {ourPolicies.map((link) => (
                <li key={link}>
                  <a href="#" className="hover:text-white transition">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: OUR SERVICES */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              OUR SERVICES
            </h3>
            <ul className="space-y-2.5 text-xs">
              {ourServices.map((link) => (
                <li key={link}>
                  <a href="#" className="hover:text-white transition">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 & 5: CONNECT & DOWNLOAD THE APP */}
          <div className="lg:col-span-2 flex flex-col justify-between gap-6">
            {/* Social Connect */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
                CONNECT
              </h3>
              <div className="flex items-center gap-2.5">
                {/* Facebook */}
                <a
                  href="#"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1e2338] text-gray-300 hover:bg-[#ff6f61] hover:text-white transition"
                  aria-label="Facebook"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                  </svg>
                </a>
                {/* Instagram */}
                <a
                  href="#"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1e2338] text-gray-300 hover:bg-[#ff6f61] hover:text-white transition"
                  aria-label="Instagram"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                {/* Twitter / X */}
                <a
                  href="#"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1e2338] text-gray-300 hover:bg-[#ff6f61] hover:text-white transition"
                  aria-label="X (Twitter)"
                >
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                {/* YouTube */}
                <a
                  href="#"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1e2338] text-gray-300 hover:bg-[#ff6f61] hover:text-white transition"
                  aria-label="YouTube"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
                {/* LinkedIn */}
                <a
                  href="#"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1e2338] text-gray-300 hover:bg-[#ff6f61] hover:text-white transition"
                  aria-label="LinkedIn"
                >
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* App Store Download Badges */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
                DOWNLOAD THE APP
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Apple App Store */}
                <a
                  href="#"
                  className="flex items-center gap-2.5 rounded-lg border border-gray-700 bg-black/50 px-4 py-2 hover:border-gray-500 transition"
                >
                  <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.87-.93.04-2.02.63-2.67 1.38-.56.65-1.05 1.71-.92 2.74 1.03.08 2.06-.52 2.67-1.25z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[9px] text-gray-400 leading-none">Download on the</div>
                    <div className="text-xs font-bold text-white leading-tight">App Store</div>
                  </div>
                </a>

                {/* Google Play */}
                <a
                  href="#"
                  className="flex items-center gap-2.5 rounded-lg border border-gray-700 bg-black/50 px-4 py-2 hover:border-gray-500 transition"
                >
                  <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186c-.347-.367-.547-.9-.547-1.547V3.36c0-.647.2-1.18.546-1.546zM15.207 13.414l2.748-1.587c.807-.466.807-1.228 0-1.694l-2.748-1.587-2.122 2.122 2.122 2.746zM4.743.834L14.498 10.59 12.376 12.71 4.062.247c.214.155.441.353.681.587zM4.743 23.166c-.24.234-.467.432-.681.587l8.314-12.463 2.122 2.12-9.755 9.756z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[9px] text-gray-400 leading-none">GET IT ON</div>
                    <div className="text-xs font-bold text-white leading-tight">Google Play</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright notice */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-500">
          <p>© 2026 Tabibistan. All rights reserved. In compliance with Drugs Act 1976 and DRAP regulations.</p>
          <p>Made with care for Pakistan</p>
        </div>
      </div>
    </footer>
  );
}