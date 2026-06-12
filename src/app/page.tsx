'use client';

import dynamic from "next/dynamic";

const FarmScene = dynamic(() => import("@/components/FarmScene"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-screen h-screen bg-[#1a1a2e]">
      <div className="text-center">
        <h1
          className="text-4xl font-bold text-[#e8d5b7] mb-4 tracking-wide"
          style={{ fontFamily: "monospace", textShadow: "2px 2px 0 #5c3d1e" }}
        >
          Farm Village
        </h1>
        <div className="flex items-center justify-center gap-2 text-[#a89070]">
          <div className="w-2 h-2 bg-[#7cba5c] rounded-full animate-pulse" />
          <p className="text-sm">Loading the countryside...</p>
          <div
            className="w-2 h-2 bg-[#7cba5c] rounded-full animate-pulse"
            style={{ animationDelay: "0.3s" }}
          />
        </div>
      </div>
    </div>
  ),
});

export default function Home() {
  return <FarmScene />;
}