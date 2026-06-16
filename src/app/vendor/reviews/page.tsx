'use client';

import { useMemo } from 'react';
import { Star } from 'lucide-react';
import { vendorReviews, vendorAnalytics } from '@/data/vendor-dashboard';
import { Progress } from '@/components/ui/progress';

export default function VendorReviewsPage() {
  const avgRating = vendorAnalytics.averageRating;
  const totalReviews = vendorAnalytics.totalReviews;

  // Rating distribution
  const ratingDist = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // 1-5 star
    vendorReviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++;
    });
    return counts.map((count, idx) => ({
      stars: idx + 1,
      count,
      percent: totalReviews > 0 ? Math.round((count / vendorReviews.length) * 100) : 0,
    }));
  }, [totalReviews]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-heading text-ag-100">Reviews</h2>
        <p className="text-sm text-ag-300 font-body mt-1">
          Customer feedback for your products
        </p>
      </div>

      {/* Rating Summary */}
      <div className="bg-white rounded-2xl shadow-soft p-5 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-center">
          {/* Left: Big average */}
          <div className="text-center md:text-left">
            <div className="flex items-baseline gap-2 justify-center md:justify-start">
              <span className="text-5xl font-bold font-heading text-ag-100">{avgRating}</span>
              <span className="text-ag-300 text-lg font-body">/ 5</span>
            </div>
            <div className="flex items-center gap-1 justify-center md:justify-start mt-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < Math.round(avgRating)
                      ? 'text-fw-300 fill-fw-300'
                      : 'text-ag-500'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-ag-300 font-body mt-2">
              Based on {totalReviews} reviews
            </p>
          </div>

          {/* Right: Distribution bars */}
          <div className="space-y-2.5">
            {ratingDist
              .slice()
              .reverse()
              .map((item) => (
                <div key={item.stars} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-ag-200 w-8 text-right font-body">
                    {item.stars}
                  </span>
                  <Star className="w-3.5 h-3.5 text-fw-300 fill-fw-300 shrink-0" />
                  <div className="flex-1">
                    <Progress
                      value={item.percent}
                      className="h-2.5 bg-ag-800 [&>div]:bg-fw-300"
                    />
                  </div>
                  <span className="text-sm text-ag-300 w-10 text-right font-body">
                    {item.count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {vendorReviews.map((review) => (
          <div
            key={review.id}
            className="bg-white rounded-2xl shadow-soft p-5 md:p-6 hover-lift"
          >
            <div className="flex items-start gap-4">
              {/* Avatar */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={review.customerAvatar}
                alt={review.customerName}
                className="w-10 h-10 rounded-full object-cover shrink-0"
              />

              <div className="flex-1 min-w-0">
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div>
                    <p className="font-medium text-ag-100 font-body">{review.customerName}</p>
                    <p className="text-xs text-ag-300 font-body">
                      {new Date(review.date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating
                            ? 'text-fw-300 fill-fw-300'
                            : 'text-ag-500'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Product name */}
                <p className="text-xs text-fw-300 font-medium mt-2 font-heading">
                  {review.productName}
                </p>

                {/* Review text */}
                <p className="text-sm text-ag-200 font-body mt-1.5 leading-relaxed">
                  {review.text}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}