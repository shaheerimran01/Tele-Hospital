'use client';

export default function CarePlanStrip() {
  return (
    <div className="bg-[#faf4eb] border-b border-[#f0e6d5] py-2.5 px-4">
      <div className="mx-auto max-w-[1360px] flex items-center justify-center gap-3 text-center flex-wrap">
        {/* Doctor Avatar */}
        <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-white shadow-2xs shrink-0">
          <img
            src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=200&q=80"
            alt="Doctor"
            className="h-full w-full object-cover object-top"
          />
        </div>

        {/* Text */}
        <span className="text-xs sm:text-sm font-medium text-gray-800">
          Free consultation and more benefits with Care Plan membership.
        </span>

        {/* Badge & Link */}
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-[#8c3b31] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
            Care Plan
          </span>
          <button className="text-xs font-bold text-[#8c3b31] hover:underline cursor-pointer">
            Join now!
          </button>
        </div>
      </div>
    </div>
  );
}
