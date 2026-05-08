# Sunkadakatte Sri Vinayaka Temple – Full-Stack Website

A production-ready temple website built with **Next.js 16 (App Router) + Tailwind CSS + Firebase**.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, App Router, TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Storage | Firebase Storage |
| Notifications | Firebase Cloud Messaging (FCM) |
| Payments | Razorpay Checkout |
| Deployment | Vercel |

---

## 📁 Project Structure

```
/app
  page.tsx              — Home (Hero, Sevas, Announcements)
  /about/page.tsx       — Temple history & timings
  /sevas/page.tsx       — Seva listing + Razorpay booking form
  /gallery/page.tsx     — Photo grid with lightbox
  /announcements/page.tsx — Sorted announcements list
  /contact/page.tsx     — Address, map, WhatsApp CTA
  /admin/
    layout.tsx          — Auth-guarded admin sidebar layout
    page.tsx            — Dashboard with stats
    /login/page.tsx     — Firebase Auth login
    /sevas/page.tsx     — CRUD sevas
    /announcements/page.tsx — CRUD announcements
    /gallery/page.tsx   — Upload / delete gallery images
    /bookings/page.tsx  — View all bookings

/components
  Navbar.tsx            — Responsive navbar
  Footer.tsx            — Footer with WhatsApp CTA
  SevaCard.tsx          — Seva display card
  AnnouncementCard.tsx  — Announcement card
  NotificationButton.tsx — FCM opt-in button

/lib
  firebase.ts           — Firebase app + auth + db + storage init
  firestore.ts          — All Firestore CRUD helpers + types
  fcm.ts                — FCM permission + token storage
  auth.ts               — Admin email whitelist helper

/public
  firebase-messaging-sw.js — FCM background message handler
  manifest.json         — PWA manifest
```

---

## ⚙️ Setup

### 1. Clone and install

```bash
git clone <your-repo>
cd ganapa
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable: **Firestore**, **Authentication** (Email/Password), **Storage**, **Cloud Messaging**
4. Get your web app config

### 3. Environment Variables

Copy `.env.local` and fill in your values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...   # From Firebase > Cloud Messaging > Web Push

NEXT_PUBLIC_RAZORPAY_KEY_ID=...
NEXT_PUBLIC_ADMIN_EMAILS=admin1@email.com,admin2@email.com
NEXT_PUBLIC_WHATSAPP_LINK=https://chat.whatsapp.com/...
```

### 4. Update Service Worker

Edit `public/firebase-messaging-sw.js` and replace the Firebase config placeholders with your actual values.

### 5. Firestore Security Rules

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sevas/{id} { allow read: if true; allow write: if request.auth != null; }
    match /bookings/{id} { allow read, write: if request.auth != null; allow create: if true; }
    match /announcements/{id} { allow read: if true; allow write: if request.auth != null; }
    match /gallery/{id} { allow read: if true; allow write: if request.auth != null; }
    match /fcmTokens/{id} { allow create: if true; allow read, update, delete: if request.auth != null; }
  }
}
```

### 6. Firebase Storage Rules

```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /gallery/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 7. Admin Setup

- Go to Firebase Auth → Add user with one of the admin emails in `NEXT_PUBLIC_ADMIN_EMAILS`
- Login at `/admin/login`

### 8. Razorpay Setup

- Sign up at [razorpay.com](https://razorpay.com)
- Get Key ID from Dashboard → Settings → API Keys
- Add to `.env.local`

---

## 🔔 Google Maps

In `app/contact/page.tsx`, replace the `src` of the `<iframe>` with your actual Google Maps embed URL:
1. Go to [Google Maps](https://maps.google.com)
2. Search for the temple location
3. Click Share → Embed a map → Copy HTML → extract `src`

---

## 🚀 Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add all `.env.local` variables in Vercel Dashboard → Project → Settings → Environment Variables.

---

## 🌐 Pages Overview

| Route | Description |
|-------|-------------|
| `/` | Home – Hero, featured sevas, latest announcements |
| `/about` | Temple history, significance, timings |
| `/sevas` | Browse & book sevas with Razorpay payment |
| `/gallery` | Photo grid with lightbox |
| `/announcements` | All temple announcements |
| `/contact` | Address, map, WhatsApp, phone |
| `/admin` | Dashboard (auth-protected) |
| `/admin/login` | Admin sign-in |
| `/admin/sevas` | Add/Edit/Delete sevas |
| `/admin/announcements` | Manage announcements |
| `/admin/gallery` | Upload/delete photos |
| `/admin/bookings` | View all bookings |
