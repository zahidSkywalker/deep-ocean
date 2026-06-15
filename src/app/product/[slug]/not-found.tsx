import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PackageSearch } from 'lucide-react';

export default function ProductNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-fw-500 px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-ag-800 flex items-center justify-center mx-auto mb-6">
          <PackageSearch className="size-10 text-ag-300" />
        </div>
        <h1 className="font-heading text-3xl font-bold text-ag-100 mb-3">
          Product Not Found
        </h1>
        <p className="text-ag-300 font-body mb-8">
          We couldn&apos;t find the product you&apos;re looking for. It may have been removed or the link may be incorrect.
        </p>
        <div className="flex items-center gap-3 justify-center">
          <Link href="/">
            <Button className="bg-ag-100 hover:bg-ag-200 text-white font-heading font-medium rounded-xl">
              Go Home
            </Button>
          </Link>
          <Link href="/search">
            <Button variant="outline" className="border-ag-400 text-ag-200 hover:bg-ag-800/50 font-heading font-medium rounded-xl">
              Browse Products
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}