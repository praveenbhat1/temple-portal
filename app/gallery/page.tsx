"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { getGalleryImages, GalleryImage } from "@/lib/firestore";
import { Camera, Download } from "lucide-react";

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getGalleryImages();
        setImages(data);
      } catch (error) {
        console.error("Error fetching gallery:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleDownload = async (imageUrl: string, id: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `temple-gallery-${id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      window.open(imageUrl, '_blank');
    }
  };


  return (
    <div className="bg-cream pt-28 md:pt-32 pb-16 md:pb-24 min-h-screen">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-6 text-center mb-12 md:mb-16 animate-fade-in">
        <div className="flex items-center justify-center gap-3 text-saffron-600 mb-6">
          <div className="h-px w-8 bg-saffron-600/30" />
          <Camera size={18} />
          <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] font-sans font-bold">Divine Sight</span>
          <div className="h-px w-8 bg-saffron-600/30" />
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-serif text-foreground mb-6 md:mb-8 text-center">Temple Gallery</h1>
        <p className="text-sm md:text-base text-gray-500 font-sans max-w-lg mx-auto px-4 leading-relaxed">
          Witness the spiritual beauty and sacred rituals of Sri Vinayaka Temple through our visual archives.
        </p>
      </div>

      {/* Grid Layout */}
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {loading ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 md:gap-6 space-y-4 md:space-y-6">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white/50 animate-pulse rounded-[1.5rem] md:rounded-[2rem] aspect-[3/4] border border-saffron-100/50" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-24 text-gray-400 bg-white rounded-[2rem] md:rounded-[3rem] border border-saffron-100">
            <img src="/ganapathi-logo.jpg" alt="Ganesh" className="mx-auto mb-4 opacity-20 w-12 h-12" />
            <p className="font-serif text-lg md:text-xl">The gallery is being curated...</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 md:gap-6 space-y-4 md:space-y-6">
            {images.map((img) => (
              <div 
                key={img.id} 
                className="group relative overflow-hidden rounded-[1.5rem] md:rounded-[2rem] border-2 md:border-4 border-white shadow-lg bg-white break-inside-avoid"
              >
                <div className="relative aspect-auto">
                  <img
                    src={img.imageUrl}
                    alt="Temple Gallery Image"
                    className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-1000"
                    loading="lazy"
                  />
                  
                  {/* Download Button Overlay */}
                  <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={() => handleDownload(img.imageUrl, img.id!)}
                      className="bg-white/90 backdrop-blur-sm p-3 rounded-full text-gray-900 shadow-xl hover:bg-saffron-600 hover:text-white transition-all transform active:scale-90"
                      title="Download Image"
                    >
                      <Download size={18} />
                    </button>
                  </div>

                  {/* Soft Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                    <span className="text-white text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <img src="/ganapathi-logo.jpg" alt="Ganesh" className="w-4 h-4 invert brightness-0" /> 
                      Divine Moment
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decorative Footer Element */}
      <div className="mt-20 md:mt-24 text-center opacity-[0.03]">
        <img src="/ganapathi-logo.jpg" alt="Ganesh" className="mx-auto w-20 h-20" />
      </div>
    </div>
  );
}
