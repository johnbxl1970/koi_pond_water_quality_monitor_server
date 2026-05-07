import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Pulled from the koi logo: red accent + ink-black text on near-white bg.
        koi: {
          ink: '#181818',
          red: '#d63a2f',
          paper: '#fafaf7',
          line: '#e5e3dc',
          mute: '#7a7770',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
