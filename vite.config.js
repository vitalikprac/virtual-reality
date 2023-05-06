import glsl from 'vite-plugin-glsl';
import mkcert from 'vite-plugin-mkcert'
import { defineConfig } from 'vite';

export default defineConfig({
  server: { https: true },
  base: '/virtual-reality/',
  plugins: [glsl(), mkcert()]
});

