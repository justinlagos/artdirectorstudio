import { cn } from "@/lib/utils";

interface ImageContainerProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  maxHeight?: string;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
}

/**
 * Shared ImageContainer component for consistent image display across modals
 * Prevents stretching and maintains proper aspect ratio
 */
export const ImageContainer = ({
  src,
  alt,
  className,
  containerClassName,
  maxHeight = "max-h-[400px]",
  objectFit = "contain",
}: ImageContainerProps) => {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg bg-muted/30 p-4 border border-border/50",
        "overflow-hidden",
        containerClassName
      )}
    >
      <img
        src={src}
        alt={alt}
        className={cn(
          "w-auto h-auto",
          maxHeight,
          "object-" + objectFit,
          "rounded-md",
          className
        )}
        style={{
          maxWidth: "100%",
          height: "auto",
        }}
      />
    </div>
  );
};

