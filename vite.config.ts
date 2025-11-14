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
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
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
          // ArtieChat and subcomponents (lazy loaded)
          if (id.includes('components/artie/') || id.includes('components/ArtieChat')) {
            return 'artie-chat';
          }
          // Large chart libraries
          if (id.includes('node_modules/recharts') || id.includes('node_modules/jspdf')) {
            return 'chart-vendor';
          }
        },
      },
    },
    cssCodeSplit: true,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
  },
}));
