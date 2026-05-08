"use client";
import Image from "next/image";
import { History, Info, MapPin, Sparkles, Flower, Flame, Phone } from "lucide-react";
import DivineDivider from "@/components/DivineDivider";

export default function AboutPage() {
  return (
    <div className="bg-cream pt-28 md:pt-32 pb-16 md:pb-24 min-h-screen">
      {/* 1. HERO / INTRO SECTION */}
      <div className="max-w-4xl mx-auto px-6 text-center mb-16 md:mb-24 animate-fade-in">
        <div className="flex items-center justify-center gap-3 text-saffron-700 mb-6">
          <div className="h-px w-8 bg-saffron-700/30" />
          <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] font-sans font-bold text-center">THE SANCTUARY</span>
          <div className="h-px w-8 bg-saffron-700/30" />
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-serif text-foreground mb-6 md:mb-8">History & Significance</h1>
        <p className="text-sm md:text-lg text-gray-500 font-sans max-w-2xl mx-auto leading-relaxed mb-8 italic">
          “A sacred abode of Lord Vinayaka rooted in centuries of faith, heritage, and devotion. Sunkadakatte Sri Vinayaka Temple continues to inspire generations with its divine presence, sacred traditions, and timeless spiritual legacy.”
        </p>
        <div className="w-20 md:w-24 h-1 bg-vermillion mx-auto rounded-full" />
      </div>

      {/* Storytelling Layout */}
      <div className="max-w-6xl mx-auto px-6 space-y-16 md:space-y-20">

        {/* 2. ANCIENT LEGACY SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-12 items-center">
          <div className="order-2 lg:order-1 relative">
            <div className="absolute -top-10 -left-10 w-32 md:w-40 h-32 md:h-40 bg-saffron-100/50 rounded-full blur-3xl -z-10" />
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-serif text-foreground mb-4 md:mb-6 flex items-center gap-3">
              <History className="text-saffron-700" />
              Ancient Legacy
            </h2>
            <div className="space-y-4 md:space-y-6 text-gray-600 leading-relaxed font-sans text-base md:text-lg">
              <p>
                In the sacred town of Kalyanpura, Sunkadakatte Sri Vinayaka Temple stands as a timeless symbol of devotion, heritage, and divine grace. Revered for generations, the temple is home to a sacred idol of Lord Vinayaka believed to date back nearly 700 years to the glorious Vijayanagara era.
              </p>
              <p>
                The temple’s history is deeply rooted in faith and tradition. According to local belief, the divine idol was discovered centuries ago in the holy waters of the Swarna River by the ancestors of the region. Guided by spiritual vision and devotion, the idol was consecrated at the present location, where it continues to bless devotees with peace, prosperity, and protection.
              </p>
              <p className="text-saffron-700 font-serif italic text-sm md:text-base border-l-2 border-saffron-200 pl-4 mt-8">
                &quot;A 700-year legacy of divine blessings.&quot;
              </p>
            </div>
          </div>
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[500px] rounded-[2.5rem] md:rounded-[4rem] overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border-4 md:border-8 border-white group">
              <Image
                src="/legacy.jpg"
                alt="Temple History"
                width={600}
                height={800}
                className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-1000"
                priority
              />
            </div>
          </div>
        </div>

        {/* Decorative Divider */}
        <DivineDivider />

        {/* 3. SPIRITUAL SIGNIFICANCE SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16 items-center">
          <div className="relative flex justify-center lg:justify-start">
            <div className="relative w-full max-w-[500px] rounded-[2.5rem] md:rounded-[4rem] overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border-4 md:border-8 border-white group">
              <Image
                src="/significance.jpg"
                alt="Temple Significance"
                width={600}
                height={800}
                className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-1000"
                priority
              />
            </div>
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-serif text-foreground mb-4 md:mb-6 flex items-center gap-3">
              <Info className="text-saffron-700" />
              Spiritual Significance
            </h2>
            <div className="space-y-4 md:space-y-6 text-gray-600 leading-relaxed font-sans text-base md:text-lg">
              <p>
                Lord Vinayaka, worshipped here as the remover of obstacles and granter of wisdom, holds a special place in the hearts of devotees. People from surrounding villages and distant regions visit the temple seeking blessings before beginning important milestones in life.
              </p>
              <p>
                From marriages and new beginnings to vehicle purchases and sacred family events, devotees offer their prayers at the feet of Sri Vinayaka with deep faith and devotion.
              </p>
              <p>
                The temple follows traditional Vedic rituals and Agama practices, preserving the spiritual sanctity passed down through generations.
              </p>
              <p className="text-saffron-700 font-serif italic text-sm md:text-base border-l-2 border-saffron-200 pl-4 mt-8">
                &quot;Blessings of Lord Vinayaka for every new beginning.&quot;
              </p>
            </div>
          </div>
        </div>

        {/* 4. SACRED TRADITIONS SECTION */}
        <div className="relative py-12 md:py-20">
          <div className="text-center mb-12 md:mb-16">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-saffron-50 rounded-full flex items-center justify-center p-3 border border-saffron-100 shadow-sm">
                <Image src="/ganapathi-logo.jpg" alt="Ganesh Logo" width={40} height={40} className="object-contain" />
              </div>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-foreground mb-4">
              Sacred Traditions
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto italic font-sans text-sm md:text-base">
              “The temple is renowned for its vibrant spiritual observances and seva traditions.”
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[
              { title: "Sankashti Pooja", icon: <Flower size={20} /> },
              { title: "Vinayaka Chaturthi Mahotsava", icon: <Flame size={20} /> },
              { title: "Special Monthly Sevas", icon: <Sparkles size={20} /> },
            ].map((tradition, i) => (
              <div key={i} className="bg-white border border-saffron-100 p-6 md:p-8 rounded-[2rem] shadow-sm hover:shadow-xl hover:border-saffron-300 transition-all group flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-saffron-50 text-saffron-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-saffron-600 group-hover:text-white transition-colors">
                  {tradition.icon}
                </div>
                <h3 className="font-serif text-lg md:text-xl text-gray-900 group-hover:text-saffron-700 transition-colors">{tradition.title}</h3>
              </div>
            ))}
          </div>

          <p className="text-center mt-12 text-gray-500 max-w-2xl mx-auto font-sans text-sm md:text-base">
            “During festive occasions, the temple becomes a center of collective devotion, prayer, and prasada distribution, welcoming hundreds of devotees.”
          </p>
        </div>

        {/* 5. CULTURAL HERITAGE SECTION */}
        <div className="bg-saffron-50/50 rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-12 lg:p-20 relative overflow-hidden border border-saffron-100">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-foreground mb-6">Cultural Heritage</h2>
            <div className="space-y-6 text-gray-600 leading-relaxed font-sans text-base md:text-lg">
              <p>
                The name ‘Sunkadakatte’ is believed to originate from the historical toll collection point (‘Sunka’) that once existed along an important trade route near the temple. Travelers would stop to offer prayers to Lord Vinayaka before continuing their journeys, eventually giving rise to the temple’s historic identity.
              </p>
              <p>
                Today, the temple remains not only a place of worship but also a cherished spiritual landmark preserving the cultural essence of the region.
              </p>
              <div className="pt-6">
                <span className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-saffron-600 font-bold">Where devotion meets heritage</span>
              </div>
            </div>
          </div>
        </div>

        {/* 6. TEMPLE TRUSTEES SECTION */}
        <div className="bg-foreground text-ivory rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-12 lg:p-20 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('/paper-texture.png')] opacity-10" />
          <div className="relative z-10">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl font-serif text-gold-400 mb-4">Temple Trustees</h2>
              <div className="w-16 h-1 bg-saffron-600 mx-auto rounded-full" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              {[
                {
                  name: "Shri Tonse Satish Rao",
                  role: "Trustee",
                  image: "/trustees/tonse-satish-rao.png",
                  desc: "“Serving the temple and devotees with dedication, humility, and spiritual vision.”"
                },
                {
                  name: "Shri Anand Karnad",
                  role: "Trustee",
                  image: "/trustees/anand-karnad.png",
                  desc: "“Preserving the sacred traditions and cultural heritage of the temple for future generations.”"
                }
              ].map((trustee, i) => (
                <div key={i} className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-white/5 p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition-all group">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-saffron-100/10 flex-shrink-0 flex items-center justify-center overflow-hidden border-2 border-saffron-600/30 group-hover:border-saffron-600 transition-colors relative">
                    <img
                      src={trustee.image}
                      alt={trustee.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-xl font-serif text-ivory mb-1">{trustee.name}</h3>
                    <p className="text-saffron-500 text-sm font-bold uppercase tracking-widest mb-3">{trustee.role}</p>
                    <p className="text-ivory/60 text-sm leading-relaxed italic">{trustee.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 7. CHIEF TEMPLE PRIEST SECTION */}
        <div className="bg-foreground text-ivory rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-12 lg:p-20 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('/paper-texture.png')] opacity-10" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-saffron-100/10 flex-shrink-0 flex items-center justify-center overflow-hidden border-4 border-gold-600/30 shadow-[0_0_50px_rgba(249,115,22,0.3)] relative group">
              <img 
                src="/priest/manjunath-bhat.jpg" 
                alt="Vedamurthy Manjunath Bhat"
                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            </div>
            <div className="text-center md:text-left flex-1">
              <h2 className="text-3xl md:text-4xl font-serif text-gold-400 mb-2">Vedamurthy Manjunath Bhat</h2>
              <p className="text-saffron-500 text-sm font-bold uppercase tracking-[0.3em] mb-6">Chief Temple Priest</p>
              <p className="text-ivory/70 text-base md:text-lg leading-relaxed max-w-2xl italic mb-4">
                “Performing traditional poojas and sacred Vedic rituals with devotion, discipline, and spiritual dedication for devotees visiting Sunkadakatte Sri Vinayaka Temple. Dedicated to preserving the sacred traditions and divine heritage of the temple through daily worship and seva.”
              </p>
              <a 
                href="tel:+916361929580"
                className="flex items-center gap-3 text-saffron-500 font-sans text-sm md:text-base font-bold hover:text-saffron-400 transition-colors w-fit"
              >
                <Phone size={18} />
                <span>+91 6361 929 580</span>
              </a>
            </div>
          </div>
        </div>

        {/* 8. SACRED LOCATION SECTION */}
        <div className="bg-foreground text-ivory rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-12 lg:p-20 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('/paper-texture.png')] opacity-10" />
          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <MapPin size={40} className="mx-auto text-gold-400 mb-6 md:mb-8" />
            <h2 className="text-3xl md:text-4xl font-serif mb-4 md:mb-6 leading-tight">Sacred Location</h2>
            <p className="text-ivory/60 text-base md:text-lg leading-relaxed mb-8 md:mb-10 px-2">
              “Nestled in the serene surroundings of Kalyanpura, the temple offers a peaceful spiritual atmosphere for prayer, reflection, and divine connection away from the rush of everyday life.”
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-[10px] md:text-sm uppercase tracking-widest text-gold-400 font-bold">
              <span>SUNKADAKATTE</span>
              <span className="hidden md:inline">•</span>
              <span>KALYANPURA</span>
              <span className="hidden md:inline">•</span>
              <span>KARNATAKA</span>
            </div>
          </div>
        </div>
      </div>

      {/* 9. SPIRITUAL TAGLINES - Subtle Footer */}
      <div className="mt-24 text-center px-6">
        <p className="text-[10px] md:text-xs uppercase tracking-[0.5em] text-saffron-800 opacity-40">
          Sacred traditions. Eternal faith. • A timeless sanctuary of peace and prosperity.
        </p>
      </div>

      {/* Decorative Footer Element */}
      <div className="mt-20 md:mt-24 text-center opacity-[0.03]">
        <Image src="/ganapathi-logo.jpg" alt="Ganesh" width={80} height={80} className="mx-auto" />
      </div>
    </div>
  );
}
