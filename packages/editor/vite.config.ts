/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@shared': resolve(__dirname, '../shared/src'),
      '@oldworldcharm/shared': resolve(__dirname, '../shared/src'),
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
});
