import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { mcpPlugin } from '@lovable.dev/mcp-js/stacks/supabase/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: '::',
    port: 8080,
  },
  plugins: [react(), ...(process.env.VITEST ? [] : [mcpPlugin()])],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Filter the modulepreload list down to chunks the entry actually
    // needs synchronously. Without this, Rolldown's manualChunks can leak
    // dynamic chunks (search engine, vendor-misc) into the entry's
    // `<link rel="modulepreload">` set, forcing 100+KB of unused JS on
    // first paint of `/`.
    modulePreload: {
      resolveDependencies(filename, deps) {
        return deps.filter((dep) => {
          // Never preload code-split chunks for non-root routes or search.
          if (dep.includes('chunk-search')) return false;
          if (dep.includes('vendor-misc')) return false;
          if (dep.includes('vendor-radix')) return false;
          if (dep.includes('vendor-query')) return false;
          if (dep.includes('vendor-supabase')) return false;
          if (dep.includes('vendor-forms')) return false;
          if (dep.includes('vendor-icons')) return false;
          if (dep.includes('AppRoutes')) return false;
          if (dep.includes('SearchExperience')) return false;
          if (dep.includes('Header')) return false;
          return true;
        });
      },
    },
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
          // NOTE: previous `chunk-search` rule removed. It caused Rolldown
          // to hoist shared modules (react, react-router, i18n, search-slug)
          // into the chunk, which then leaked into the entry's preload list.
          // Letting Rolldown auto-split lazy-loaded code keeps `/` clean.
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
