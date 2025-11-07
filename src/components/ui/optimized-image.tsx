import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { supportsWebP, generateBase64LQIP } from '@/lib/imageOptimization';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  sizes?: string;
  widths?: number[];
  className?: string;
  fallback?: string;
  enableBlurUp?: boolean;
  lqipWidth?: number;
}

/**
 * Optimized image component with WebP support, responsive srcsets, and blur-up loading
 */
export const OptimizedImage = ({
  src,
  alt,
  sizes = '100vw',
  widths = [320, 640, 1024, 1920],
  className,
  fallback,
  loading = 'lazy',
  decoding = 'async',
  enableBlurUp = true,
  lqipWidth = 20,
  ...props
}: OptimizedImageProps) => {
  const [webpSupported, setWebpSupported] = useState<boolean | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width?: number; height?: number }>({});
  const [lqip, setLqip] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    supportsWebP().then(setWebpSupported);
    
    // Generate LQIP for blur-up effect
    if (enableBlurUp && !src.startsWith('data:')) {
      generateBase64LQIP(src, lqipWidth, 0.1)
        .then(setLqip)
        .catch(() => {
          // Fallback to no LQIP if generation fails
          setLqip(null);
        });
    }
    
    // Preload dimensions
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = src;
  }, [src, enableBlurUp, lqipWidth]);

  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  // For data URLs and already optimized images, use direct rendering
  if (src.startsWith('data:') || src.includes('base64')) {
    return (
      <div className="relative overflow-hidden">
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={cn('transition-opacity duration-300', className)}
          loading={loading}
          decoding={decoding}
          onLoad={handleImageLoad}
          {...imageDimensions}
          {...props}
        />
      </div>
    );
  }

  // For Supabase storage or external URLs
  const isSupabaseStorage = src.includes('supabase.co/storage');
  
  if (isSupabaseStorage && webpSupported !== null) {
    // Generate srcset for responsive images
    const srcset = widths
      .map((width) => {
        const url = new URL(src);
        url.searchParams.set('width', width.toString());
        url.searchParams.set('quality', '85');
        if (webpSupported) {
          url.searchParams.set('format', 'webp');
        }
        return `${url.toString()} ${width}w`;
      })
      .join(', ');

    return (
      <div className="relative overflow-hidden bg-muted">
        {/* LQIP Placeholder with blur effect */}
        {lqip && !isLoaded && (
          <img
            src={lqip}
            alt=""
            className={cn(
              'absolute inset-0 w-full h-full object-cover',
              'blur-xl scale-110 transition-opacity duration-500',
              isLoaded ? 'opacity-0' : 'opacity-100'
            )}
            aria-hidden="true"
          />
        )}
        
        {/* Full resolution image */}
        <picture>
          {webpSupported && (
            <source type="image/webp" srcSet={srcset} sizes={sizes} />
          )}
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            srcSet={srcset}
            sizes={sizes}
            className={cn(
              'relative transition-opacity duration-500',
              isLoaded ? 'opacity-100' : 'opacity-0',
              className
            )}
            loading={loading}
            decoding={decoding}
            onLoad={handleImageLoad}
            {...imageDimensions}
            {...props}
          />
        </picture>
      </div>
    );
  }

  // Fallback for non-Supabase images or while checking WebP support
  return (
    <div className="relative overflow-hidden bg-muted">
      {/* LQIP Placeholder with blur effect */}
      {lqip && !isLoaded && (
        <img
          src={lqip}
          alt=""
          className={cn(
            'absolute inset-0 w-full h-full object-cover',
            'blur-xl scale-110 transition-opacity duration-500',
            isLoaded ? 'opacity-0' : 'opacity-100'
          )}
          aria-hidden="true"
        />
      )}
      
      {/* Full resolution image */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={cn(
          'relative transition-opacity duration-500',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        loading={loading}
        decoding={decoding}
        onLoad={handleImageLoad}
        {...imageDimensions}
        {...props}
      />
    </div>
  );
};
