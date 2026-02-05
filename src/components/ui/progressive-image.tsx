import { useState, useEffect, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { getCDNUrl } from '@/lib/cdn';

interface ProgressiveImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  placeholder?: string;
  alt: string;
  className?: string;
}

/**
 * ProgressiveImage Component
 * 
 * Loads a tiny blurred placeholder first, then fades in the full-resolution image
 */
export const ProgressiveImage = ({
  src,
  placeholder,
  alt,
  className,
  ...props
}: ProgressiveImageProps) => {
  const [imageSrc, setImageSrc] = useState<string>(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!src) return;

    // Start loading full image
    const img = new Image();
    img.onload = () => {
      setImageSrc(getCDNUrl(src, { quality: 85, format: 'webp' }));
      setIsLoaded(true);
    };
    img.onerror = () => {
      // Fallback to original URL if CDN fails
      setImageSrc(src);
      setIsLoaded(true);
    };
    img.src = getCDNUrl(src, { quality: 85, format: 'webp' });
  }, [src]);

  return (
    <img
      {...props}
      src={imageSrc}
      alt={alt}
      className={cn(
        'transition-opacity duration-300',
        isLoaded ? 'opacity-100' : 'opacity-0',
        className
      )}
      loading="lazy"
    />
  );
};
