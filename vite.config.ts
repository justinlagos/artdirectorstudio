import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { viteCommonjs } from "@originjs/vite-plugin-commonjs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    viteCommonjs({
      // Specifically handle lodash and its dependencies
      include: [/lodash/, /node_modules/],
      transformMixedEsModules: true,
    }),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Dedupe lodash to prevent multiple instances and default export issues
    dedupe: ['lodash'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Lodash - separate chunk to handle CommonJS properly
          if (id.includes('node_modules/lodash')) {
            return 'lodash-vendor';
          }
          // React core
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
            return 'react-vendor';
          }
          // Radix UI components
          if (id.includes('node_modules/@radix-ui/')) {
            return 'ui-vendor';
          }
          // TanStack Query
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'query-vendor';
          }
          // Supabase
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase-vendor';
          }
          // Large chart libraries (lazy loaded)
          if (id.includes('node_modules/recharts')) {
            return 'chart-vendor';
          }
          // PDF libraries (lazy loaded)
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/pdfjs-dist')) {
            return 'pdf-vendor';
          }
          // Document parsing (lazy loaded)
          if (id.includes('node_modules/mammoth')) {
            return 'document-vendor';
          }
          // Image processing (lazy loaded)
          if (id.includes('node_modules/browser-image-compression') || id.includes('node_modules/html2canvas')) {
            return 'image-vendor';
          }
          // ArtieChat and subcomponents (lazy loaded)
          if (id.includes('components/artie/') || id.includes('components/ArtieChat')) {
            return 'artie-chat';
          }
          // Universal Image Workspace (lazy loaded)
          if (id.includes('components/UniversalImageWorkspace') || id.includes('components/edit-image/')) {
            return 'image-workspace';
          }
          // Analytics components (lazy loaded)
          if (id.includes('components/admin/') || id.includes('components/UserAnalytics')) {
            return 'analytics-vendor';
          }
        },
      },
    },
    cssCodeSplit: true,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    // Enable source maps for better debugging in production
    sourcemap: false,
    // Optimize chunk size
    target: 'esnext',
    // Tree-shake unused exports
    treeshake: {
      moduleSideEffects: false,
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'lodash', // Explicitly include lodash for proper transformation
    ],
    exclude: [
      'jspdf',
      'pdfjs-dist',
      'mammoth',
      'html2canvas',
    ],
    // Force ESM resolution for lodash to prevent default export issues
    esbuildOptions: {
      target: 'esnext',
      // Handle lodash imports properly
      plugins: [],
    },
  },
}));
