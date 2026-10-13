// Small presentational building blocks shared by the Join Now form.

export const inputClass =
  'w-full rounded-lg border border-[#d9d3c6] bg-white px-3 py-2.5 text-sm text-[#141b34] placeholder:text-gray-400 outline-none transition focus:border-[#141b34] focus:ring-2 focus:ring-[#141b34]/10 disabled:bg-gray-50';

export const inputErrorClass = 'border-red-400 focus:border-red-500 focus:ring-red-500/10';

export function FormSection({
  id,
  title,
  subtitle,
  children,
}: {
  id?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-2xl border border-[#e7e2d8] bg-white px-4 py-5 shadow-[0_1px_2px_rgba(20,27,52,0.04)] sm:px-7 sm:py-7"
    >
      <header className="border-b border-[#e7e2d8] pb-4">
        <h2 className="text-lg font-semibold text-[#141b34]">{title}</h2>
        <p className="mt-1 text-sm text-[#6b6f80]">{subtitle}</p>
      </header>
      <div className="pt-5">{children}</div>
    </section>
  );
}

export function Field({
  id,
  errorKey,
  label,
  required,
  hint,
  error,
  className = '',
  children,
}: {
  id: string;
  /** Key used in the errors map (defaults to id); lets "scroll to first error" find it. */
  errorKey?: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className} id={`field-${errorKey ?? id}`}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-[#3a3f52]">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
        {hint && <span className="ml-1 font-normal text-[#8a8d99]">{hint}</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Checkbox styled like the screenshots (navy when ticked). */
export function Checkbox({
  id,
  checked,
  onChange,
  label,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="inline-flex cursor-pointer select-none items-center gap-2.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 cursor-pointer rounded border-[#b9b3a5] accent-[#141b34]"
      />
      {label ?? children}
    </label>
  );
}
