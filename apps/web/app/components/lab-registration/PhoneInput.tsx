'use client';

// Country code picker + national number; shows the international form (+923001234567) once valid.

import { Check } from 'lucide-react';
import { COUNTRY_CODES, whatsappE164 } from './form-model';
import { inputClass, inputErrorClass } from '../consult-doctors/join-now/ui';

interface Props {
  id: string;
  country: string;
  number: string;
  invalid?: boolean;
  onCountry: (iso: string) => void;
  onNumber: (value: string) => void;
}

export default function PhoneInput({ id, country, number, invalid, onCountry, onNumber }: Props) {
  const e164 = whatsappE164(country, number);
  const dial = COUNTRY_CODES.find((c) => c.iso === country)?.dial ?? '';
  return (
    <div>
      <div className="flex gap-2">
        <label htmlFor={`${id}-country`} className="sr-only">
          Country code
        </label>
        <select
          id={`${id}-country`}
          value={country}
          onChange={(e) => onCountry(e.target.value)}
          className={`${inputClass.replace('w-full', 'w-[7.5rem]')} shrink-0 pr-7`}
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.iso} value={c.iso} title={c.name}>
              {c.iso} +{c.dial}
            </option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={number}
          onChange={(e) => onNumber(e.target.value)}
          placeholder={country === 'PK' ? '300 1234567' : 'Mobile number'}
          aria-invalid={invalid}
          className={`${inputClass} min-w-0 ${invalid ? inputErrorClass : ''}`}
        />
      </div>
      <p className="mt-1 flex items-center gap-1 text-[11px] text-[#8a8d99]">
        {e164 ? (
          <>
            <Check className="h-3 w-3 text-[#2f7a4b]" /> Will be saved as <span className="font-medium text-[#3a3f52]">{e164}</span>
          </>
        ) : (
          <>Number with WhatsApp, without the leading 0 (+{dial} is added automatically)</>
        )}
      </p>
    </div>
  );
}
