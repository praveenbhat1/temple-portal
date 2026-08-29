"use client";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { subscribeGalleryImages, addGalleryImage, deleteGalleryImage, GalleryImage } from "@/lib/firestore";
import { Trash2, Upload } from "lucide-react";

export default function AdminGalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  // Live, so an upload appears here — and on the public gallery — at once.
  useEffect(() => {
    return subscribeGalleryImages((data) => {
      setImages(data);
      setLoading(false);
    });
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const invalidFiles = files.filter(f => !f.type.startsWith("image/"));
    if (invalidFiles.length > 0) {
      setError("Please select only valid image files.");
      return;
    }

    if (!cloudName || !uploadPreset) {
      setError("Cloudinary configuration missing. Please add it to your .env.local file.");
      return;
    }

    setUploading(true); 
    setError("");

    try {
      // Upload files sequentially to avoid hitting rate limits or overwhelming the connection
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error?.message || `Failed to upload ${file.name}`);
        }

        const imageUrl = data.secure_url;
        await addGalleryImage(imageUrl);
      }
      
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) { 
      const errorObj = err as Error;
      setError(errorObj.message || "Upload failed.");
      setUploading(false);
      // Whatever uploaded before the failure is already on screen — the
      // subscription delivered it.
    }
  };

  const handleDelete = async (img: GalleryImage) => {
    if (!confirm("Delete this image?")) return;
    
    // Note: Cloudinary unsigned uploads do not allow deletion via the frontend API for security.
    // We will just remove the image reference from our Firestore database so it stops showing on the site.
    try {
      await deleteGalleryImage(img.id!);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-serif text-gray-900">Temple Gallery</h1>
          <p className="text-sm text-gray-500 mt-1">Curate and archive the sacred visual history.</p>
        </div>
        <label 
          htmlFor="gallery-upload" 
          className={`flex items-center gap-3 bg-saffron-600 hover:bg-saffron-700 text-white text-[10px] font-bold uppercase tracking-[0.2em] px-6 py-4 rounded-2xl cursor-pointer transition-all shadow-lg shadow-saffron-900/10 ${uploading ? "opacity-60 pointer-events-none" : ""}`}
        >
          <Upload size={16} />
          {uploading ? "Syncing..." : "Upload New Image"}
        </label>
        <input id="gallery-upload" ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold px-6 py-4 rounded-2xl mb-8 flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-saffron-600 border-t-transparent" />
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-24 bg-white border border-dashed border-gray-200 rounded-[3rem]">
          <p className="text-5xl mb-6 grayscale opacity-20">📷</p>
          <p className="text-gray-400 font-serif italic text-lg">The archive is currently empty.</p>
          <p className="text-xs text-gray-300 mt-2 uppercase tracking-widest font-bold">Start by uploading sacred moments</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {images.map((img) => (
            <div key={img.id} className="relative group rounded-[2rem] overflow-hidden border border-gray-100 aspect-square shadow-sm hover:shadow-2xl hover:shadow-saffron-900/10 transition-all duration-500">
              <Image 
                src={img.imageUrl} 
                alt="Gallery" 
                fill 
                className="object-cover group-hover:scale-110 transition-transform duration-700" 
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" 
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-500 flex items-center justify-center">
                <button 
                  onClick={() => handleDelete(img)} 
                  className="opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 bg-red-600 hover:bg-red-700 text-white p-4 rounded-2xl transition-all duration-300 shadow-xl"
                  title="Remove Image"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
