'use client';

export default function ConsultBenefits() {
  const benefits = [
    {
      title: '100% Confidential',
      description:
        'All advice & consultations are completely confidential. You can also delete chats whenever you want.',
      icon: (
        <svg className="h-16 w-16" viewBox="0 0 64 64" fill="none">
          {/* Teal Shield */}
          <path
            d="M32 6L14 14V30C14 43.2 21.6 54.4 32 58C42.4 54.4 50 43.2 50 30V14L32 6Z"
            fill="#06b6d4"
          />
          <path
            d="M32 9L17 15.5V30C17 41.5 23.5 51.5 32 54.7C40.5 51.5 47 41.5 47 30V15.5L32 9Z"
            fill="#14b8a6"
          />
          {/* Gold Padlock */}
          <rect x="25" y="28" width="14" height="12" rx="2" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5" />
          <path
            d="M28 28V24C28 21.8 29.8 20 32 20C34.2 20 36 21.8 36 24V28"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="32" cy="33" r="1.5" fill="#78350f" />
          <line x1="32" y1="34.5" x2="32" y2="37" stroke="#78350f" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      title: 'Certified Doctors',
      description:
        'We offer quality healthcare through our network of certified and experienced doctors.',
      icon: (
        <svg className="h-16 w-16" viewBox="0 0 64 64" fill="none">
          {/* Ribbons */}
          <path d="M24 38L18 56L28 50L36 56L32 38" fill="#0284c7" />
          <path d="M40 38L46 56L36 50L28 56L32 38" fill="#0369a1" />
          {/* Rosette Medal */}
          <circle cx="32" cy="26" r="16" fill="#38bdf8" />
          <circle cx="32" cy="26" r="13" fill="#0ea5e9" />
          {/* Inner Badge */}
          <circle cx="32" cy="26" r="8" fill="#facc15" />
          <path
            d="M32 20L33.8 23.6L37.8 24.2L34.9 27L35.6 31L32 29.1L28.4 31L29.1 27L26.2 24.2L30.2 23.6L32 20Z"
            fill="#d97706"
          />
        </svg>
      ),
    },
    {
      title: 'Convenience',
      description:
        'Forget the hassle of long queues and rush hour. Seek expert opinion anytime, anywhere.',
      icon: (
        <svg className="h-16 w-16" viewBox="0 0 64 64" fill="none">
          {/* Hand holding device */}
          <path
            d="M26 38L18 46L24 54L38 52L46 44L44 36L34 32L26 38Z"
            fill="#0284c7"
          />
          {/* Medical Device / Calculator Screen */}
          <rect x="22" y="10" width="22" height="34" rx="3" fill="#10b981" />
          <rect x="25" y="13" width="16" height="12" rx="1.5" fill="#34d399" />
          {/* Plus Sign */}
          <path
            d="M33 16V22M30 19H36"
            stroke="#064e3b"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Keypad dots */}
          <circle cx="28" cy="30" r="1.5" fill="#065f46" />
          <circle cx="33" cy="30" r="1.5" fill="#065f46" />
          <circle cx="38" cy="30" r="1.5" fill="#065f46" />
          <circle cx="28" cy="36" r="1.5" fill="#065f46" />
          <circle cx="33" cy="36" r="1.5" fill="#065f46" />
          <circle cx="38" cy="36" r="1.5" fill="#065f46" />
        </svg>
      ),
    },
    {
      title: 'Cost Effective',
      description:
        'We provide medical assistance on non urgent queries for free. Fee starting at ₹50 for faster response to queries.',
      icon: (
        <svg className="h-16 w-16" viewBox="0 0 64 64" fill="none">
          {/* Money Bills */}
          <path d="M22 18L34 10L42 22L30 30Z" fill="#fde047" />
          <path d="M26 16L38 12L44 20L32 24Z" fill="#facc15" />
          {/* Wallet Body */}
          <rect x="14" y="20" width="36" height="28" rx="5" fill="#14b8a6" />
          <path d="M14 25H50V43C50 45.8 47.8 48 45 48H19C16.2 48 14 45.8 14 43V25Z" fill="#0d9488" />
          {/* Wallet Flap */}
          <rect x="36" y="30" width="16" height="10" rx="2" fill="#0f766e" />
          <circle cx="44" cy="35" r="2" fill="#fef08a" />
        </svg>
      ),
    },
  ];

  return (
    <section className="py-12 bg-white border-t border-gray-100">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="flex flex-col items-center group p-4 rounded-xl hover:bg-gray-50/50 transition duration-200"
            >
              {/* Icon */}
              <div className="h-20 w-20 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105">
                {benefit.icon}
              </div>

              {/* Title */}
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2.5">
                {benefit.title}
              </h3>

              {/* Description */}
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-[260px]">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
