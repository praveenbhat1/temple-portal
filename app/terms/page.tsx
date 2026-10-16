import type { Metadata } from "next";
import Link from "next/link";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Terms & Conditions | Sunkadakatte Sri Vinayaka Temple",
  description: "The terms for booking sevas and making offerings on this website.",
};

export default function TermsPage() {
  return (
    <PolicyPage eyebrow="Policies" title="Terms & Conditions" updated="16 October 2026">
      <p>
        These terms apply when you use this website, book a seva or make an offering to
        Sunkadakatte Sri Vinayaka Temple, Kallianpur Main Road, near Santhekatte, Udupi, Karnataka.
        By booking or paying on this site you agree to them.
      </p>

      <h2>Seva bookings</h2>
      <ul>
        <li>
          A booking is confirmed only when your payment succeeds. You will see a confirmation on
          screen with a booking reference (SV-XXXXXX), and can download a receipt.
        </li>
        <li>
          Please give a correct name and a mobile number you can be reached on. We use them to
          confirm your booking and to contact you if anything changes.
        </li>
        <li>
          Some sevas are performed only on particular days (for example, Sankashta Chaturthi) or at
          particular times. These are noted beside the seva. The temple performs the seva on the
          date you choose where the ritual calendar allows; if it cannot, we will contact you.
        </li>
        <li>
          Sevas are performed by the temple priests according to the temple&apos;s traditions. The
          temple decides how each seva is conducted.
        </li>
      </ul>

      <h2>Charges</h2>
      <ul>
        <li>All charges are in Indian Rupees and are shown before you pay.</li>
        <li>
          Seva charges may be revised from time to time. The price you pay is the one shown when you
          book; later changes do not affect a confirmed booking.
        </li>
        <li>There is no charge for Hannu Kai (coconut, bananas, flowers). Devotees bring these themselves.</li>
      </ul>

      <h2>Payments</h2>
      <p>
        Payments are made by UPI through Razorpay, a payment gateway regulated in India. The temple
        does not receive or store your UPI PIN or bank details. Razorpay&apos;s own terms also apply
        to the payment.
      </p>

      <h2>Prasada and visiting</h2>
      <p>
        Prasada for a seva is collected in person at the temple. Nothing is shipped or delivered.
        Please follow the temple&apos;s customs and the instructions of temple staff when you visit.
      </p>

      <h2>Cancellations and refunds</h2>
      <p>
        See our{" "}
        <Link href="/refund-policy" className="text-saffron-700 font-medium underline underline-offset-2">
          Refund &amp; Cancellation Policy
        </Link>
        .
      </p>

      <h2>Using this website</h2>
      <ul>
        <li>Please do not misuse the site, attempt to interfere with it, or make false bookings.</li>
        <li>
          Photographs and text on this site belong to the temple. Gallery images may be downloaded
          for personal, devotional use.
        </li>
        <li>
          We try to keep the site accurate and available, but cannot promise it will always be free
          of errors or interruptions.
        </li>
      </ul>

      <h2>Liability</h2>
      <p>
        If something goes wrong with a booking, the temple&apos;s responsibility is limited to
        performing the seva on another date or refunding the amount you paid for it.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India. Disputes are subject to the courts at Udupi, Karnataka.</p>

      <h2>Changes</h2>
      <p>We may update these terms. The version on this page on the day you book is the one that applies.</p>
    </PolicyPage>
  );
}
