import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { products } from '@/data/products';
import { vendors } from '@/data/vendors';
import { getProductBySlug, getRelatedProducts, getCategoryBySlug } from '@/lib/product-service';
import Breadcrumb from '@/components/shared/Breadcrumb';
import ProductImageGallery from '@/components/product/ProductImageGallery';
import ProductInfo from '@/components/product/ProductInfo';

export function generateStaticParams() {
  return products.map((product) => ({
    slug: product.slug,
  }));
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  // For static generation, we use a simple approach
  return Promise.resolve({
    title: 'Product — ArtisanMarket',
    description: 'View product details on ArtisanMarket',
  });
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const category = getCategoryBySlug(product.category);
  const vendor = vendors.find((v) => v.id === product.vendorId);
  const relatedProducts = getRelatedProducts(product.id, 4);

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    ...(category
      ? [{ label: category.name, href: `/search?category=${category.slug}` }]
      : []),
    { label: product.name },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-fw-500">
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 py-8 md:py-12">
          <Breadcrumb items={breadcrumbItems} />

          {/* Product Main Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16">
            {/* Image Gallery */}
            <ProductImageGallery
              images={product.images}
              productName={product.name}
            />

            {/* Product Info */}
            <ProductInfo product={product} vendor={vendor} />
          </div>

          {/* Description Section */}
          <section className="mb-16">
            <h2 className="font-heading text-xl font-bold text-ag-100 mb-4">
              Description
            </h2>
            <p className="text-ag-200 font-body leading-relaxed max-w-3xl">
              {product.description}
            </p>
          </section>

          {/* Specifications */}
          {product.specifications.length > 0 && (
            <section className="mb-16">
              <h2 className="font-heading text-xl font-bold text-ag-100 mb-4">
                Specifications
              </h2>
              <div className="bg-fw-900 rounded-2xl border border-ag-500/20 overflow-hidden max-w-2xl">
                {product.specifications.map((spec, index) => (
                  <div
                    key={spec.name}
                    className={`flex items-center px-6 py-3.5 ${
                      index % 2 === 0 ? 'bg-fw-900' : 'bg-ag-800/30'
                    }`}
                  >
                    <span className="w-1/3 text-sm text-ag-300 font-body">
                      {spec.name}
                    </span>
                    <span className="w-2/3 text-sm text-ag-100 font-body font-medium">
                      {spec.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <section className="mb-16">
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-heading text-2xl font-bold text-ag-100">
                  Related Products
                </h2>
                {category && (
                  <Link
                    href={`/search?category=${category.slug}`}
                    className="text-sm text-fw-200 hover:text-fw-100 font-body font-medium transition-colors"
                  >
                    View All
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                {relatedProducts.map((p) => (
                  <Link key={p.id} href={`/product/${p.slug}`}>
                    <ProductCardWrapper product={p} />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

// Client-side product card wrapper to avoid hydration issues
function ProductCardWrapper({ product }: { product: NonNullable<ReturnType<typeof getRelatedProducts>[0]> }) {
  return (
    <div className="group bg-white rounded-2xl border border-ag-500/20 overflow-hidden hover-lift shadow-soft h-full">
      <div className="relative aspect-square bg-ag-800 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {product.badge && (
          <span className={`absolute top-3 left-3 text-[11px] font-heading font-semibold px-2.5 py-0.5 rounded-lg bg-ag-100 text-white`}>
            {product.badge}
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs text-fw-200 font-body font-medium mb-1 truncate">
          {product.vendor}
        </p>
        <h3 className="font-heading font-semibold text-sm text-ag-100 leading-snug mb-2 line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="font-heading font-bold text-lg text-ag-100">
            ${product.price.toFixed(2)}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-ag-400 font-body line-through">
              ${product.originalPrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}