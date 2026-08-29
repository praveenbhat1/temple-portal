# Sunkadakatte Sri Vinayaka Temple

The temple's website: devotees browse and book sevas, pay by UPI, and track a
booking; the temple confirms payments and manages the site from `/admin`.

Built with **Next.js 16 (App Router) · TypeScript · Tailwind · Firebase**.

---

## How a booking actually works

This is the part worth understanding before changing anything, because the
whole design follows from one fact: **plain UPI has no callback.** Money moves
into the temple's bank account and this server is never told. So:

```
Devotee picks sevas
        │
        ▼
POST /api/bookings/create ──── writes a booking with paymentStatus: "pending"
        │                      prices come from the server, never the browser
        ▼
Devotee pays (GPay / PhonePe deep link, or QR, or bank transfer)
        │
        │  …nothing reports back here…
        ▼
POST /api/bookings/paid ────── devotee optionally submits their UPI reference
        │                      stored as devoteeUpiRef — an unverified claim
        ▼
Temple admin matches the credit in the bank statement
        │
        ▼
POST /api/bookings/confirm ─── admin-only, transactional
                               → paymentStatus: "success"
                               → seva counters increment
                               → devotee is messaged
                               → receipt becomes downloadable
```

Two consequences to keep in mind:

- **Only `/api/bookings/confirm` can mark a booking paid.** A devotee's browser
  saying "I paid" writes nothing that counts. `firestore.rules` denies all
  client writes to `bookings`.
- **`upiRef` and `devoteeUpiRef` are different things.** The first is what an
  admin verified against the statement and goes on the receipt. The second is
  what the devotee typed. Never let one stand in for the other.

The Razorpay gateway path is still present and working. Set
`NEXT_PUBLIC_PAYMENT_MODE=razorpay` to switch to it.

---

## Setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

`.env.example` documents every variable, which are required, and what breaks
without each one. Fill in `.env.local`.

### 2. Firebase

Create a project at [console.firebase.google.com](https://console.firebase.google.com)
and enable **Firestore**, **Authentication** (Email/Password), **Storage** and
**Cloud Messaging**.

Two sets of credentials are needed:

- **Browser** — Project Settings → General → Your apps → Web app config, into
  the `NEXT_PUBLIC_FIREBASE_*` variables.
- **Server** — Project Settings → Service Accounts → *Generate new private key*,
  into `FIREBASE_SERVICE_ACCOUNT` as either the raw JSON or its base64. Without
  this, **bookings, confirmations and the Track Seva page are all offline** —
  every booking attempt returns a 503.

### 3. Security rules

Deploy the rules **in this repository** — `firestore.rules` and `storage.rules`:

```bash
npx firebase deploy --only firestore:rules,storage:rules
```

Do not hand-write replacements. These rules are what stop a visitor forging a
paid booking, and they are commented with the reasoning behind each clause.

### 4. Admin access

An admin is a document in the Firestore `admins` collection whose **ID is their
email address**:

```
admins/priest@example.com     (the document can be empty)
```

1. Firebase Console → Authentication → add the user with a password.
2. Firestore → `admins` → add a document with that email as the document ID.
3. Sign in at `/admin/login`.

There is deliberately no env-var admin list. `NEXT_PUBLIC_*` variables ship to
every visitor's browser, so a list there could admit someone the security rules
would then reject on every write — the dashboard would load and silently fail
at each save. The `admins` collection is the single source of truth: the rules,
the API routes and the UI all read it.

### 5. UPI payments

Set `TEMPLE_UPI_ID` to the temple's UPI id (e.g. `temple@okhdfcbank`) and
`TEMPLE_UPI_NAME` to the name devotees should see in their UPI app.

> `.env.local` currently holds a **placeholder** UPI id. Replace it before going
> live — until it is a working VPA, money paid through the site goes nowhere.

The temple's bank account lives in `lib/templeBank.ts` and is imported
everywhere it is shown. Change it in that one file.

### 6. Check your work

Sign in at `/admin`. The **System Health** panel names every required setting
that is missing and how to fix it, so a misconfigured deployment announces
itself instead of just failing quietly for devotees.

---

## Telling devotees their seva is confirmed

Two paths, and the free one works with no setup:

**Click-to-send (default).** Every booking row in `/admin/bookings` has a
WhatsApp button that opens WhatsApp with the right message already typed. No
Meta account, no template approval, no per-message fee — a human presses send.

**Automatic.** Set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` and
`WHATSAPP_TEMPLATE_NAME` (Meta WhatsApp Cloud API) and confirmations send
themselves. `MSG91_AUTH_KEY` or `FAST2SMS_API_KEY` adds SMS as a fallback for
devotees without WhatsApp. Both are optional; the button stays available
either way.

Message wording lives in `lib/messages.ts` and is shared by both paths, so a
devotee cannot tell which one sent it.

---

## Layout

```
app/
  page.tsx                    Home — with the ceremonial temple-entrance intro
  sevas/                      Browse, select and book sevas
  track-booking/              Look up a booking by reference or phone
  donate/  gallery/  about/  contact/  announcements/

  admin/
    layout.tsx                Auth-guarded shell (own chrome; no public navbar)
    page.tsx                  Dashboard: work queue, real revenue, health
    bookings/                 Confirm payments, filter by date/seva, export CSV
    sevas/  announcements/  gallery/  login/

  api/
    bookings/create           Create a pending booking + UPI link  (rate limited)
    bookings/paid             Devotee submits their UPI reference  (rate limited)
    bookings/confirm          Admin settles a booking              (admin only)
    bookings/lookup           Track Seva search                    (rate limited)
    admin/health              Configuration diagnostics            (admin only)
    notify                    Push an announcement to devotees     (admin only)
    razorpay/*                Gateway flow, when enabled

components/
  UpiPayStep.tsx              Pay screen: GPay/PhonePe deep links, QR, UTR capture
  TempleEntrance.tsx          The homepage intro ceremony
  BankTransferDetails.tsx     Bank fallback for devotees who don't use UPI
  Navbar / Footer / SevaBoard / SevaCard / AnnouncementCard / NotificationButton

lib/
  firebase.ts                 Browser SDK init
  firebaseAdmin.ts            Server SDK + verifyAdminRequest()  — server only
  firestore.ts                Firestore helpers and shared types
  upi.ts                      Builds the upi://pay URI            — server only
  upiApps.ts                  Per-app deep links (GPay, PhonePe, Paytm)
  messages.ts                 Devotee message templates + wa.me links
  notify.ts                   WhatsApp / SMS providers            — server only
  rateLimit.ts                In-memory throttling for public routes
  receipt.ts                  Receipt and booking-acknowledgement PDFs
  templeBank.ts               The temple's bank account — single source of truth
  sevaData.ts                 The printed seva board
  auth.ts  bookingId.ts  fcm.ts  utils.ts
```

---

## Security notes

- **Client checks are never the boundary.** `lib/auth.ts` decides whether to
  render the dashboard; `firestore.rules` and `verifyAdminRequest()` decide
  whether anything actually happens. Forcing the former grants an empty shell.
- **Prices are resolved server-side** in `/api/bookings/create`. The browser
  sends seva ids, never amounts.
- **Public API routes are rate limited** (`lib/rateLimit.ts`). Note the limiter
  is per server instance, so on serverless it throttles rather than guarantees.
- **Response headers** — CSP, HSTS, `X-Frame-Options: DENY` and a referrer
  policy are set in `next.config.ts`. Adding a new third-party script, iframe
  or API call means adding it to the CSP, or it will be blocked silently.
- **Booking lookup by reference returns masked contact details.** A reference
  can be read off a shared screen; knowing the phone number is what unmasks
  the record.

---

## Deploy

```bash
npm run build
vercel
```

Add every variable from `.env.example` in Vercel → Project → Settings →
Environment Variables. `FIREBASE_SERVICE_ACCOUNT` is easiest to paste as
base64, since Vercel's UI mangles newlines.

Then deploy the security rules (step 3 above) — they are not part of the Vercel
deployment.
