/**
 * Standardized animation configurations for consistent UX
 * Use these with framer-motion or tailwind classes
 */

export const transitions = {
  fast: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
  base: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
  slow: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  spring: { type: "spring", stiffness: 300, damping: 30 },
} as const;

export const modalAnimations = {
  desktop: {
    overlay: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: transitions.fast,
    },
    content: {
      initial: { opacity: 0, scale: 0.95, y: -10 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95, y: -10 },
      transition: transitions.base,
    },
  },
  mobile: {
    overlay: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: transitions.fast,
    },
    content: {
      initial: { y: "100%" },
      animate: { y: 0 },
      exit: { y: "100%" },
      transition: transitions.base,
    },
  },
} as const;

export const slideAnimations = {
  right: {
    initial: { x: "100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "100%", opacity: 0 },
    transition: transitions.base,
  },
  left: {
    initial: { x: "-100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "-100%", opacity: 0 },
    transition: transitions.base,
  },
  up: {
    initial: { y: "100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "100%", opacity: 0 },
    transition: transitions.base,
  },
  down: {
    initial: { y: "-100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "-100%", opacity: 0 },
    transition: transitions.base,
  },
} as const;

export const fadeAnimations = {
  in: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: transitions.base,
  },
  inUp: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
    transition: transitions.base,
  },
} as const;

export const scaleAnimations = {
  in: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: transitions.base,
  },
  pop: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: transitions.spring,
  },
} as const;

/**
 * Tailwind animation class utilities
 * Use these for simple animations without framer-motion
 */
export const animationClasses = {
  fadeIn: "animate-fade-in",
  fadeOut: "animate-fade-out",
  scaleIn: "animate-scale-in",
  scaleOut: "animate-scale-out",
  slideUp: "animate-slide-up",
  slideDown: "animate-slide-down",
  slideInRight: "animate-slide-in-right",
  slideOutRight: "animate-slide-out-right",
  slideInBottom: "animate-slide-in-bottom",
  slideOutBottom: "animate-slide-out-bottom",
  pulse: "animate-pulse-subtle",
  float: "animate-float",
  glow: "animate-glow-pulse",
} as const;
