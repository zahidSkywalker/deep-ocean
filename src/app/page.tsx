'use client';

import dynamic from "next/dynamic";

const ImageGenerator = dynamic(() => import("@/components/ImageGenerator"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative w-16 h-16 mx-auto">
          <div className="w-16 h-16 rounded-full border-4 border-neutral-800 border-t-violet-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-6 h-6 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>
          </div>
        </div>
        <p className="text-neutral-500 text-sm font-medium">Loading AI Photo Generator...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <ImageGenerator />;
}