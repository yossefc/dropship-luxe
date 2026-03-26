'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface Logo {
  name: string;
  src: string;
}

interface LogoCarouselProps {
  title?: string;
  logos?: Logo[];
}

const defaultLogos: Logo[] = [
  { name: 'Vogue', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Vogue_logo.svg/200px-Vogue_logo.svg.png' },
  { name: 'Elle', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Elle_magazine.svg/200px-Elle_magazine.svg.png' },
  { name: 'Marie Claire', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Marie_Claire_logo.svg/200px-Marie_Claire_logo.svg.png' },
  { name: 'Cosmopolitan', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Cosmopolitan_logo.svg/200px-Cosmopolitan_logo.svg.png' },
  { name: 'Glamour', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Glamour_logo.svg/200px-Glamour_logo.svg.png' },
  { name: 'Allure', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Allure_logo.svg/200px-Allure_logo.svg.png' },
];

export function LogoCarousel({ title = 'As Featured In', logos = defaultLogos }: LogoCarouselProps): JSX.Element {
  // Double the logos for seamless infinite scroll
  const duplicatedLogos = [...logos, ...logos];

  return (
    <section className="py-12 md:py-16 bg-neutral-50 overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-6">
        {title && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-xs font-accent font-medium tracking-[0.2em] uppercase text-neutral-500 mb-8"
          >
            {title}
          </motion.p>
        )}
      </div>

      {/* Infinite Scroll Container */}
      <div className="relative">
        {/* Gradient Masks */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-neutral-50 to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-neutral-50 to-transparent z-10" />

        {/* Scrolling Logos */}
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: 'loop',
              duration: 30,
              ease: 'linear',
            },
          }}
          className="flex items-center gap-16 md:gap-24"
        >
          {duplicatedLogos.map((logo, index) => (
            <div
              key={`${logo.name}-${index}`}
              className="flex-shrink-0 h-8 md:h-10 opacity-40 hover:opacity-70 transition-opacity grayscale hover:grayscale-0"
            >
              {/* Using text as placeholder since actual logos might not be available */}
              <span className="font-display text-2xl md:text-3xl text-neutral-600 whitespace-nowrap">
                {logo.name}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
