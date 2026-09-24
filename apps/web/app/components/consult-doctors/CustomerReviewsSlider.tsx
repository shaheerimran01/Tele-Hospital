'use client';

import { useState, useEffect, useCallback } from 'react';

export default function CustomerReviewsSlider() {
  const reviews = [
    {
      id: 1,
      text: 'Dr. Chakraborty is so concerned about his patient. I sincerely wish him the best. He always takes the time to understand the problem and on the basis of that he takes the decision and explains it very well. And if you miss out on anything, you can come back with more questions.',
      author: 'Yash',
    },
    {
      id: 2,
      text: 'Consulting Dr. Sharma online saved me hours of waiting in a crowded clinic. He diagnosed my skin allergy quickly and prescribed an effective treatment that cleared the rash in just two days. The 3-day free follow-up is an amazing feature!',
      author: 'Priya M.',
    },
    {
      id: 3,
      text: 'I was hesitant about online doctor consultations initially, but the pediatrician was so patient and thorough with my 3-year-old daughter. She guided us through fever management step-by-step and followed up the next morning. Truly remarkable care!',
      author: 'Arun K.',
    },
    {
      id: 4,
      text: 'Extremely quick and hassle-free service. Got connected with an experienced physician in under 15 minutes. The digital prescription was verified, clear, and accepted at the pharmacy instantly without any problems.',
      author: 'Meera Nair',
    },
    {
      id: 5,
      text: 'Dr. Ananya took the time to review all my previous blood test reports in detail before advising me. She explained my lifestyle modifications so clearly and empathetically. It felt just like sitting in an in-person clinic!',
      author: 'Rohan V.',
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev === reviews.length - 1 ? 0 : prev + 1));
  }, [reviews.length]);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
  };

  // Auto-sliding every 5 seconds unless hovered
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  return (
    <section className="py-14 bg-white">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6">
        {/* Section Heading */}
        <h2 className="text-center text-2xl sm:text-3xl font-bold text-gray-900 mb-10 tracking-tight">
          Our Happy Customers
        </h2>

        {/* Carousel Container */}
        <div
          className="relative mx-auto max-w-3xl px-12"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Previous Arrow Button */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-2xs hover:border-gray-400 hover:text-gray-900 transition cursor-pointer"
            aria-label="Previous review"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Review Card with Animated Transition */}
          <div className="min-h-[160px] flex flex-col items-center justify-center text-center">
            <p className="text-sm sm:text-base leading-relaxed text-gray-600 max-w-2xl font-normal transition-opacity duration-300">
              {reviews[currentIndex].text}
            </p>

            <span className="mt-6 text-xs sm:text-sm font-semibold text-gray-500">
              {reviews[currentIndex].author}
            </span>
          </div>

          {/* Next Arrow Button */}
          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-2xs hover:border-gray-400 hover:text-gray-900 transition cursor-pointer"
            aria-label="Next review"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Pagination Indicator Dots */}
          <div className="mt-8 flex justify-center items-center gap-2">
            {reviews.map((review, idx) => (
              <button
                key={review.id}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  currentIndex === idx
                    ? 'w-6 bg-[#ff6f61]'
                    : 'w-2 bg-gray-200 hover:bg-gray-300'
                }`}
                aria-label={`Go to review ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
