'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Play, X, ThumbsUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface ReviewMedia {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
}

export interface Review {
  id: string;
  author: {
    name: string;
    avatar?: string;
    verified: boolean;
  };
  rating: number;
  date: string;
  title: string;
  content: string;
  media?: ReviewMedia[];
  helpful: number;
  variant?: string;
}

interface UGCReviewsProps {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  ratingDistribution?: { stars: number; count: number }[];
}

// ============================================================================
// Component
// ============================================================================

export function UGCReviews({
  reviews,
  averageRating,
  totalReviews,
  ratingDistribution,
}: UGCReviewsProps): JSX.Element {
  const [selectedMedia, setSelectedMedia] = useState<ReviewMedia | null>(null);
  const [filter, setFilter] = useState<'all' | 'with-media'>('all');

  const filteredReviews =
    filter === 'with-media'
      ? reviews.filter((r) => r.media && r.media.length > 0)
      : reviews;

  // Collect all media for the gallery
  const allMedia = reviews.flatMap((r) =>
    (r.media || []).map((m) => ({ ...m, reviewId: r.id }))
  );

  return (
    <section className="py-12 border-t border-neutral-200">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-8 mb-10">
        {/* Rating Summary */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="flex items-baseline gap-3 mb-2">
            <span className="font-display text-5xl font-light text-primary-800">
              {averageRating.toFixed(1)}
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    'w-5 h-5',
                    star <= Math.round(averageRating)
                      ? 'fill-accent-gold text-accent-gold'
                      : 'text-neutral-300'
                  )}
                />
              ))}
            </div>
          </div>
          <p className="text-sm text-neutral-600">
            Based on {totalReviews} reviews
          </p>

          {/* Rating Distribution */}
          {ratingDistribution && (
            <div className="mt-4 space-y-2">
              {ratingDistribution
                .sort((a, b) => b.stars - a.stars)
                .map(({ stars, count }) => {
                  const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-2 text-sm">
                      <span className="w-8 text-neutral-600">{stars}</span>
                      <Star className="w-3.5 h-3.5 fill-accent-gold text-accent-gold" />
                      <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${percentage}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: 0.1 }}
                          className="h-full bg-accent-gold rounded-full"
                        />
                      </div>
                      <span className="w-8 text-right text-neutral-500">{count}</span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Media Gallery */}
        {allMedia.length > 0 && (
          <div className="flex-1">
            <h3 className="text-sm font-accent font-semibold tracking-wider uppercase text-neutral-600 mb-4">
              Customer Photos & Videos
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {allMedia.slice(0, 8).map((media, index) => (
                <motion.button
                  key={`${media.reviewId}-${index}`}
                  onClick={() => setSelectedMedia(media)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-neutral-100"
                >
                  <Image
                    src={media.thumbnail || media.url}
                    alt="Review media"
                    fill
                    className="object-cover"
                  />
                  {media.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                  )}
                </motion.button>
              ))}
              {allMedia.length > 8 && (
                <button className="flex-shrink-0 w-20 h-20 rounded-lg bg-neutral-100 flex items-center justify-center text-sm font-medium text-neutral-600">
                  +{allMedia.length - 8}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-4 py-2 text-sm font-accent font-medium rounded-full transition-colors',
            filter === 'all'
              ? 'bg-primary-800 text-white'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          )}
        >
          All Reviews ({reviews.length})
        </button>
        <button
          onClick={() => setFilter('with-media')}
          className={cn(
            'px-4 py-2 text-sm font-accent font-medium rounded-full transition-colors',
            filter === 'with-media'
              ? 'bg-primary-800 text-white'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          )}
        >
          With Photos/Videos ({reviews.filter((r) => r.media?.length).length})
        </button>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {filteredReviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            onMediaClick={setSelectedMedia}
          />
        ))}
      </div>

      {/* Media Modal */}
      <AnimatePresence>
        {selectedMedia && (
          <MediaModal media={selectedMedia} onClose={() => setSelectedMedia(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}

// ============================================================================
// Review Card Component
// ============================================================================

interface ReviewCardProps {
  review: Review;
  onMediaClick: (media: ReviewMedia) => void;
}

function ReviewCard({ review, onMediaClick }: ReviewCardProps): JSX.Element {
  const [helpful, setHelpful] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      className="pb-6 border-b border-neutral-100 last:border-0"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neutral-200 overflow-hidden">
          {review.author.avatar ? (
            <Image
              src={review.author.avatar}
              alt={review.author.name}
              width={40}
              height={40}
              className="object-cover"
            />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-sm font-medium text-neutral-600">
              {review.author.name.charAt(0)}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1">
            <span className="font-medium text-primary-800">{review.author.name}</span>
            {review.author.verified && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                Verified Purchase
              </span>
            )}
            <span className="text-sm text-neutral-500">{review.date}</span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  'w-4 h-4',
                  star <= review.rating
                    ? 'fill-accent-gold text-accent-gold'
                    : 'text-neutral-300'
                )}
              />
            ))}
          </div>

          {/* Variant */}
          {review.variant && (
            <p className="text-xs text-neutral-500 mb-2">
              Purchased: {review.variant}
            </p>
          )}

          {/* Title & Content */}
          <h4 className="font-heading font-semibold text-primary-800 mb-1">
            {review.title}
          </h4>
          <p className="text-neutral-600 text-sm leading-relaxed">{review.content}</p>

          {/* Media */}
          {review.media && review.media.length > 0 && (
            <div className="flex gap-2 mt-3">
              {review.media.map((media, index) => (
                <motion.button
                  key={index}
                  onClick={() => onMediaClick(media)}
                  whileHover={{ scale: 1.05 }}
                  className="relative w-16 h-16 rounded-lg overflow-hidden bg-neutral-100"
                >
                  <Image
                    src={media.thumbnail || media.url}
                    alt="Review media"
                    fill
                    className="object-cover"
                  />
                  {media.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          )}

          {/* Helpful */}
          <button
            onClick={() => setHelpful(!helpful)}
            className={cn(
              'mt-4 flex items-center gap-2 text-sm transition-colors',
              helpful ? 'text-accent-gold' : 'text-neutral-500 hover:text-neutral-700'
            )}
          >
            <ThumbsUp className={cn('w-4 h-4', helpful && 'fill-current')} />
            <span>Helpful ({review.helpful + (helpful ? 1 : 0)})</span>
          </button>
        </div>
      </div>
    </motion.article>
  );
}

// ============================================================================
// Media Modal Component
// ============================================================================

interface MediaModalProps {
  media: ReviewMedia;
  onClose: () => void;
}

function MediaModal({ media, onClose }: MediaModalProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
      onClick={onClose}
    >
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        <X className="w-5 h-5" />
      </motion.button>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl max-h-[80vh] w-full"
      >
        {media.type === 'video' ? (
          <video
            src={media.url}
            controls
            autoPlay
            className="w-full h-full object-contain rounded-lg"
          />
        ) : (
          <Image
            src={media.url}
            alt="Review media"
            width={1200}
            height={800}
            className="w-full h-auto object-contain rounded-lg"
          />
        )}
      </motion.div>
    </motion.div>
  );
}
