import { defineConfig } from 'vitest/config';

// GitHub Pages sirve el proyecto en https://<usuario>.github.io/us-guided-cvc-sim/
// así que todas las rutas de los recursos llevan el nombre del repo como prefijo.
export default defineConfig({
  base: '/us-guided-cvc-sim/',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
