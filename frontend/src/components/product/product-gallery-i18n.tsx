'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { ZoomIn, X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface ProductImage {
  id: string;
  src: string;
  alt: string;
}

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps): JSX.Element {
  const t = useTranslations('products');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const handleThumbnailClick = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const handlePrevious = useCallback(() => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setSelectedIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  const currentImage = images[selectedIndex];

  return (
    <div className="relative lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)]">
      {/* Main Image Container */}
      <div
        className="relative aspect-[3/4] lg:aspect-auto lg:h-full bg-neutral-100 overflow-hidden cursor-zoom-in group"
        onClick={() => setIsZoomed(true)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImage?.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            {currentImage != null && (
              <Image
                src={currentImage.src}
                alt={currentImage.alt}
                fill
                className="object-cover transition-transform duration-700 ease-luxury group-hover:scale-[1.02]"
                sizes="(max-width: 1024px) 100vw, 55vw"
                priority={selectedIndex === 0}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows (mobile & desktop) */}
        <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-lg pointer-events-auto"
            aria-label={t('gallery.previous')}
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-lg pointer-events-auto"
            aria-label={t('gallery.next')}
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Zoom hint */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-full text-xs text-neutral-600"
        >
          <ZoomIn className="w-4 h-4" />
          <span className="hidden sm:inline">{t('gallery.zoomHint')}</span>
        </motion.div>

        {/* Image counter */}
        <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-neutral-700">
          {selectedIndex + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnails - Vertical on desktop, horizontal on mobile */}
      <div className="flex lg:flex-col gap-2 p-4 lg:absolute lg:left-6 lg:top-1/2 lg:-translate-y-1/2 lg:p-0 overflow-x-auto lg:overflow-y-auto lg:max-h-[60vh] scrollbar-hide">
        {images.map((image, index) => (
          <motion.button
            key={image.id}
            onClick={() => handleThumbnailClick(index)}
            className={cn(
              'relative flex-shrink-0 w-[60px] h-[80px] rounded-md overflow-hidden transition-all duration-200',
              'border-2',
              selectedIndex === index
                ? 'border-accent-gold opacity-100 shadow-md'
                : 'border-transparent opacity-60 hover:opacity-100'
            )}
            style={{ position: 'relative' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            aria-label={`${productName} - ${t('gallery.view')} ${index + 1}`}
          >
            <Image
              src={image.src}
              alt={`${productName} - ${index + 1}`}
              fill
              className="object-cover"
              sizes="60px"
            />
          </motion.button>
        ))}
      </div>

      {/* Fullscreen Zoom Modal */}
      <AnimatePresence>
        {isZoomed && currentImage != null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md cursor-zoom-out"
            onClick={() => setIsZoomed(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-8 lg:inset-16"
              style={{ position: 'absolute' }}
            >
              <Image
                src={currentImage.src}
                alt={currentImage.alt}
                fill
                className="object-contain"
                sizes="100vw"
                quality={90}
              />
            </motion.div>

            {/* Close button */}
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              onClick={() => setIsZoomed(false)}
              aria-label={t('gallery.close')}
            >
              <X className="w-6 h-6" />
            </motion.button>

            {/* Navigation in fullscreen */}
            <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-6">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevious();
                }}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label={t('gallery.previous')}
              >
                <ChevronLeft className="w-6 h-6" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label={t('gallery.next')}
              >
                <ChevronRight className="w-6 h-6" />
              </motion.button>
            </div>

            {/* Thumbnail strip at bottom */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-white/10 backdrop-blur-sm rounded-lg"
            >
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleThumbnailClick(index);
                  }}
                  className={cn(
                    'relative w-12 h-16 rounded overflow-hidden transition-all',
                    selectedIndex === index
                      ? 'ring-2 ring-accent-gold'
                      : 'opacity-60 hover:opacity-100'
                  )}
                  style={{ position: 'relative' }}
                >
                  <Image
                    src={image.src}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
