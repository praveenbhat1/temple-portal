"use client";
import React from "react";
import { Heart, Landmark, Smartphone, QrCode, Copy, CheckCircle2 } from "lucide-react";
import DivineDivider from "@/components/DivineDivider";

export default function DonatePage() {
  const [copied, setCopied] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const bankDetails = {
    accountName: "Sunkadakatte Sri Vinayaka Temple",
    accountNumber: "01442200022013",
    bankName: "Canara Bank",
    branch: "Kallianpur II",
    ifsc: "CNRB0010144"
  };

  return (
    <div className="bg-cream pt-28 md:pt-32 pb-32 min-h-screen">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-6 text-center mb-16 md:mb-24 animate-fade-in">
        <div className="flex items-center justify-center gap-3 text-saffron-600 mb-6">
          <div className="h-px w-8 bg-saffron-600/30" />
          <Heart size={18} fill="currentColor" />
          <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] font-sans font-bold">Contribution</span>
          <div className="h-px w-8 bg-saffron-600/30" />
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-serif text-foreground mb-6">Support the Sanctuary</h1>
        <p className="text-sm md:text-base text-gray-500 font-sans max-w-lg mx-auto px-4 leading-relaxed">
          Your contributions help us maintain the temple premises, conduct daily rituals, and continue our community services like Annadana.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        
        {/* Bank Transfer Card */}
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-saffron-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
            <Landmark size={120} />
          </div>
          
          <h2 className="text-2xl md:text-3xl font-serif text-gray-900 mb-8 flex items-center gap-4">
            <div className="w-12 h-12 bg-saffron-50 rounded-2xl flex items-center justify-center text-saffron-600">
              <Landmark size={24} />
            </div>
            Bank Transfer
          </h2>

          <div className="space-y-6">
            {[
              { label: "Account Name", value: bankDetails.accountName },
              { label: "Account Number", value: bankDetails.accountNumber },
              { label: "Bank Name", value: bankDetails.bankName },
              { label: "IFSC Code", value: bankDetails.ifsc },
            ].map((item, i) => (
              <div key={i} className="flex flex-col gap-1 relative group/item">
                <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{item.label}</span>
                <div className="flex items-center justify-between">
                  <span className="text-base md:text-lg text-gray-800 font-medium">{item.value}</span>
                  <button 
                    onClick={() => copyToClipboard(item.value, item.label)}
                    className="p-2 hover:bg-saffron-50 rounded-full text-saffron-600 transition-colors"
                  >
                    {copied === item.label ? <CheckCircle2 size={16} className="text-green-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 p-6 bg-saffron-50 rounded-2xl border border-saffron-100">
            <p className="text-xs text-saffron-800 leading-relaxed font-sans">
              <strong>Note:</strong> After making a transfer, please share the transaction screenshot via WhatsApp so we can send you the official acknowledgment.
            </p>
          </div>
        </div>

        {/* UPI / QR Card */}
        <div className="bg-foreground text-ivory rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('/paper-texture.png')] opacity-10 pointer-events-none" />
          
          <div className="w-16 h-16 bg-saffron-600/20 rounded-2xl flex items-center justify-center text-gold-400 mb-8 relative z-10">
            <Smartphone size={32} />
          </div>

          <h2 className="text-2xl md:text-3xl font-serif text-gold-400 mb-4 relative z-10">UPI Payment</h2>
          <p className="text-ivory/60 text-sm md:text-base mb-10 relative z-10 max-w-sm">
            Scan the QR code below or use the VPA for instant mobile donations through any UPI app.
          </p>

          <div className="bg-white p-6 rounded-[2rem] shadow-inner mb-8 relative z-10">
            <div className="w-48 h-48 md:w-56 md:h-56 bg-gray-50 rounded-xl flex items-center justify-center relative overflow-hidden">
               <QrCode size={120} className="text-gray-200" />
               <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-[2px]">
                 <div className="text-gray-400 text-xs font-bold uppercase tracking-widest px-4 py-2 border-2 border-gray-200 rounded-lg">
                   QR Coming Soon
                 </div>
               </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 relative z-10">
            <span className="text-[10px] uppercase tracking-widest font-bold text-ivory/40">UPI ID / VPA</span>
            <div className="flex items-center gap-3">
              <span className="text-lg md:text-xl font-serif text-gold-400">temple-donations@upi</span>
              <button 
                onClick={() => copyToClipboard("temple-donations@upi", "UPI")}
                className="p-2 hover:bg-white/10 rounded-full text-gold-400 transition-colors"
              >
                {copied === "UPI" ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>

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
