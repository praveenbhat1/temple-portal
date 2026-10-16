import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | Sunkadakatte Sri Vinayaka Temple",
  description: "How seva cancellations, rescheduling and refunds work for bookings made on this website.",
};

export default function RefundPolicyPage() {
  return (
    <PolicyPage eyebrow="Policies" title="Refund & Cancellation" updated="16 October 2026">
      <p>
        This policy covers sevas booked and donations made on this website. Payments are made by
        UPI through Razorpay, our payment partner. We want every devotee to be treated fairly, and
        these rules exist so that requests can be handled quickly and consistently.
      </p>

      <h2>Cancelling a seva</h2>
      <ul>
        <li>
          <strong>48 hours or more before the seva date:</strong> you may cancel for a full refund.
        </li>
        <li>
          <strong>Less than 48 hours before the seva date:</strong> preparations for the seva will
          usually have begun, so a refund is not possible. You may instead ask to move the seva to
          another date, once, subject to availability.
        </li>
        <li>
          <strong>After the seva has been performed:</strong> no refund or reschedule is possible.
        </li>
      </ul>
      <p>
        To cancel or reschedule, contact the temple office with your <strong>booking reference</strong>{" "}
        (it looks like SV-XXXXXX and is on your receipt) and the mobile number you booked with.
      </p>

      <h2>If the temple cancels</h2>
      <p>
        If the temple has to cancel a seva for any reason, we will tell you and offer either a new
        date or a full refund — your choice.
      </p>

      <h2>Failed, duplicate or wrong payments</h2>
      <ul>
        <li>
          If money was debited but your booking was not confirmed, the payment is refunded
          automatically by Razorpay, normally within 5–7 working days. If it is not, contact us
          with the date, amount and your UPI reference number.
        </li>
        <li>If you were charged twice for the same booking, the extra payment is refunded in full.</li>
      </ul>

      <h2>Donations</h2>
      <p>
        Donations are voluntary offerings and are not refundable. If you donated the wrong amount or
        donated twice by mistake, contact us within 7 days and we will refund the mistaken amount.
      </p>

      <h2>How refunds are paid</h2>
      <p>
        Approved refunds are returned to the same UPI account the payment came from. We start the
        refund within 3 working days of approving it; your bank usually credits it within a further
        5–7 working days. We do not refund in cash or to a different account.
      </p>

      <h2>Offerings you bring</h2>
      <p>
        There is no charge for Hannu Kai (coconut, bananas, flowers) and nothing to refund for them.
        Devotees bring these offerings themselves.
      </p>
    </PolicyPage>
  );
}
