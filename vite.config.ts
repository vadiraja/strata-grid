import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev playground config for `npm run dev`.
// Vitest uses vitest.config.ts; this file is only for the browser playground.
export default defineConfig({
  plugins: [react()],
});
