/**
 * The temple's bank account, shown on the site as a manual transfer fallback
 * for devotees who don't use UPI.
 *
 * These details are deliberately public — they are printed on the site so
 * devotees can transfer directly, the same way they are printed on a donation
 * board at the temple.
 *
 * The CIF number from the passbook is deliberately NOT here: it is an internal
 * SBI customer id, it is not needed to receive money, and it should not be
 * published.
 *
 * NOTE: the account is registered as "Shri Mahaganapathi Temple", which is not
 * the name the site uses elsewhere ("Sunkadakatte Sri Vinayaka Temple"). The
 * registered name is shown verbatim on purpose — a devotee whose banking app
 * confirms a different beneficiary name than the site led them to expect will
 * reasonably assume something is wrong and abandon the transfer.
 */
export const TEMPLE_BANK = {
  accountName: "Shri Mahaganapathi Temple",
  accountNumber: "41254188861",
  accountType: "Current Account",
  bankName: "State Bank of India",
  branch: "Santhekatte",
  ifsc: "SBIN0004606",
} as const;
