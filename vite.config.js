import { defineConfig } from 'vite';

// GitHub Pages serves project sites from /<repo>/, so the production build
// needs that prefix on every asset URL. The dev server still runs at the root.
// If you later move to a custom domain (or Vercel/Netlify), set BASE to '/'.
const BASE = '/';

export default defineConfig(({ command }) => ({
	base: command === 'build' ? BASE : '/',
	server: {
		port: 5180,
		strictPort: true
	},
	build: {
		target: 'es2020',
		cssTarget: 'chrome100'
	}
}));
