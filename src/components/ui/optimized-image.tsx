import { useState, useEffect, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { supportsWebP } from '@/lib/imageOptimization';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  sizes?: string;
  widths?: number[];
  className?: string;
  fallback?: string;
}

/**
 * Optimized image component with WebP support and responsive srcsets
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
  ...props
}: OptimizedImageProps) => {
  const [webpSupported, setWebpSupported] = useState<boolean | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width?: number; height?: number }>({});

  useEffect(() => {
    supportsWebP().then(setWebpSupported);
    
    // Preload dimensions
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = src;
  }, [src]);

  // For data URLs and already optimized images, use direct rendering
  if (src.startsWith('data:') || src.includes('base64')) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn('transition-opacity duration-300', className)}
        loading={loading}
        decoding={decoding}
        {...imageDimensions}
        {...props}
      />
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
      <picture>
        {webpSupported && (
          <source type="image/webp" srcSet={srcset} sizes={sizes} />
        )}
        <img
          src={src}
          alt={alt}
          srcSet={srcset}
          sizes={sizes}
          className={cn('transition-opacity duration-300', className)}
          loading={loading}
          decoding={decoding}
          {...imageDimensions}
          {...props}
        />
      </picture>
    );
  }

  // Fallback for non-Supabase images or while checking WebP support
  return (
    <img
      src={src}
      alt={alt}
      className={cn('transition-opacity duration-300', className)}
      loading={loading}
      decoding={decoding}
      {...imageDimensions}
      {...props}
    />
  );
};
