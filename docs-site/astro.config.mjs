import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://vadiraja.github.io',
  base: '/strata-grid',
  integrations: [
    react(),
    starlight({
      title: 'Strata',
      description: 'Open-source React tree data grid for hierarchical and nested data.',
      social: {
        github: 'https://github.com/vadiraja/strata-grid',
      },
      sidebar: [
        {
          label: 'Getting started',
          autogenerate: { directory: 'getting-started' },
        },
        {
          label: 'Guides',
          autogenerate: { directory: 'guides' },
        },
        {
          label: 'API reference',
          autogenerate: { directory: 'api' },
        },
        {
          label: 'Contributing',
          autogenerate: { directory: 'contributing' },
        },
      ],
    }),
  ],
});
