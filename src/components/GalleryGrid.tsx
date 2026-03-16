import { useState, useEffect, useCallback, useRef } from 'react';

interface GalleryImage {
  src: string;
  thumbSrc: string;
  alt: string;
  width: number;
  height: number;
}

interface GalleryGridProps {
  images: GalleryImage[];
  columns?: 2 | 3;
}

export default function GalleryGrid({ images, columns = 2 }: GalleryGridProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const open = (index: number, button: HTMLButtonElement) => {
    triggerRef.current = button;
    setActiveIndex(index);
  };

  const close = useCallback(() => {
    setActiveIndex(null);
    // Return focus to the thumbnail that opened the lightbox
    setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  const prev = useCallback(() => {
    setActiveIndex(i => (i !== null ? (i - 1 + images.length) % images.length : null));
  }, [images.length]);

  const next = useCallback(() => {
    setActiveIndex(i => (i !== null ? (i + 1) % images.length : null));
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (activeIndex === null) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prev(); }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeIndex, close, next, prev]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (activeIndex !== null) {
      document.body.style.overflow = 'hidden';
      dialogRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [activeIndex]);

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const delta = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(delta) > 50) {
      if (delta > 0) prev();
      else next();
    }
    setTouchStart(null);
  };

  const active = activeIndex !== null ? images[activeIndex] : null;

  return (
    <>
      {/* Thumbnail Grid */}
      <div
        style={{
          columns: columns,
          columnGap: '24px',
        }}
      >
        {images.map((img, i) => (
          <button
            key={img.thumbSrc}
            onClick={(e) => open(i, e.currentTarget)}
            aria-label={`View ${img.alt}`}
            style={{
              display: 'block',
              width: '100%',
              breakInside: 'avoid',
              marginBottom: '24px',
              padding: 0,
              border: 'none',
              background: 'none',
              cursor: 'zoom-in',
              textAlign: 'left',
            }}
          >
            <img
              src={img.thumbSrc}
              alt={img.alt}
              width={img.width}
              height={img.height}
              loading="lazy"
              decoding="async"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: '6px',
              }}
            />
            <p style={{
              marginTop: '8px',
              color: '#808080',
              fontSize: '.85em',
              fontFamily: 'var(--font-base)',
            }}>
              {img.alt}
            </p>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {active && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Image viewer: ${active.alt}`}
          tabIndex={-1}
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.92)',
            animation: 'galleryFadeIn 150ms ease',
          }}
        >
          {/* Close button */}
          <button
            onClick={close}
            aria-label="Close lightbox"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              zIndex: 51,
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '8px',
              lineHeight: 1,
              opacity: 0.8,
            }}
          >
            ✕
          </button>

          {/* Prev button */}
          {images.length > 1 && (
            <button
              onClick={prev}
              aria-label="Previous image"
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 51,
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '32px',
                cursor: 'pointer',
                padding: '8px',
                lineHeight: 1,
                opacity: 0.8,
              }}
            >
              ‹
            </button>
          )}

          {/* Next button */}
          {images.length > 1 && (
            <button
              onClick={next}
              aria-label="Next image"
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 51,
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '32px',
                cursor: 'pointer',
                padding: '8px',
                lineHeight: 1,
                opacity: 0.8,
              }}
            >
              ›
            </button>
          )}

          {/* Image */}
          <img
            src={active.src}
            alt={active.alt}
            style={{
              maxWidth: '90vw',
              maxHeight: '80vh',
              objectFit: 'contain',
              borderRadius: '4px',
            }}
          />

          {/* Caption + counter */}
          <div style={{
            color: 'rgba(255,255,255,0.8)',
            marginTop: '12px',
            textAlign: 'center',
            fontSize: '0.9em',
            fontFamily: 'var(--font-base)',
          }}>
            <p style={{ margin: 0 }}>{active.alt}</p>
            {images.length > 1 && (
              <p style={{ margin: '4px 0 0', fontSize: '0.85em', opacity: 0.6 }}>
                {activeIndex! + 1} / {images.length}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
