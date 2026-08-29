import type { NextConfig } from "next";

/**
 * Response headers applied to every route.
 *
 * The temple site takes names, phone numbers and payments, so the defaults
 * matter: without a frame ancestor rule anyone can iframe the booking page and
 * clickjack the "I have completed the payment" button, and without a referrer
 * policy a booking reference leaks in the Referer header to every third party
 * the page touches.
 */
const SECURITY_HEADERS = [
  // No framing at all — nothing here is meant to be embedded.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing on the site uses these, so decline them up front.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // Vercel serves over HTTPS; pin it for two years.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    /**
     * CSP. 'unsafe-inline'/'unsafe-eval' on script-src are unavoidable here:
     * Next.js inlines its hydration bootstrap, the entrance pre-paint script in
     * app/layout.tsx is inline by design, and the Firebase SDK needs eval.
     * The value of the policy is in the other directives —
     * frame-ancestors, form-action and object-src close the injection paths
     * that actually get exploited on a site like this one.
     */
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://*.gstatic.com https://apis.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://res.cloudinary.com https://lh3.googleusercontent.com https://www.gstatic.com https://www.transparenttextures.com",
      // api.cloudinary.com is where the admin gallery POSTs its uploads —
      // omitting it blocked every upload with no error the admin could see.
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebase.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.cloudinary.com https://fcmregistrations.googleapis.com",
      // Firebase's auth popup and the embedded Google Map on /contact — which
      // this policy silently blanked until maps.google.com was listed here.
      "frame-src https://*.firebaseapp.com https://maps.google.com https://www.google.com",
      "worker-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      // upi:, tez:, phonepe: and paytmmp: are the payment deep links.
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework version to scanners.
  poweredByHeader: false,

  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      {
        // API responses are per-request and often carry booking data; never let
        // a CDN or browser hold on to one.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        // Firebase Storage images
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/**",
      },
      {
        // Google user profile images (if needed)
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        // Cloudinary images
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        // Google Static Assets (Auth Icons)
        protocol: "https",
        hostname: "www.gstatic.com",
      },
    ],
  },
};

export default nextConfig;
