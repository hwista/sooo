import { createRequire } from 'node:module';
import type { Config } from 'tailwindcss';

const require = createRequire(import.meta.url);
const ssooTailwindPreset = require('@ssoo/web-ui/tailwind-preset');
const tailwindcssAnimate = require('tailwindcss-animate');

const config: Config = {
  darkMode: ['class'],
  presets: [ssooTailwindPreset],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../../packages/web-auth/src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../../packages/web-shell/src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../../packages/web-ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  plugins: [tailwindcssAnimate],
};

export default config;
