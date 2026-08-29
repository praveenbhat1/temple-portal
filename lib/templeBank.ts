/**
 * The temple's bank account — the single source of truth for it.
 *
 * These details are deliberately public: they are printed on the site so
 * devotees can transfer directly, the same way they are printed on a donation
 * board at the temple.
 *
 * It lives in one file because it previously did not. The donate page and the
 * seva board hardcoded this Canara Bank account, while the booking flow's
 * bank-transfer panel showed a completely different SBI account under a
 * different name. A devotee reading one page and paying from another would
 * have sent money to the wrong place, so every surface now imports from here.
 *
 * Anything not needed to *receive* money stays out (a CIF number, for
 * instance) — publishing it adds nothing and gives something away.
 */
export const TEMPLE_BANK = {
  accountName: "Sunkadakatte Sri Vinayaka Temple",
  accountNumber: "01442200022013",
  accountType: "Savings Account",
  bankName: "Canara Bank",
  branch: "Kallianpur II",
  ifsc: "CNRB0010144",
} as const;

/** "Canara Bank, Kallianpur II" — the form used in running text. */
export const TEMPLE_BANK_LINE = `${TEMPLE_BANK.bankName}, ${TEMPLE_BANK.branch}`;
