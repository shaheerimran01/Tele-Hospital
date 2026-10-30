// Pakistani mobile numbers in the formats the platform deals with.
//
//   input                    national       E.164 (stored)     WhatsApp API "to"
//   03001234567              3001234567     +923001234567      923001234567
//   +92 300 1234567          3001234567     +923001234567      923001234567
//   923001234567 / 0092...   3001234567     +923001234567      923001234567

/** "0300-1234567" -> "3001234567", or null when it isn't a Pakistani mobile number */
export function pkNationalNumber(input: string | null | undefined): string | null {
  let digits = String(input ?? '').replace(/\D/g, '');
  if (digits.startsWith('0092')) digits = digits.slice(4);
  else if (digits.startsWith('92') && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.replace(/^0+/, '');
  return /^3\d{9}$/.test(digits) ? digits : null;
}

/** "03001234567" -> "923001234567" (Meta WhatsApp Cloud API format: no "+", no leading zero) */
export function toWhatsAppNumber(input: string | null | undefined): string | null {
  const national = pkNationalNumber(input);
  return national ? `92${national}` : null;
}

/** "03001234567" -> "+923001234567" (how phones are stored across Tabibistan) */
export function toE164Pk(input: string | null | undefined): string | null {
  const national = pkNationalNumber(input);
  return national ? `+92${national}` : null;
}

/** Every way the same number may already be stored in older rows */
export function pkPhoneVariants(input: string | null | undefined): string[] {
  const n = pkNationalNumber(input);
  if (!n) return [];
  return [`+92${n}`, `92${n}`, `0${n}`, n, `+92 ${n.slice(0, 3)} ${n.slice(3)}`, `0${n.slice(0, 3)} ${n.slice(3)}`];
}

/** "+923001234567" -> "+92 300 ***4567" (safe for logs) */
export function maskPhone(input: string | null | undefined): string {
  const n = pkNationalNumber(input);
  return n ? `+92 ${n.slice(0, 3)} ***${n.slice(6)}` : '(invalid number)';
}
