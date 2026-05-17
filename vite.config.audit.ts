import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

export default defineConfig({
  plugins: [react(), visualizer({ filename: '/tmp/stats.json', template: 'raw-data', emitFile: false }) as any],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: {
    outDir: 'dist-audit',
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router-dom')) return 'vendor-react';
          if (id.includes('node_modules/@radix-ui')) return 'vendor-radix';
          if (id.includes('node_modules/@tanstack')) return 'vendor-query';
          if (id.includes('node_modules/@supabase')) return 'vendor-supabase';
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
          if (id.includes('node_modules/sonner') || id.includes('node_modules/cmdk') || id.includes('node_modules/vaul') || id.includes('node_modules/next-themes')) return 'vendor-misc';
          if (id.includes('/src/lib/search/') || id.includes('/src/lib/scryfall/') || id.includes('/src/lib/relationships/') || id.includes('/src/lib/query-translator') || id.includes('/src/services/discovery') || id.includes('/src/services/local-cards') || id.includes('/src/hooks/useSearch') || id.includes('/src/hooks/useSimilarCards') || id.includes('/src/hooks/useDeckIdeas') || id.includes('/src/hooks/useQueryIntelligence') || id.includes('/src/hooks/useQuerySuggestions')) return 'chunk-search';
        },
      },
    },
  },
});
