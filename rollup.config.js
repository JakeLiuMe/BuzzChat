// Rollup configuration for BuzzChat
// Bundles modular ES6 code into browser-compatible IIFE

import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const production = process.env.NODE_ENV === 'production';

export default [
  // Content script bundle
  {
    input: 'src/scripts/content-entry.js',
    output: {
      file: 'dist/scripts/content.js',
      format: 'iife',
      name: 'BuzzChatContent',
      sourcemap: !production,
      inlineDynamicImports: true
    },
    plugins: [
      resolve(),
      production && terser({
        format: {
          comments: false
        }
      })
    ].filter(Boolean)
  },
  // Popup script bundle
  {
    input: 'src/popup/popup-entry.js',
    output: {
      file: 'dist/popup/popup.js',
      format: 'iife',
      name: 'BuzzChatPopup',
      sourcemap: !production,
      inlineDynamicImports: true
    },
    plugins: [
      resolve(),
      production && terser({
        format: {
          comments: false
        }
      })
    ].filter(Boolean)
  }
];
