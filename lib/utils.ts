/**
 * Utilities for phone number normalization and validation.
 */

/**
 * Normalizes an Indian phone number to the format +91XXXXXXXXXX.
 * Removes spaces, dashes, and ensures it starts with +91.
 */
export function normalizePhone(phone: string): string {
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, "");

  // If it starts with 0, remove it
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }

  // If it starts with 91 but no +, add +
  if (cleaned.startsWith("91") && cleaned.length === 12 && !cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }

  // If it's 10 digits, add +91
  if (cleaned.length === 10 && /^\d+$/.test(cleaned)) {
    cleaned = "+91" + cleaned;
  }

  // Ensure it starts with +91
  if (!cleaned.startsWith("+91")) {
    // If it doesn't have a +, and it's longer than 10 digits, it might have a country code
    // But we focus on Indian numbers as per requirements
    if (cleaned.length > 10 && !cleaned.startsWith("+")) {
      cleaned = "+" + cleaned;
    }
  }

  return cleaned;
}

/**
 * Validates if a string is a valid Indian mobile number.
 */
export function isValidIndianPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  // Matches +91 followed by 10 digits (starting with 6-9)
  return /^\+91[6789]\d{9}$/.test(normalized);
}
