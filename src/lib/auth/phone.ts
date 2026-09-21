/**
 * Indonesian Phone Number Normalization & Validation Utility
 * Supports 08xx, 628xx, +628xx, and stripped-formatting variants.
 */

export function normalizeIndonesianPhone(phone: string): string {
  if (!phone) return '';

  // Remove non-digit characters except leading plus
  let cleaned = phone.trim().replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+62')) {
    return cleaned;
  } else if (cleaned.startsWith('62')) {
    return `+${cleaned}`;
  } else if (cleaned.startsWith('0')) {
    return `+62${cleaned.substring(1)}`;
  } else if (cleaned.startsWith('8')) {
    return `+62${cleaned}`;
  }

  return cleaned;
}

export function isValidIndonesianPhone(phone: string): boolean {
  const normalized = normalizeIndonesianPhone(phone);
  // Indonesian mobile numbers start with +628 and have 10-15 total digits (8-12 digits after +628)
  return /^\+628\d{8,12}$/.test(normalized);
}

export function formatIndonesianPhoneDisplay(phone: string): string {
  const normalized = normalizeIndonesianPhone(phone);
  if (!isValidIndonesianPhone(normalized)) return phone;

  // Format: +62 812-3456-7890
  const rest = normalized.slice(3); // e.g. 81234567890
  if (rest.length <= 4) return `+62 ${rest}`;
  if (rest.length <= 8) return `+62 ${rest.slice(0, 3)}-${rest.slice(3)}`;
  return `+62 ${rest.slice(0, 3)}-${rest.slice(3, 7)}-${rest.slice(7)}`;
}
