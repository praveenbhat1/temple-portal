"use client";
/**
 * Firestore helper functions for all collections.
 * Wrapped in try-catch for stability and detailed logging.
 */
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  where,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import { normalizePhone } from "./utils";

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
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
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

export async function verifyAdmin(email: string): Promise<boolean> {
  try {
    const q = query(collection(db, "admins"), where("email", "==", email), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
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

export async function addBooking(booking: Omit<Booking, "id">) {
  try {
    return await addDoc(collection(db, "bookings"), {
      ...booking,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Firestore Error (addBooking):", error);
    throw error;
  }
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

export async function findBookings(queryStr: string): Promise<Booking[]> {
  try {
    const trimmed = queryStr.trim();
    
    // 1. Try fetching by bookingId (SV-XXXX or just XXXX)
    let idSearch = trimmed.toUpperCase();
    if (!idSearch.startsWith("SV-") && idSearch.length >= 5) {
      idSearch = `SV-${idSearch}`;
    }

    if (idSearch.startsWith("SV-")) {
      const q = query(collection(db, "bookings"), where("bookingId", "==", idSearch));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
      }
    }

    // 2. Search by Phone (normalized)
    const normalized = normalizePhone(trimmed);
    // If normalization didn't produce a valid +91 number, don't query phone
    if (normalized.length < 10) return [];
    
    const q = query(collection(db, "bookings"), where("phone", "==", normalized), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
  } catch (error) {
    console.error("Firestore Error (findBookings):", error);
    return [];
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

/**
 * Increment the booking count for a list of sevas.
 * Usually called after a successful payment.
 */
export async function incrementSevaBookingCount(sevaIds: string[]) {
  const { runTransaction } = await import("firebase/firestore");
  try {
    await runTransaction(db, async (transaction) => {
      for (const id of sevaIds) {
        const sevaRef = doc(db, "sevas", id);
        const sevaSnap = await transaction.get(sevaRef);
        if (sevaSnap.exists()) {
          const current = sevaSnap.data().currentBookings || 0;
          transaction.update(sevaRef, { currentBookings: current + 1 });
        }
      }
    });
  } catch (error) {
    console.error("Firestore Error (incrementSevaBookingCount):", error);
  }
}
