"use client";
/**
 * Admin Login page - Premium design.
 * Firebase Email/Password sign-in with Firestore admin verification.
 */
import { useState } from "react";
import Link from "next/link";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { checkAdminStatus } from "@/lib/auth";
import { Lock, Mail, Key, AlertCircle, Eye, EyeOff } from "lucide-react";

/**
 * Turn a Firebase auth code into something safe to put on screen.
 *
 * The previous version appended the project id and the current hostname to
 * every failure, which handed an attacker the exact Firebase project to
 * target — from an unauthenticated page, by typing a wrong password. Codes
 * that distinguish "no such user" from "wrong password" are also collapsed
 * into one message, so this page cannot be used to enumerate which addresses
 * are temple admins.
 *
 * The code itself is still logged to the console for whoever is debugging.
 */
function loginErrorMessage(code?: string): string {
  switch (code) {
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes before trying again.";
    case "auth/network-request-failed":
      return "Could not reach the server. Please check your connection and try again.";
    case "auth/unauthorized-domain":
      return "This site is not authorised for sign-in. Add its domain in the Firebase console.";
    default:
      return "Those credentials were not recognised. Please check and try again.";
  }
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  /** Lets the admin see what they actually typed — this form is used on a
   *  phone, where a mistyped character is invisible and indistinguishable
   *  from a genuinely wrong password. */
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);

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
      const errorObj = err as { code?: string };
      // A wrong password is a normal outcome of a login form, not a fault.
      // console.error trips Next's red dev overlay and logs the raw
      // FirebaseError object, which the overlay renders unhelpfully; the code
      // alone is what anyone debugging actually needs.
      console.warn("Admin sign-in refused:", errorObj.code ?? "unknown");
      
      setError(loginErrorMessage(errorObj.code));
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
                    // The error is cleared as soon as anything is edited. It
                    // used to persist across retypes, so a corrected password
                    // still sat under a red "not recognised" banner and looked
                    // like it had failed again.
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    autoComplete="username"
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
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="••••••••"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-12 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-saffron-700 transition-colors"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {/* A pasted credential often carries a trailing space, which is
                    invisible behind dots and reads as a wrong password. */}
                {password !== password.trim() && (
                  <p className="text-[11px] text-amber-700 px-1 pt-1">
                    There is a space at the start or end of the password — that will be rejected.
                  </p>
                )}
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
                    console.warn(
                      "Google sign-in refused:",
                      (err as { code?: string }).code ?? "unknown"
                    );
                    setError(loginErrorMessage((err as { code?: string }).code));
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
