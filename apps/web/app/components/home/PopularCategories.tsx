'use client';

import React from 'react';
import Link from 'next/link';

type CategoryItem = {
  title: string;
  slug: string;
  image: string;
  fallbackBg?: string;
};

const popularCategories: CategoryItem[] = [
  {
    title: 'Best offers',
    slug: 'best-offers',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQAK6YONh-ZunaqrC0Ho5bzKqZIoic8eXRe6QkUeLDkIuzsGtzJFZ0VyAs&s=10',
  },
  {
    title: 'Vitamins & Supplements',
    slug: 'vitamins-supplements',
    image: 'https://thumbs.dreamstime.com/b/dietary-supplements-variety-pills-vitamin-capsules-d-34701589.jpg',
  },
  {
    title: 'Nutritional Drinks',
    slug: 'nutritional-drinks',
    image: 'https://media.istockphoto.com/id/1431990083/photo/various-protein-sport-shake-and-powder-fitness-food-and-drink.jpg?s=612x612&w=0&k=20&c=62R4BNXyri31uU2x_rRFjnMKmIgG147z72KplOW4LGo=',
  },
  {
    title: 'Skin Care',
    slug: 'skin-care-products',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT0JCBajzUiJy7UXvTFe7fb0vKiOR_R-snRufP_yXjxjPmElhqtNtkB-hk&s=10',
  },
  {
    title: 'Hair Care',
    slug: 'healthy-hair-starts-here',
    image: 'https://media.istockphoto.com/id/486383134/photo/dyed-hair-mirror.jpg?s=612x612&w=0&k=20&c=9EKrxFGillVAto2pmN2y7DmdgDdwLfD8fivLzbE52zY=',
  },
  {
    title: 'Sexual Wellness',
    slug: 'sexual-wellness',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRznYqUgzf3LCpP0WuloitJxm7dna8TtucQc6QcpGAJJtlb77IS9pY2lfU&s=10',
  },
  {
    title: 'Herbal Products',
    slug: 'herbal-best-medicines',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyVPp2i9VWjPI2-ov4e1F2G7muQyuf1jTIta3bkkv3C8Iu9sAz5hkUljUQ&s=10',
  },
  {
    title: 'Pain Relief',
    slug: 'pain-relief-essentials',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcScT9noIZJiZqzUDERmWINllBAfUbh-3pLWUhkM1N1Ufm1kdIMjV4pAzMI&s=10',
  },
  {
    title: 'Homeopathy',
    slug: 'homeopathy-best-medicines',
    image: 'https://homeopathycanada.com/wp-content/uploads/2025/06/How-Homeopathy-Complements-Conventional-Medicine.webp',
  },
];

export default function PopularCategories() {
  return (
    <section className="px-4 sm:px-6 py-4 bg-white">
      <div className="mx-auto max-w-[1360px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">
            Popular categories
          </h2>
        </div>

        {/* 9 Categories grid */}
        <div className="grid grid-cols-3 sm:grid-cols-9 gap-3 sm:gap-4 text-center">
          {popularCategories.map((item) => (
            <Link
              key={item.title}
              href={`/collections/${item.slug}`}
              className="group flex flex-col items-center text-center cursor-pointer"
            >
              <div
                className={`h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-2xl border border-gray-100 shadow-xs transition group-hover:scale-105 group-hover:shadow-md ${
                  item.fallbackBg || 'bg-gray-100'
                }`}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              </div>

              <span className="mt-2 text-xs font-semibold text-gray-800 leading-tight group-hover:text-[#ff6f61] transition">
                {item.title}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}