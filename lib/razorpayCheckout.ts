"use client";
/**
 * Razorpay Checkout in the browser — shared by seva bookings and donations so
 * both load the script the same way and show the same UPI-only checkout.
 * Nothing secret lives here: the key id is public by design.
 */

export type CheckoutResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

/** Only the fields we actually pass to Razorpay Checkout. */
interface RazorpayOptions {
  key: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: CheckoutResponse) => void;
  prefill?: { name?: string; contact?: string; email?: string };
  notes?: Record<string, string>;
  config?: unknown;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: "payment.failed", handler: (r: { error?: { description?: string } }) => void) => void;
    };
  }
}

const RAZORPAY_SRC = "https://checkout.razorpay.com/v1/checkout.js";

/**
 * Resolve once the checkout script is genuinely ready. Using window.Razorpay
 * before the script finished loading is what used to make checkout silently
 * fail to open on a slow connection.
 */
export function loadRazorpay(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();

    const existing = document.getElementById("razorpay-script") as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => (window.Razorpay ? resolve() : reject(new Error("no_global"))), { once: true });
    script.addEventListener("error", () => reject(new Error("script_blocked")), { once: true });
    if (!existing) {
      script.id = "razorpay-script";
      script.src = RAZORPAY_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
    window.setTimeout(() => reject(new Error("script_timeout")), 15000);
  });
}

/**
 * Show only UPI in the checkout — GPay, PhonePe, Paytm, any UPI app, or a QR
 * on desktop. Cards and netbanking are hidden here; switch them off in the
 * Razorpay dashboard too, since this only governs what the checkout displays.
 *
 * With test keys a card is offered as well. Desktop test checkout shows only a
 * UPI QR, which no real app can pay, so without the test card there is no way
 * to complete a payment end to end. Verification is the same for every method.
 */
export function checkoutConfig(keyId: string) {
  const testMode = keyId.startsWith("rzp_test_");
  return {
    display: {
      blocks: {
        upi: { name: "Pay with UPI", instruments: [{ method: "upi" }] },
        ...(testMode && { card: { name: "Test card", instruments: [{ method: "card" }] } }),
      },
      sequence: testMode ? ["block.upi", "block.card"] : ["block.upi"],
      preferences: { show_default_blocks: false },
    },
  };
}
