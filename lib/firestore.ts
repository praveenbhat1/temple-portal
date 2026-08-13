"use client";
/**
 * Firestore helper functions for all collections.
 * Wrapped in try-catch for stability and detailed logging.
 */
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Seva {
  id?: string;
  name: string;
  description: string;
  price: number;
  type: "basic" | "special";
  /** Special seva only — ISO date string (YYYY-MM-DD) */
  availableFrom?: string;
  availableTo?: string;
  /** The actual date the seva takes place */
  eventDate?: string;
  /** Whether the seva is shown at all */
  isActive?: boolean;
  /** Maximum number of bookings allowed (0 or undefined = unlimited) */
  maxBookings?: number;
  /** Current count of successful bookings */
  currentBookings?: number;
}

export interface BookingSeva {
  sevaId: string;
  name: string;
  price: number;
}

export interface Booking {
  id?: string;
  bookingId: string;
  userName: string;
  phone: string;
  email?: string;
  sevas: BookingSeva[];
  totalAmount: number;
  /** Date the user submitted the booking (today's date) */
  bookingDate: string;
  /** Primary event date (usually from the first seva or user-chosen) */
  eventDate: string;
  paymentStatus: "pending" | "success" | "failed";
  /** How the devotee paid. Absent on bookings made before UPI was added. */
  paymentMethod?: "razorpay" | "upi-manual";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  /** Manual UPI flow only — set when an admin settles the booking. */
  upiRef?: string;
  confirmedBy?: string;
  confirmedAt?: Timestamp;
  createdAt?: Timestamp;
}

export interface Announcement {
  id?: string;
  title: string;
  description: string;
  date: Timestamp | string;
  createdAt?: Timestamp;
}

export interface GalleryImage {
  id?: string;
  imageUrl: string;
  uploadedAt?: Timestamp;
}

// ─── Admins ───────────────────────────────────────────────────────────────────

/**
 * Is this email a temple admin?
 *
 * Looks up /admins/{email} by document id — the same shape firestore.rules
 * checks with exists(). The old version queried an `email` *field* instead,
 * so the UI could admit someone the rules would then reject on every write.
 */
export async function verifyAdmin(email: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, "admins", email));
    return snap.exists();
  } catch (error) {
    console.error("Firestore Error (verifyAdmin):", error);
    return false;
  }
}

// ─── Sevas ────────────────────────────────────────────────────────────────────

export async function getSevas(): Promise<Seva[]> {
  try {
    const snap = await getDocs(collection(db, "sevas"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Seva));
  } catch (error) {
    console.error("Firestore Error (getSevas):", error);
    return [];
  }
}

export async function addSeva(seva: Omit<Seva, "id">) {
  try {
    return await addDoc(collection(db, "sevas"), seva);
  } catch (error) {
    console.error("Firestore Error (addSeva):", error);
    throw error;
  }
}

export async function updateSeva(id: string, data: Partial<Seva>) {
  try {
    return await updateDoc(doc(db, "sevas", id), data);
  } catch (error) {
    console.error("Firestore Error (updateSeva):", error);
    throw error;
  }
}

export async function deleteSeva(id: string) {
  try {
    return await deleteDoc(doc(db, "sevas", id));
  } catch (error) {
    console.error("Firestore Error (deleteSeva):", error);
    throw error;
  }
}

// ─── Availability Logic ───────────────────────────────────────────────────────

export type SevaAvailability = "open" | "upcoming" | "closed" | "inactive" | "basic" | "full";

export function getSevaAvailability(seva: Seva): SevaAvailability {
  if (seva.isActive === false) return "inactive";

  // Check booking limit first
  if (seva.maxBookings && seva.maxBookings > 0) {
    const current = seva.currentBookings || 0;
    if (current >= seva.maxBookings) return "full";
  }

  if (seva.type === "basic") return "basic";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (seva.availableFrom) {
    const from = new Date(seva.availableFrom);
    if (today < from) return "upcoming";
  }
  if (seva.availableTo) {
    const to = new Date(seva.availableTo);
    to.setHours(23, 59, 59, 999);
    if (today > to) return "closed";
  }
  return "open";
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

// Bookings are created only on the server, using the Admin SDK. There is
// deliberately no client-side booking writer here — firestore.rules denies
// client writes to `bookings`.
//
// Two routes create them:
//   • /api/razorpay/verify   — after the Razorpay signature checks out (success)
//   • /api/bookings/create   — manual UPI flow (pending, until an admin settles
//                              it through /api/bookings/confirm)

/** What /api/bookings/create hands back so the devotee can pay by UPI. */
export interface UpiBookingIntent {
  id: string;
  bookingId: string;
  totalAmount: number;
  sevas: BookingSeva[];
  /** upi://pay?… — opens a UPI app on mobile. */
  upiUri: string;
  /** PNG data URI of the same link, for desktop scanning. */
  qrDataUrl: string;
}

/**
 * Create a pending booking and get back the UPI link to pay it with.
 *
 * The booking is not paid at this point and deliberately says so — a temple
 * admin confirms it once the money shows up.
 */
export async function createUpiBooking(payload: {
  userName: string;
  phone: string;
  email?: string;
  sevaIds: string[];
  eventDate: string;
}): Promise<UpiBookingIntent> {
  const res = await fetch("/api/bookings/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("Booking creation failed:", result);
    if (result?.reason === "upi_not_configured" || result?.reason === "admin_not_configured") {
      throw new Error(
        "Online booking isn't switched on yet. Please contact the temple office to book this seva."
      );
    }
    throw new Error(result?.error || "Could not start the booking. Please try again.");
  }

  return result as UpiBookingIntent;
}

export async function getBookings(): Promise<Booking[]> {
  try {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
  } catch (error) {
    console.error("Firestore Error (getBookings):", error);
    return [];
  }
}

/**
 * Find a devotee's bookings by booking id or phone number.
 *
 * Goes through /api/bookings/lookup rather than querying Firestore directly:
 * security rules can't scope a public read to "only rows matching my own
 * phone number", so the lookup has to happen on the server.
 */
export async function findBookings(queryStr: string): Promise<Booking[]> {
  try {
    const res = await fetch("/api/bookings/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: queryStr }),
    });

    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("Booking lookup failed:", result);
      throw new Error(result?.error || "Could not search bookings right now.");
    }

    return (result.bookings || []) as Booking[];
  } catch (error) {
    console.error("Error (findBookings):", error);
    throw error;
  }
}

// ─── Announcements ────────────────────────────────────────────────────────────

export async function getAnnouncements(): Promise<Announcement[]> {
  try {
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement));
  } catch (error) {
    console.error("Firestore Error (getAnnouncements):", error);
    return [];
  }
}

export async function addAnnouncement(a: Omit<Announcement, "id">) {
  try {
    return await addDoc(collection(db, "announcements"), {
      ...a,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Firestore Error (addAnnouncement):", error);
    throw error;
  }
}

export async function updateAnnouncement(id: string, data: Partial<Announcement>) {
  try {
    return await updateDoc(doc(db, "announcements", id), data);
  } catch (error) {
    console.error("Firestore Error (updateAnnouncement):", error);
    throw error;
  }
}

export async function deleteAnnouncement(id: string) {
  try {
    return await deleteDoc(doc(db, "announcements", id));
  } catch (error) {
    console.error("Firestore Error (deleteAnnouncement):", error);
    throw error;
  }
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

export async function getGalleryImages(): Promise<GalleryImage[]> {
  try {
    const q = query(collection(db, "gallery"), orderBy("uploadedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as GalleryImage));
  } catch (error) {
    console.error("Firestore Error (getGalleryImages):", error);
    return [];
  }
}

export async function addGalleryImage(imageUrl: string) {
  try {
    return await addDoc(collection(db, "gallery"), {
      imageUrl,
      uploadedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Firestore Error (addGalleryImage):", error);
    throw error;
  }
}

export async function deleteGalleryImage(id: string) {
  try {
    return await deleteDoc(doc(db, "gallery", id));
  } catch (error) {
    console.error("Firestore Error (deleteGalleryImage):", error);
    throw error;
  }
}

// Seva booking counters are incremented server-side in /api/razorpay/verify
// with FieldValue.increment(), so a devotee's browser can never inflate them.
