import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Sunkadakatte Sri Vinayaka Temple",
  description: "What personal information this website collects when you book a seva or donate, and how it is used.",
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage eyebrow="Policies" title="Privacy Policy" updated="16 October 2026">
      <p>
        Sunkadakatte Sri Vinayaka Temple (&ldquo;the temple&rdquo;, &ldquo;we&rdquo;) runs this
        website so devotees can book sevas, make offerings and follow temple news. This page
        explains what information we collect, why, and what we do with it. We handle personal data
        in line with India&apos;s Digital Personal Data Protection Act, 2023.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>When you book a seva:</strong> your name, mobile number, optional email address,
          the sevas you chose and the date you want them performed.
        </li>
        <li>
          <strong>When you pay:</strong> the amount, the booking reference and the payment
          reference Razorpay gives us. <strong>We never see or store your UPI PIN, bank account
          details or card number</strong> — payment is handled entirely by Razorpay.
        </li>
        <li>
          <strong>If you turn on temple alerts:</strong> a notification token for your browser, so
          we can send announcements. You can turn this off in your browser at any time.
        </li>
      </ul>
      <p>We do not use advertising trackers and we do not sell or rent your information to anyone.</p>

      <h2>Why we use it</h2>
      <ul>
        <li>To record your booking and perform the seva on the date you chose.</li>
        <li>To confirm your booking and send your receipt, by WhatsApp or SMS on the number you gave.</li>
        <li>To let you look up your booking on the Track Seva page.</li>
        <li>To contact you if a seva has to be moved or cancelled, and to process refunds.</li>
        <li>To keep the temple&apos;s accounts.</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>Only with the services that make the website work, and only what each one needs:</p>
      <ul>
        <li><strong>Razorpay</strong> — to take your payment.</li>
        <li><strong>Google Firebase</strong> — where booking records are stored securely.</li>
        <li><strong>Vercel</strong> — which hosts the website.</li>
        <li><strong>WhatsApp / SMS providers</strong> — to deliver your booking confirmation.</li>
      </ul>
      <p>We may also share information where the law requires it.</p>

      <h2>How long we keep it</h2>
      <p>
        Booking and payment records are kept for as long as the temple needs them for its accounts
        and as required by law (usually up to 8 years for financial records). After that they are
        deleted.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask us to show you the information we hold about you, correct it, or delete it
        where we are not required to keep it. Contact the temple office using the details below.
      </p>

      <h2>Children</h2>
      <p>Bookings should be made by an adult. A booking may be made on behalf of a child.</p>

      <h2>Changes to this policy</h2>
      <p>If this policy changes, the new version will be posted here with a new &ldquo;last updated&rdquo; date.</p>
    </PolicyPage>
  );
}
