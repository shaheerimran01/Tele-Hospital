'use client';

/** Accessible on/off switch */
export default function Toggle({
  checked,
  onChange,
  label,
  disabled,
  size = 'md',
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** read by screen readers */
  label: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}) {
  const track = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11';
  const knob = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const shift = size === 'sm' ? 'translate-x-4' : 'translate-x-5';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#141b34]/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${track} ${
        checked ? 'bg-[#2f7a4b]' : 'bg-[#c9c2b3]'
      }`}
    >
      <span className={`block rounded-full bg-white shadow transition ${knob} ${checked ? shift : 'translate-x-0'}`} />
    </button>
  );
}
