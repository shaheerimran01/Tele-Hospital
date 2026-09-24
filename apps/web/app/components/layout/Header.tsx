'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useCart } from '@/app/components/cart/CartContext';

const LocationModal = dynamic(
  () => import('@/components/location/LocationModal'),
  { ssr: false }
);

interface UserProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}

interface UserAddress {
  id: string;
  userId: string;
  label: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  area?: string;
  city: string;
  province?: string;
  postalCode?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
}

interface SubCategoryItem {
  name: string;
  slug: string;
}

interface CategoryPill {
  title: string;
  items: SubCategoryItem[];
}

const CATEGORY_PILLS: CategoryPill[] = [
  {
    title: 'Health Resource Center',
    items: [
      { name: 'All diseases', slug: 'all-diseases' },
      { name: 'All medicines', slug: 'all-medicines' },
      { name: 'Medicines by therapeutic class', slug: 'medicines-by-therapeutic-class' },
    ],
  },
  {
    title: 'Hair Care',
    items: [
      { name: 'Hair Oils', slug: 'hair-oils' },
      { name: 'Shampoos & Conditioners', slug: 'shampoos-and-conditioners' },
      { name: 'Hair Serums', slug: 'hair-serums' },
      { name: 'Hair Cream & Masks', slug: 'hair-cream-and-masks' },
      { name: 'Hair Colour', slug: 'hair-colour' },
      { name: 'Hair Growth Products', slug: 'hair-growth-products' },
      { name: 'Essential Oils', slug: 'essential-oils' },
    ],
  },
  {
    title: 'Fitness & Health',
    items: [
      { name: 'Plant Protein', slug: 'plant-protein' },
      { name: 'Mass Gainers', slug: 'mass-gainers' },
      { name: 'Pre/Post workout', slug: 'pre-post-workout' },
      { name: 'Smart watch & rings', slug: 'smart-watch-and-rings' },
      { name: 'Fat Burners', slug: 'fat-burners' },
    ],
  },
  {
    title: 'Sexual Wellness',
    items: [
      { name: 'Lubricants & Massage Gels', slug: 'lubricants-and-massage-gels' },
      { name: 'Sexual wellness devices', slug: 'sexual-wellness-devices' },
      { name: 'Performance enhancers', slug: 'performance-enhancers' },
      { name: 'Oral contraceptives', slug: 'oral-contraceptives' },
    ],
  },
  {
    title: 'Vitamins & Nutrition',
    items: [
      { name: 'Fish oil', slug: 'fish-oil' },
      { name: 'Cod liver oil', slug: 'cod-liver-oil' },
      { name: 'Flax seed oil', slug: 'flax-seed-oil' },
      { name: 'Hair & skin supplements', slug: 'hair-and-skin-supplements' },
      { name: 'Calcium', slug: 'calcium' },
      { name: 'Vitamin B', slug: 'vitamin-b' },
      { name: 'Vitamin C', slug: 'vitamin-c' },
      { name: 'Vitamin D', slug: 'vitamin-d' },
    ],
  },
  {
    title: 'Supports & Braces',
    items: [
      { name: 'Ankle, Foot and leg support', slug: 'ankle-foot-and-leg-support' },
    ],
  },
  {
    title: 'Immunity Boosters',
    items: [
      { name: 'Supplements', slug: 'supplements' },
      { name: 'Antioxidant supplements', slug: 'antioxidant-supplements' },
      { name: 'Herbal supplements', slug: 'herbal-supplements' },
      { name: 'Herbal tea', slug: 'herbal-tea' },
    ],
  },
  {
    title: 'Homeopathy',
    items: [
      { name: 'Sexual Health', slug: 'sexual-health' },
      { name: 'Hair Care Products', slug: 'hair-care-products' },
      { name: 'Piles and fissures', slug: 'piles-and-fissures' },
      { name: 'Obesity', slug: 'obesity' },
      { name: 'Warts', slug: 'warts' },
      { name: 'Fungal Infection', slug: 'fungal-infection' },
      { name: 'Diabetes Medicines', slug: 'diabetes-medicines' },
      { name: 'Stomach Medicines', slug: 'stomach-medicines' },
    ],
  },
  {
    title: 'Pet Care',
    items: [
      { name: 'Pet Supplements', slug: 'pet-supplements' },
      { name: 'Pet Food', slug: 'pet-food' },
    ],
  },
];

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  
  // Cart Context Connect Kiya
  const { cartCount, openCart } = useCart();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [address, setAddress] = useState<UserAddress | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState(
    pathname === '/lab-tests'
      ? 'LAB TESTS'
      : pathname === '/consult-doctors'
      ? 'CONSULT DOCTORS'
      : pathname === '/ayurveda'
      ? 'AYURVEDA'
      : 'MEDICINES'
  );

  useEffect(() => {
    const loadUser = () => {
      try {
        const saved = localStorage.getItem('tabibistan_user');
        if (saved) {
          setUser(JSON.parse(saved));
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };

    loadUser();

    window.addEventListener('auth_state_change', loadUser);
    window.addEventListener('storage', loadUser);
    return () => {
      window.removeEventListener('auth_state_change', loadUser);
      window.removeEventListener('storage', loadUser);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tabibistan_user');
      window.dispatchEvent(new Event('auth_state_change'));
    }
    setUser(null);
    setShowUserMenu(false);
  };

  useEffect(() => {
    if (pathname === '/lab-tests') {
      setActiveTab('LAB TESTS');
    } else if (pathname === '/consult-doctors') {
      setActiveTab('CONSULT DOCTORS');
    } else if (pathname === '/ayurveda') {
      setActiveTab('AYURVEDA');
    } else if (pathname === '/') {
      setActiveTab('MEDICINES');
    }
  }, [pathname]);

  useEffect(() => {
    const loadAddress = async () => {
      if (!user?.id) {
        setAddress(null);
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:4000/addresses?userId=${user.id}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch address');
        }

        const data: UserAddress[] = await response.json();

        const defaultAddress =
          data.find((item) => item.isDefault) || data[0] || null;

        setAddress(defaultAddress);
      } catch (error) {
        console.error('Failed to load address:', error);
        setAddress(null);
      }
    };

    loadAddress();
  }, [user]);

  const navLinks = [
    { name: 'MEDICINES', href: '/' },
    { name: 'LAB TESTS', href: '/lab-tests' },
    { name: 'CONSULT DOCTORS', href: '/consult-doctors' },
    { name: 'CANCER CARE', href: '#cancer-care' },
    { name: 'AYURVEDA', href: '/ayurveda' },
    { name: 'PARTNERSHIPS', href: '#partnerships' },
    { name: 'CORPORATES', href: '#corporates' },
    { name: 'CARE PLAN', href: '#care-plan', badge: 'Save More' },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        {/* TOP NAV BAR */}
        <div className="border-b border-gray-100">
          <div className="mx-auto flex h-14 max-w-[1360px] items-center justify-between px-4 sm:px-6">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 shrink-0 group text-left mr-8 xl:mr-12 cursor-pointer"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#ff6f61] text-white shadow-xs">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900">
                Tabib<span className="text-[#ff6f61]">istan</span>
              </span>
            </button>

            <nav className="hidden lg:flex items-center gap-3 xl:gap-6 h-full text-[12.5px] xl:text-[13px] font-bold">
              {navLinks.map((tab) => {
                const isActive = activeTab === tab.name;
                return (
                  <button
                    key={tab.name}
                    onClick={() => {
                      setActiveTab(tab.name);
                      if (tab.href && tab.href.startsWith('/')) {
                        router.push(tab.href);
                      }
                    }}
                    className={`relative flex items-center gap-1.5 h-14 transition-colors shrink-0 cursor-pointer ${
                      isActive
                        ? 'text-[#ff6f61]'
                        : 'text-gray-700 hover:text-[#ff6f61]'
                    }`}
                  >
                    <span>{tab.name}</span>
                    {tab.badge && (
                      <span className="rounded bg-[#ff574d] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
                        {tab.badge}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#ff6f61] rounded-t-sm" />
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-4 xl:gap-5 text-xs text-gray-700 shrink-0 ml-8 xl:ml-12">
              {user ? (
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 font-semibold text-gray-800 hover:text-[#ff6f61] transition cursor-pointer"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ff6f61] text-white text-xs font-bold shadow-2xs">
                      {user.firstName ? user.firstName[0].toUpperCase() : 'U'}
                    </div>
                    <span className="max-w-[110px] truncate text-xs font-bold text-gray-800">
                      {user.firstName || 'My Account'}
                    </span>
                    <svg
                      className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${
                        showUserMenu ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-100 bg-white py-1.5 shadow-lg z-50 divide-y divide-gray-100">
                      <div className="px-3.5 py-2">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        {user.phone && (
                          <p className="text-[10px] text-gray-500 truncate mt-0.5">
                            {user.phone}
                          </p>
                        )}
                      </div>
                      <div className="p-1">
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                          </svg>
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => router.push('/auth/login')}
                    className="font-medium hover:text-[#ff6f61] transition cursor-pointer"
                  >
                    Login
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={() => router.push('/auth/signup')}
                    className="font-medium hover:text-[#ff6f61] transition cursor-pointer"
                  >
                    Signup
                  </button>
                </div>
              )}

              <button className="hidden sm:block hover:text-[#ff6f61] transition cursor-pointer">
                Offers
              </button>

              {/* CART BUTTON WITH ACTIVE BADGE AND DRAWER OPEN TRIGGER */}
              <button
                type="button"
                onClick={openCart}
                className="relative flex items-center hover:text-[#ff6f61] transition cursor-pointer"
                aria-label="Cart"
              >
                <svg
                  className="h-5 w-5 text-gray-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff574d] px-1 text-[9px] font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </button>

              <button className="hidden sm:block hover:text-[#ff6f61] transition cursor-pointer">
                Need Help?
              </button>
            </div>
          </div>
        </div>

        {/* SEARCH & QUICK BUY BAR */}
        <div className="border-b border-gray-100 bg-white">
          <div className="mx-auto flex h-14 max-w-[1360px] items-center gap-4 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setShowLocationModal(true)}
              className="flex items-center gap-1.5 rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 shrink-0 cursor-pointer hover:border-gray-300"
            >
              <svg
                className="h-3.5 w-3.5 text-[#ff574d]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z"
                  clipRule="evenodd"
                />
              </svg>

              <span className="font-semibold text-gray-800 max-w-[170px] truncate">
                {address
                  ? address.area || address.city
                  : 'Select Location'}
              </span>

              <svg
                className="h-3 w-3 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search Medicines & Health Products"
                className="w-full rounded-md border border-gray-200 bg-[#f7f8fa] py-2 pl-4 pr-10 text-xs text-gray-800 outline-none focus:border-[#ff6f61] focus:bg-white transition"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </div>

            <div className="hidden xl:flex items-center gap-1.5 text-xs text-[#ff574d] font-semibold whitespace-nowrap">
              <span className="text-sm">⚡</span>
              <span>QUICK BUY! Get up to 25% off on medicines*</span>
            </div>

            <button className="shrink-0 rounded-md bg-[#ff574d] px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#e8453b] transition cursor-pointer">
              Quick Order
            </button>
          </div>
        </div>

        {/* CATEGORY PILLS BAR */}
        <div className="bg-white py-2 overflow-x-auto lg:overflow-visible scrollbar-none">
          <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-1 sm:gap-1.5 xl:gap-2 px-3 sm:px-6 whitespace-nowrap flex-nowrap">
            {CATEGORY_PILLS.map((pill) => (
              <div
                key={pill.title}
                className="relative shrink-0"
                onMouseEnter={() => setHoveredCategory(pill.title)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <button
                  onClick={() =>
                    setHoveredCategory((prev) =>
                      prev === pill.title ? null : pill.title
                    )
                  }
                  className={`flex items-center gap-1 sm:gap-1.5 rounded-full border px-2.5 xl:px-3 py-1 text-[11px] xl:text-xs font-semibold transition cursor-pointer ${
                    hoveredCategory === pill.title
                      ? 'border-[#ff6f61] text-[#ff6f61] bg-red-50/50'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:text-[#ff6f61]'
                  }`}
                >
                  <span>{pill.title}</span>
                  <svg
                    className={`h-2.5 w-2.5 text-gray-400 transition-transform duration-150 ${
                      hoveredCategory === pill.title ? 'rotate-180 text-[#ff6f61]' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {hoveredCategory === pill.title && (
                  <div className="absolute left-0 top-full mt-1.5 w-60 rounded-xl border border-gray-200 bg-white py-2 shadow-2xl z-50 divide-y divide-gray-100">
                    <div className="px-3.5 py-1.5 mb-1 bg-gray-50/80 border-b border-gray-100">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                        {pill.title}
                      </span>
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                      {pill.items.map((subItem) => (
                        <button
                          key={subItem.name}
                          onClick={() => {
                            setHoveredCategory(null);
                            if (subItem.slug === 'all-medicines') {
                              router.push('/all-medicines');
                            } else {
                              router.push(`/header-navigation/${subItem.slug}`);
                            }
                          }}
                          className="flex w-full items-center px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-red-50 hover:text-[#ff6f61] transition text-left cursor-pointer"
                        >
                          {subItem.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      <LocationModal
        open={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        user={user}
        currentAddress={address}
        onAddressSaved={(savedAddress: UserAddress) => {
          setAddress(savedAddress);
          setShowLocationModal(false);
        }}
      />
    </>
  );
}