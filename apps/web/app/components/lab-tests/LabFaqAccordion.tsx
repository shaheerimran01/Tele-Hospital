'use client';

import { useState } from 'react';

export default function LabFaqAccordion() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section className="py-8 bg-white border-t border-gray-100">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6">
        {/* Accordion Toggle Header */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between py-3 text-left group"
        >
          <h2 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-[#ff574d] transition tracking-tight">
            Keep your health in check with Tabibistan: Lab tests just a click away
          </h2>
          <div className="flex h-6 w-6 items-center justify-center text-gray-600">
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Content Body */}
        {isOpen && (
          <div className="mt-4 space-y-6 text-xs sm:text-[13px] text-gray-600 leading-relaxed max-w-5xl">
            {/* Subsection 1 */}
            <div>
              <h3 className="font-bold text-gray-900 text-xs sm:text-[13px] mb-1.5">
                Tabibistan brings care to health
              </h3>
              <p>
                Tabibistan is India&apos;s leading digital healthcare platform. From ordering medicines online to consulting doctors online, Tabibistan is that one place that aims to fulfill all your health needs within the comfort of your home. In fact, you don&apos;t even need to visit the diagnostic labs to get tests done. Tabibistan has got that covered too.
              </p>
            </div>

            {/* Subsection 2 */}
            <div>
              <h3 className="font-bold text-gray-900 text-xs sm:text-[13px] mb-1.5">
                Tabibistan: Lab tests now at your doorstep
              </h3>
              <p className="mb-2">
                Spending hours in a queue at a diagnostic lab or a hospital is now a thing of the past. With more than 45,00,000 lab tests booked, Tabibistan labs is on a mission to give you a flawless healthcare experience by bringing &apos;care&apos; to &apos;health&apos;.
              </p>
              <p className="mb-2">
                With Tabibistan labs, you can choose the diagnostic lab of your preference and get the hassle-free experience of a diagnostic center at the comfort of your home. You can choose the diagnostic lab of your choice and get your lab tests done at discounted prices with the quality of service kept intact.
              </p>
              <p>
                Wondering how to book a lab test? It&apos;s simple. You just need to search and add your tests, select the lab of your choice and schedule your test as per your suitable time slot. Once your test gets confirmed, a phlebotomist will be assigned to collect a sample from your home.
              </p>
            </div>

            {/* Subsection 3 */}
            <div>
              <h3 className="font-bold text-gray-900 text-xs sm:text-[13px] mb-1.5">
                Need more help?
              </h3>
              <p>
                Just give us a call <span className="font-bold text-gray-800">(18002122323)</span> and we will help you complete your order.
              </p>
            </div>

            {/* Subsection 4 */}
            <div>
              <h3 className="font-bold text-gray-900 text-xs sm:text-[13px] mb-1.5">
                Certified labs: For accessible and affordable experience
              </h3>
              <p>
                We partner with various recognized diagnostic labs to make sure that you have a safe and smooth experience. To ensure quality and hygiene in sample collection and high accuracy in results, we partner with labs that are certified by international bodies like ISO (International Organization for Standardization), NABL (National Accreditation Board for testing and calibration laboratories) and CAP (College of American Pathologists).
              </p>
            </div>

            {/* Subsection 5 */}
            <div>
              <h3 className="font-bold text-gray-900 text-xs sm:text-[13px] mb-1.5">
                The services we offer
              </h3>
              <p className="mb-2">
                As India&apos;s leading digital healthcare platforms, your health is our utmost priority. Apart from facilitating pathological tests, Tabibistan is your one-stop place for booking radiology tests such as MRIs and CT scans. Not just this, we also offer a free package of diabetes tests for members of the Diabetes Care Plan.
              </p>
              <p className="mb-2">
                With a presence in cities like Delhi, Gurgaon, Noida, Mumbai, Pune, Hyderabad, Bangalore, Chennai, etc., through Tabibistan, you can avail over 2,000 tests and get tested by 120+ top, verified labs at the best prices. You even have the option to compare tests and packages based on prices and lab ratings and choose accordingly.
              </p>
              <p className="mb-2">
                Need help with lab test results? Talk to more than 20 kinds of specialists on Tabibistan and get your results verified by them. We have been making healthcare affordable and accessible since the day we started. We aim to bring care to health and continue doing so until everyone is well.
              </p>
              <p className="font-medium text-gray-800">
                Customer centricity is the core of our values. Our team of highly trained and experienced doctors, phlebotomists and pharmacists look into each order to give you a fulfilling experience. Explore our labs now and book your tests today. Stay Healthy!
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
