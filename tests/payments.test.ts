/**
 * The checks that stand between a visitor and a booking marked "paid" for
 * free. If any of these regress, money and records stop matching, so they
 * run on every `npm test`.
 *
 * Node's built-in runner with type stripping — no test framework to install.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

process.env.RAZORPAY_KEY_SECRET = "test_key_secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "test_webhook_secret";

const { verifyCheckoutSignature, verifyWebhookSignature } = await import("../lib/razorpay.ts");
const { generateBookingId, generateDonationId } = await import("../lib/bookingId.ts");
const { isValidIndianPhone, normalizePhone } = await import("../lib/utils.ts");

const sign = (secret: string, payload: string) =>
  crypto.createHmac("sha256", secret).update(payload).digest("hex");

test("checkout signature: genuine Razorpay signature is accepted", () => {
  const sig = sign("test_key_secret", "order_A|pay_B");
  assert.equal(verifyCheckoutSignature("order_A", "pay_B", sig), true);
});

test("checkout signature: forged, empty or swapped values are rejected", () => {
  const sig = sign("test_key_secret", "order_A|pay_B");
  assert.equal(verifyCheckoutSignature("order_A", "pay_B", "deadbeef"), false);
  assert.equal(verifyCheckoutSignature("order_A", "pay_B", ""), false);
  // A real signature for a different (e.g. cheaper) order proves nothing here.
  assert.equal(verifyCheckoutSignature("order_OTHER", "pay_B", sig), false);
  assert.equal(verifyCheckoutSignature("order_A", "pay_OTHER", sig), false);
  // Signed with the wrong key.
  assert.equal(verifyCheckoutSignature("order_A", "pay_B", sign("attacker", "order_A|pay_B")), false);
});

test("checkout signature: fails closed when the secret is missing", () => {
  const saved = process.env.RAZORPAY_KEY_SECRET;
  delete process.env.RAZORPAY_KEY_SECRET;
  try {
    // An empty-key HMAC is computable by anyone; it must not verify.
    assert.equal(verifyCheckoutSignature("order_A", "pay_B", sign("", "order_A|pay_B")), false);
  } finally {
    process.env.RAZORPAY_KEY_SECRET = saved;
  }
});

test("webhook signature: covers the exact raw body", () => {
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1", amount: 100 } } } });
  const sig = sign("test_webhook_secret", body);
  assert.equal(verifyWebhookSignature(body, sig), true);
  // Changing the amount after signing must break it.
  assert.equal(verifyWebhookSignature(body.replace('"amount":100', '"amount":1'), sig), false);
  assert.equal(verifyWebhookSignature(body, sign("test_key_secret", body)), false);
});

test("references: unambiguous alphabet, right prefixes, effectively unique", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 2000; i++) {
    const id = generateBookingId();
    assert.match(id, /^SV-[A-HJ-NP-Z2-9]{6}$/);
    seen.add(id);
  }
  assert.ok(seen.size > 1990, "booking ids should not collide in a small batch");
  assert.match(generateDonationId(), /^DN-[A-HJ-NP-Z2-9]{6}$/);
});

test("phone validation: accepts Indian mobiles in common formats, rejects the rest", () => {
  for (const ok of ["9876543210", "+91 98765 43210", "919876543210", "6123456789"]) {
    assert.equal(isValidIndianPhone(ok), true, ok);
    assert.equal(normalizePhone(ok), `+91${ok.replace(/\D/g, "").slice(-10)}`);
  }
  for (const bad of ["12345", "5876543210", "98765432101", "abcdefghij", ""]) {
    assert.equal(isValidIndianPhone(bad), false, bad);
  }
});
