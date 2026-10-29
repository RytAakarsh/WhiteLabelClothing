'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Slide {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  link: string;
}

const DEFAULT_SLIDES: Slide[] = [
  {
    id: 1,
    title: 'Winter Collection',
    subtitle: 'Monochrome Luxe',
    image: '/images/hero-winter-collection.png',
    link: '/collections',
  },
  {
    id: 2,
    title: 'Premium Jacket Sale',
    subtitle: 'Up to 40% Off on Premium Jackets',
    image: '/images/hero-jacket-sale.png',
    link: '/collections/jackets',
  },
  {
    id: 3,
    title: 'Premium Sweatshirt Sale',
    subtitle: 'Up to 40% Off on Premium Sweatshirts',
    image: '/images/hero-sweatshirt-sale.png',
    link: '/collections/sweatshirts',
  },
];

export default function HeroCarousel({ slides = DEFAULT_SLIDES }: { slides?: Slide[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const autoPlayTimer = useRef<NodeJS.Timeout | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Autoplay effect
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;

    autoPlayTimer.current = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [isPaused, nextSlide, slides.length]);

  // Touch Swipe Handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!slides || slides.length === 0) return null;

  return (
    <section
      className="relative w-full bg-black overflow-hidden select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Campaign Hero Carousel"
    >
      {/* Slides Container */}
      <div className="relative w-full aspect-[3/1] max-w-[1920px] mx-auto overflow-hidden">
        {slides.map((slide, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <Link
                href={slide.link}
                className="block relative w-full h-full cursor-pointer focus:outline-hidden"
                tabIndex={isActive ? 0 : -1}
                aria-label={`View ${slide.title} collection`}
              >
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  priority={index === 0}
                  className="object-contain md:object-cover lg:object-contain object-center"
                  sizes="(max-width: 1920px) 100vw, 1920px"
                />
              </Link>
            </div>
          );
        })}
      </div>

      {/* Responsive Navigation Controls */}
      <button
        onClick={prevSlide}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white text-black flex items-center justify-center backdrop-blur-xs transition shadow-md opacity-75 hover:opacity-100"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white text-black flex items-center justify-center backdrop-blur-xs transition shadow-md opacity-75 hover:opacity-100"
        aria-label="Next slide"
      >
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-1.5 sm:space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`transition-all duration-300 h-1 sm:h-1.5 rounded-full ${
              index === currentIndex
                ? 'w-5 sm:w-8 bg-white'
                : 'w-1.5 sm:w-2 bg-white/40 hover:bg-white/70'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
