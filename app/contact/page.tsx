import { MapPin, Phone, Mail, Clock, MessageCircle } from "lucide-react";
import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="bg-cream pt-28 md:pt-32 pb-16 md:pb-24 min-h-screen">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-6 text-center mb-16 md:mb-24 animate-fade-in">
        <div className="flex items-center justify-center gap-3 text-saffron-600 mb-6">
          <div className="h-px w-8 bg-saffron-600/30" />
          <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] font-sans font-bold text-center">Get in Touch</span>
          <div className="h-px w-8 bg-saffron-600/30" />
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-serif text-foreground mb-6 md:mb-8">Plan Your Visit</h1>
        <div className="w-20 md:w-24 h-1 bg-gold-400 mx-auto rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-start">
        
        {/* Contact Info */}
        <div className="space-y-10 md:space-y-12">
          <div className="bg-white border border-saffron-100 rounded-[2.5rem] p-8 md:p-12 shadow-sm">
            <h2 className="text-2xl md:text-3xl font-serif text-gray-900 mb-8 flex items-center gap-3">
              <div className="w-10 h-10 bg-saffron-50 rounded-xl flex items-center justify-center text-saffron-600">
                <img src="/ganapathi-logo.jpg" alt="Ganesh" className="w-6 h-6 object-contain" />
              </div>
              Temple Details
            </h2>

            <div className="space-y-8">
              <div className="flex gap-5">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-saffron-600 shrink-0">
                  <MapPin size={20} />
                </div>
                <div>
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Address</h4>
                  <p className="text-sm md:text-base text-gray-700 leading-relaxed font-sans">
                    Kallianpur Main Road, near Santhekatte, <br />
                    Udupi, Karnataka - 576115
                  </p>
                </div>
              </div>

              <div className="flex gap-5">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-saffron-600 shrink-0">
                  <Phone size={20} />
                </div>
                <div>
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Contact</h4>
                  <a href="tel:+916361929580" className="text-sm md:text-base text-gray-700 font-sans hover:text-saffron-600 transition-colors">+91 6361 929 580</a>
                  <p className="text-[11px] text-gray-400 mt-1">Mon - Sun (9 AM - 6 PM)</p>
                </div>
              </div>

              <div className="flex gap-5">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-saffron-600 shrink-0">
                  <Mail size={20} />
                </div>
                <div>
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Email</h4>
                  <p className="text-sm md:text-base text-gray-700 font-sans">info@srivinayakatemple.org</p>
                </div>
              </div>

              <div className="flex gap-5">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-saffron-600 shrink-0">
                  <Clock size={20} />
                </div>
                <div>
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Darshan Timings</h4>
                  <p className="text-sm md:text-base text-gray-700 font-sans">6:30 AM – 12:30 PM (Morning)</p>
                  <p className="text-sm md:text-base text-gray-700 font-sans">5:30 PM – 8:30 PM (Evening)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-foreground text-ivory rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/paper-texture.png')] opacity-10" />
            <h3 className="text-2xl font-serif mb-6 relative z-10">Quick Connect</h3>
            <p className="text-ivory/60 text-sm md:text-base mb-8 relative z-10 leading-relaxed">
              Have questions about sevas or special pujas? Chat with our temple coordinators directly on WhatsApp.
            </p>
            <Link 
              href={process.env.NEXT_PUBLIC_WHATSAPP_LINK || "#"}
              className="bg-saffron-600 hover:bg-saffron-700 text-ivory px-10 py-4 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-3 relative z-10 shadow-xl shadow-saffron-900/20"
            >
              <MessageCircle size={20} /> Message on WhatsApp
            </Link>
          </div>
        </div>

        {/* Embedded Google Map */}
        <div className="h-full min-h-[400px] md:min-h-[600px] bg-white border border-saffron-100 rounded-[2.5rem] overflow-hidden relative shadow-lg group">
          <iframe 
            src="https://maps.google.com/maps?q=Sri%20Vinayaka%20Temple%20Kallianpur%20Main%20Road%20Santhekatte%20Udupi&t=&z=15&ie=UTF8&iwloc=&output=embed" 
            width="100%" 
            height="100%" 
            style={{ border: 0, position: 'absolute', top: 0, left: 0 }} 
            allowFullScreen={false} 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            title="Temple Location Map"
            className="grayscale-[30%] contrast-[1.1]"
          ></iframe>
          <div className="absolute inset-0 bg-saffron-900/5 pointer-events-none transition-colors" />
        </div>
      </div>
    </div>
  );
}
