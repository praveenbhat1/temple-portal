"use client";
import React from 'react';

/**
 * DivineDivider - A traditional, spiritual divider component
 * inspired by Indian temple motifs (Lotus/Mandala).
 */
export default function DivineDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-4 py-8 ${className}`}>
      <div className="h-px w-16 md:w-24 bg-gradient-to-r from-transparent via-gold-600/40 to-transparent" />
      <div className="relative flex items-center justify-center">
        <svg 
          width="40" 
          height="40" 
          viewBox="0 0 100 100" 
          className="text-saffron-700 opacity-80"
          fill="currentColor"
        >
          {/* Abstract Lotus/Mandala Motif */}
          <path d="M50 10 L60 40 L90 50 L60 60 L50 90 L40 60 L10 50 L40 40 Z" />
          <circle cx="50" cy="50" r="8" className="text-gold-600" />
          <path d="M50 25 L55 35 L50 30 L45 35 Z M75 50 L65 55 L70 50 L65 45 Z M50 75 L45 65 L50 70 L55 65 Z M25 50 L35 45 L30 50 L35 55 Z" />
        </svg>
        <div className="absolute inset-0 bg-gold-400/20 blur-xl rounded-full -z-10" />
      </div>
      <div className="h-px w-16 md:w-24 bg-gradient-to-r from-transparent via-gold-600/40 to-transparent" />
    </div>
  );
}
