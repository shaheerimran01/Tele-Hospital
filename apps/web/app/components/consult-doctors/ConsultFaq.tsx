'use client';

import { useState } from 'react';

export default function ConsultFaq() {
  const faqs = [
    {
      question:
        "When will I get an answer to my query? What happens if I don't get a response?",
      answer:
        'You will typically receive an initial response from a qualified doctor within 15 to 30 minutes of placing your consultation request. In the rare event that no doctor responds within the promised time frame, you can opt to connect with another available specialist immediately or receive a 100% full refund.',
    },
    {
      question: 'Who are the consulting doctors?',
      answer:
        'All consulting doctors on our platform are verified Medical Council registered MBBS, MD, and MS specialists with verified credentials and extensive clinical experience. You can view each doctor’s qualifications, registrations, and patient reviews prior to consulting.',
    },
    {
      question: 'Will the doctor be able to resolve my issue?',
      answer:
        'Our doctors can diagnose, guide, and treat a wide spectrum of acute and chronic health issues including fevers, infections, skin conditions, allergies, pediatrics, and chronic conditions. If your condition requires physical examination or emergency care, our doctors will guide you to nearest facility.',
    },
    {
      question: 'Is my consultation private with my doctor?',
      answer:
        'Yes, 100%. All chats, audio/video calls, uploaded medical records, and prescriptions are protected with end-to-end 256-bit encryption. Your medical data is strictly confidential, and you can delete chat histories whenever you want.',
    },
    {
      question: 'For how long is the consultation valid?',
      answer:
        'Every consultation comes with 3 days of complimentary free follow-up access. You can ask follow-up questions, share progress reports, or request medicine dosage clarifications with your doctor without paying any additional fee.',
    },
    {
      question: 'Do you have a refund policy?',
      answer:
        'Yes, we have a transparent refund policy. If you are unsatisfied with your consultation experience or if a consultation could not be completed due to technical or scheduling issues, our support team will process a full refund within 3-5 business days.',
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section className="py-14 bg-white">
      <div className="mx-auto max-w-[1000px] px-4 sm:px-6">
        {/* Section Heading */}
        <h2 className="text-center text-2xl sm:text-3xl font-bold text-gray-900 mb-10 tracking-tight">
          Frequently Asked Questions
        </h2>

        {/* FAQ List */}
        <div className="divide-y divide-gray-200">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={faq.question} className="py-4">
                <button
                  onClick={() => toggleFaq(index)}
                  className="flex w-full items-center justify-between text-left py-2 group cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-[#ff574d] transition pr-4 leading-snug">
                    {faq.question}
                  </span>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center text-gray-700">
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

                {isOpen && (
                  <div className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed max-w-3xl pr-6 transition-all">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
