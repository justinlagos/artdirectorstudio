import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Stub out cordova imports for browser-image-compression (not needed in web)
      "cordova/modulemapper": path.resolve(__dirname, "./src/lib/stubs/cordova-stub.js"),
    },
    // Dedupe lodash to prevent multiple instances and default export issues
    dedupe: ['lodash'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    },
    cssCodeSplit: true,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    target: 'esnext',
    treeshake: {
      moduleSideEffects: false,
    },
    reportCompressedSize: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'lucide-react', // Include for proper React dependency resolution
      'lodash', // Explicitly include lodash for proper transformation
    ],
    exclude: [
      'jspdf',
      'pdfjs-dist',
      'html2canvas',
      'browser-image-compression', // Exclude from optimization - has cordova imports that break in web
    ],
    // Force ESM resolution for lodash to prevent default export issues
    esbuildOptions: {
      target: 'esnext',
      // Handle lodash imports properly - convert CommonJS to ESM
      format: 'esm',
    },
  },
}));
