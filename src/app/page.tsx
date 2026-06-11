'use client';

import dynamic from 'next/dynamic';

const UnderwaterScene = dynamic(() => import('@/components/underwater/UnderwaterScene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#041529]">
      <div className="mb-6 h-16 w-16 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
      <h1 className="bg-gradient-to-r from-cyan-300 via-teal-400 to-blue-400 bg-clip-text text-2xl font-bold text-transparent">
        Deep Ocean
      </h1>
      <p className="mt-2 text-sm text-cyan-200/40">Diving into the depths...</p>
    </div>
  ),
});

export default function Page() {
  return <UnderwaterScene />;
}