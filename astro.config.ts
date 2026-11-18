import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import todoGuard from './src/integrations/todo-guard';

/** Pages marked noindex: kept out of the sitemap too. */
const notInSitemap = ['/thank-you/', '/styleguide/', '/404', '/kids/ask-a-grown-up/'];

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: 'https://pholoso.africa',
  output: 'static',
  // Scope component styles with a short class (.astro-xxxx) rather than a long attribute:
  // same specificity, about 1 KB less CSS after compression.
  scopedStyleStrategy: 'class',
  trailingSlash: 'always',
  build: {
    // /about/ -> dist/about/index.html
    format: 'directory',
    // The Content-Security-Policy forbids inline styles: always emit external CSS files.
    inlineStylesheets: 'never',
  },
  vite: {
    build: {
      // Astro inlines small scripts (and Vite small assets) below this limit.
      // 0 keeps every script and asset as an external file, as the CSP requires.
      assetsInlineLimit: 0,
      // One stylesheet for the whole site instead of a dozen small per-component files:
      // less overhead per request, and after the first page every page's CSS is cached
      // (brief §12: CSS ≤ 12 KB gzipped).
      cssCodeSplit: false,
    },
  },
  devToolbar: { enabled: false },
  integrations: [
    todoGuard(),
    sitemap({
      filter: (page) => !notInSitemap.some((path) => new URL(page).pathname.startsWith(path)),
    }),
  ],
});
