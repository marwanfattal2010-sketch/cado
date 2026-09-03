import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        /**
         * VENDOR CODE IN ITS OWN CHUNKS, and the reason is caching, not size.
         *
         * React, the router, react-query and supabase-js barely change. Left
         * in the main bundle they get a new content hash on every deploy, so
         * a returning visitor re-downloads all of them to pick up a one-line
         * copy change. Split out, those files keep their hash across deploys
         * and come straight from the browser cache — which for someone opening
         * CADO for the second time is most of the download gone.
         *
         * Grouped by how they change together rather than one chunk per
         * package: fifty tiny files cost more in requests than they save in
         * bytes, and HTTP/2 does not make a request free.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('@tanstack')) return 'vendor-query'
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('react-router') ||
            id.includes('scheduler')
          ) {
            return 'vendor-react'
          }
          /*
           * Everything else is left to Rollup ON PURPOSE.
           *
           * A catch-all `return 'vendor'` looks tidier and is worse: it pulls
           * libraries used by ONE route — the ones checkout or the gift-card
           * flow need — into a chunk the home page loads on every visit. That
           * undoes the split for 83KB of code most visitors never reach.
           * Unnamed, those land in the route chunk that actually imports them.
           */
          return undefined
        },
      },
    },
  },
})
