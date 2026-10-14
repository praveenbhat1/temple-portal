import { NextResponse } from "next/server";
import { isAdminConfigured, verifyAdminRequest } from "@/lib/firebaseAdmin";
import { isRazorpayConfigured, isRazorpayWebhookConfigured } from "@/lib/razorpay";
import { isUpiConfigured } from "@/lib/upi";
import { messagingStatus } from "@/lib/notify";

/**
 * What is and isn't switched on, for the System Health panel in /admin.
 *
 * This exists because of a specific, expensive failure: when the Razorpay keys
 * or FIREBASE_SERVICE_ACCOUNT are missing, every booking attempt fails with a 503
 * and the devotee sees only "Online booking isn't switched on yet". Nothing on
 * the site told the temple *why*, so the site could sit dead for days.
 *
 * It reports booleans and never the values themselves, so it can say a
 * credential is present without becoming a way to read it. Still admin-only:
 * knowing which defences are off is useful to an attacker too.
 */
export async function GET(req: Request) {
  const adminEmail = await verifyAdminRequest(req);
  if (!adminEmail) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const messaging = messagingStatus();
  const serverConfigured = isAdminConfigured();
  const paymentsConfigured = isRazorpayConfigured();
  const webhookConfigured = isRazorpayWebhookConfigured();
  const donationUpiConfigured = isUpiConfigured();

  const checks = [
    {
      id: "server-firebase",
      label: "Server database access",
      ok: serverConfigured,
      required: true,
      detail: serverConfigured
        ? "Bookings can be saved and confirmed."
        : "FIREBASE_SERVICE_ACCOUNT is not set. Bookings, confirmations and the Track Seva page are all offline.",
      fix: "Firebase Console → Project Settings → Service Accounts → Generate new private key, then paste the JSON (or its base64) into FIREBASE_SERVICE_ACCOUNT.",
    },
    {
      id: "payments",
      label: "Seva payments (Razorpay)",
      ok: paymentsConfigured,
      required: true,
      detail: paymentsConfigured
        ? "Devotees pay by GPay, PhonePe or any UPI app through Razorpay, and bookings confirm themselves."
        : "The Razorpay keys are not set, so no devotee can complete a booking.",
      fix: "Razorpay Dashboard → Account & Settings → API Keys → Generate key. Put the Key Id in NEXT_PUBLIC_RAZORPAY_KEY_ID and the Key Secret in RAZORPAY_KEY_SECRET.",
    },
    {
      id: "razorpay-webhook",
      label: "Razorpay webhook",
      ok: webhookConfigured,
      required: false,
      detail: webhookConfigured
        ? "A devotee who pays and closes the tab still gets their booking confirmed."
        : "Not set up. If a devotee closes the page before checkout returns, their paid booking stays pending until you mark it paid by hand.",
      fix: "Razorpay Dashboard → Account & Settings → Webhooks → Add: URL https://<your-site>/api/razorpay/webhook, event payment.captured, and a secret. Put the same secret in RAZORPAY_WEBHOOK_SECRET.",
    },
    {
      id: "donation-upi",
      label: "Donation UPI id",
      ok: donationUpiConfigured,
      required: false,
      detail: donationUpiConfigured
        ? "The Donate page shows the temple's UPI id and QR."
        : "Not set. The Donate page shows bank transfer details only.",
      fix: "Set TEMPLE_UPI_ID to the temple's UPI id (for example temple@sbi), and TEMPLE_UPI_NAME to the name donors should see in their UPI app.",
    },
    {
      id: "whatsapp",
      label: "Automatic WhatsApp messages",
      ok: messaging.whatsapp,
      required: false,
      detail: messaging.whatsapp
        ? "Devotees are messaged automatically when a booking is confirmed."
        : "Not set up. Confirmations are sent by tapping the WhatsApp button on each booking, which is free and works today.",
      fix: "Optional. Set WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_TEMPLATE_NAME from a Meta WhatsApp Cloud API account.",
    },
    {
      id: "sms",
      label: "Automatic SMS",
      ok: messaging.sms,
      required: false,
      detail: messaging.sms
        ? "SMS is available as a fallback for devotees without WhatsApp."
        : "Not set up. Optional fallback for devotees who don't use WhatsApp.",
      fix: "Optional. Set MSG91_AUTH_KEY (with MSG91_TEMPLATE_ID and MSG91_SENDER_ID) or FAST2SMS_API_KEY.",
    },
    {
      id: "push",
      label: "Browser push notifications",
      // Working either way: without a project key the Firebase SDK uses its
      // own default VAPID key, which FCM accepts.
      ok: true,
      required: false,
      detail: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim()
        ? "Devotees can subscribe, using the temple's own Web Push certificate."
        : "Devotees can subscribe, using the Firebase SDK's default Web Push key.",
      fix: "Optional hardening: Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → Generate key pair, then set NEXT_PUBLIC_FIREBASE_VAPID_KEY to tie subscriptions to this project alone.",
    },
  ];

  const blocking = checks.filter((c) => c.required && !c.ok);

  return NextResponse.json({
    ok: blocking.length === 0,
    checks,
    // The one line the dashboard shows when something is actually broken.
    headline:
      blocking.length === 0
        ? "Everything required is configured."
        : `${blocking.length} setting${blocking.length > 1 ? "s" : ""} must be fixed before devotees can book.`,
  });
}
