"use client";
/**
 * Admin Login page - Premium design.
 * Firebase Email/Password sign-in with Firestore admin verification.
 */
import { useState } from "react";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { checkAdminStatus } from "@/lib/auth";
import { Lock, Mail, Key, AlertCircle } from "lucide-react";
import Image from "next/image";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);

      // Verify if email exists in 'admins' collection
      const isAuthorized = await checkAdminStatus(cred.user.email);
      
      if (!isAuthorized) {
        await auth.signOut();
        setError("Divine Access Denied. Your account is not authorized as an administrator.");
        setLoading(false);
        return;
      }

      router.replace("/admin");
    } catch (err: unknown) {
      const errorObj = err as any;
      console.error("Login Error:", errorObj);
      
      let message = "Failed to sign in. Please check your credentials.";
      
      if (errorObj.code === "auth/user-not-found") {
        message = "User not found. Please create this email in Firebase Console > Authentication.";
      } else if (errorObj.code === "auth/wrong-password") {
        message = "Incorrect password. Please try again.";
      } else if (errorObj.code === "auth/unauthorized-domain") {
        message = "Domain not authorized. Please add this Vercel URL to Firebase Console > Settings > Authorized Domains.";
      } else if (errorObj.code === "auth/invalid-credential") {
        message = "Invalid credentials. If this is a new account, ensure you've set a password in Firebase Console.";
      }
      
      setError(`${message} (Error: ${errorObj.code || 'unknown'}). Current URL: ${typeof window !== 'undefined' ? window.location.hostname : 'unknown'}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-20 pointer-events-none" />
      <div className="absolute -top-[10%] -right-[5%] w-[400px] h-[400px] bg-saffron-100/30 blur-[100px] rounded-full" />
      <div className="absolute -bottom-[10%] -left-[5%] w-[400px] h-[400px] bg-gold-100/30 blur-[100px] rounded-full" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-saffron-900/5 border border-saffron-100 overflow-hidden">
          <div className="p-8 md:p-12">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-saffron-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <img src="/ganapathi-logo.jpg" alt="Ganesh" className="w-10 h-10 opacity-80 object-contain" />
              </div>
              <h1 className="text-3xl font-serif text-gray-900 mb-2">Admin Portal</h1>
              <p className="text-xs uppercase tracking-[0.2em] font-bold text-gray-400">Secure Divine Gateway</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 px-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-saffron-600/40" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="priest@temple.org"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 px-1">Password</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-saffron-600/40" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/20 transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold px-4 py-3 rounded-xl flex items-start gap-3 animate-shake">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-foreground text-ivory hover:bg-saffron-700 disabled:opacity-60 font-bold py-5 rounded-2xl transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3 group"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-ivory border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                    Enter Portal
                  </>
                )}
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                  <span className="bg-white px-4 text-gray-400">Or Divine Social Access</span>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  setError("");
                  try {
                    const provider = new GoogleAuthProvider();
                    const cred = await signInWithPopup(auth, provider);
                    const isAuthorized = await checkAdminStatus(cred.user.email);
                    if (!isAuthorized) {
                      await auth.signOut();
                      setError("Divine Access Denied. Your Google account is not authorized.");
                    } else {
                      router.replace("/admin");
                    }
                  } catch (err: unknown) {
                    console.error("Google Login Error:", err);
                    setError("Google Sign-In failed. Please try again.");
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-full bg-white border border-gray-100 text-gray-700 hover:bg-gray-50 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-sm"
              >
                <img 
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                  alt="Google" 
                  className="w-5 h-5"
                />
                Sign in with Google
              </button>
            </form>
          </div>
          
          <div className="bg-gray-50/50 p-6 text-center border-t border-gray-50">
            <Link href="/" className="text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-saffron-600 transition-colors">
              Return to Website
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Added Link component helper
import Link from "next/link";
