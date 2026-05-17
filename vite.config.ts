import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: '::',
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router-dom')) return 'vendor-react';
          if (id.includes('node_modules/@radix-ui')) return 'vendor-radix';
          if (id.includes('node_modules/@tanstack')) return 'vendor-query';
          if (id.includes('node_modules/@supabase')) return 'vendor-supabase';
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
          if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/@hookform') || id.includes('node_modules/zod')) return 'vendor-forms';
          if (id.includes('node_modules/sonner') || id.includes('node_modules/cmdk') || id.includes('node_modules/vaul') || id.includes('node_modules/next-themes')) return 'vendor-misc';
          // Search engine code — heavy and only needed after the user actually searches.
          // Isolating into its own chunk lets the homepage paint without loading it.
          if (
            id.includes('/src/lib/search/') ||
            id.includes('/src/lib/scryfall/') ||
            id.includes('/src/lib/relationships/') ||
            id.includes('/src/lib/query-translator') ||
            id.includes('/src/services/discovery') ||
            id.includes('/src/services/local-cards') ||
            id.includes('/src/hooks/useSearch') ||
            id.includes('/src/hooks/useSimilarCards') ||
            id.includes('/src/hooks/useDeckIdeas') ||
            id.includes('/src/hooks/useQueryIntelligence') ||
            id.includes('/src/hooks/useQuerySuggestions')
          ) {
            return 'chunk-search';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      lines: 85,
      functions: 85,
      branches: 80,
      statements: 85,
      include: ['src/lib/**'],
      exclude: ['src/lib/logger.ts'],
    },
  },
}));
