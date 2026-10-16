"use client";
import { Heart, Receipt, ShieldCheck, Smartphone } from "lucide-react";
import DonateForm from "@/components/DonateForm";
import DivineDivider from "@/components/DivineDivider";

export default function DonatePage() {
  return (
    <div className="bg-cream pt-28 md:pt-32 pb-24 md:pb-32 min-h-screen">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-6 text-center mb-10 md:mb-16 animate-fade-in">
        <div className="flex items-center justify-center gap-3 text-saffron-600 mb-6">
          <div className="h-px w-8 bg-saffron-600/30" />
          <Heart size={18} fill="currentColor" />
          <span className="text-[11px] md:text-xs uppercase tracking-[0.3em] font-sans font-bold">Contribution</span>
          <div className="h-px w-8 bg-saffron-600/30" />
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-serif text-foreground mb-6">Support the Sanctuary</h1>
        <p className="text-sm md:text-base text-gray-600 font-sans max-w-lg mx-auto px-2 leading-relaxed">
          Your contributions help us maintain the temple premises, conduct daily rituals, and continue our community services like Annadana.
        </p>
      </div>

      {/* One way to give: online through Razorpay. Bank-transfer details were
          removed on purpose — a transfer reaches the temple with no name, no
          receipt and no record, and it relied on devotees sending a WhatsApp
          screenshot that someone then had to match by hand. */}
      <div className="max-w-xl mx-auto px-4 md:px-6">
        <div className="bg-foreground text-ivory rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-12 shadow-xl relative overflow-hidden">
          <div className="w-14 h-14 bg-gold-400/15 rounded-2xl flex items-center justify-center text-gold-400 mb-5">
            <Smartphone size={26} />
          </div>
          <h2 className="text-2xl md:text-3xl font-serif text-gold-400 mb-2">Donate Online</h2>
          <p className="text-ivory/70 text-sm leading-relaxed mb-7">
            Give any amount by GPay, PhonePe or any UPI app, and get a receipt instantly.
          </p>
          <DonateForm />
        </div>

        <ul className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          {[
            { icon: ShieldCheck, text: "Secured by Razorpay" },
            { icon: Receipt, text: "Instant receipt" },
            { icon: Smartphone, text: "Any UPI app" },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex sm:flex-col items-center justify-center gap-2 bg-white border border-saffron-100 rounded-2xl px-4 py-3 text-sm text-gray-700">
              <Icon size={18} className="text-saffron-600 shrink-0" />
              {text}
            </li>
          ))}
        </ul>
      </div>

      <DivineDivider className="my-24 opacity-30" />

      {/* Purpose Section */}
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h3 className="text-2xl font-serif text-gray-900 mb-12">Your Donation Matters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: "Annadana", desc: "Providing meals to devotees and the needy." },
            { title: "Maintenance", desc: "Upkeep of the sacred premises and heritage." },
            { title: "Utsava", desc: "Organizing festivals and spiritual gatherings." }
          ].map((item, i) => (
            <div key={i} className="p-6 rounded-3xl bg-white border border-saffron-50 hover:border-saffron-200 transition-colors">
              <h4 className="text-saffron-700 font-bold uppercase tracking-widest text-[10px] mb-2">{item.title}</h4>
              <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

