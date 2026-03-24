import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary - Deep & Sophisticated
        primary: {
          900: '#0a0a0f',
          800: '#1a1a24',
          700: '#2d2d3a',
          600: '#3d3d4d',
        },
        // Secondary - Muted & Elegant
        secondary: {
          navy: '#1e2a3a',
          bordeaux: '#4a2c2a',
          olive: '#3a3d2f',
          mauve: '#3d2d3a',
        },
        // Neutrals - Light & Luminous
        neutral: {
          50: '#fefefe',
          100: '#f8f7f5',
          200: '#f0ede8',
          300: '#e5e0d8',
          400: '#d4cdc2',
          500: '#a89f94',
          600: '#7a7067',
          700: '#5c544c',
        },
        // Precious Accents
        accent: {
          gold: '#c9a962',
          'gold-light': '#e4d4a5',
          'gold-dark': '#8b7355',
          'rose-gold': '#b76e79',
          platinum: '#a8a9ad',
          champagne: '#f7e7ce',
        },
        // Semantic
        success: '#4a5d4a',
        warning: '#8b7355',
        error: '#6b3a3a',
        info: '#3a4a5d',
      },
      fontFamily: {
        display: ['Playfair Display', 'Cormorant Garamond', 'Times New Roman', 'serif'],
        heading: ['Cormorant', 'Playfair Display', 'Georgia', 'serif'],
        body: ['Inter', 'Helvetica Neue', '-apple-system', 'sans-serif'],
        accent: ['Montserrat', 'Inter', 'sans-serif'],
      },
      fontSize: {
        'hero': ['clamp(3.5rem, 3rem + 3vw, 6rem)', { lineHeight: '1' }],
      },
      spacing: {
        'section': 'clamp(4rem, 8vw, 8rem)',
        'block': 'clamp(2rem, 4vw, 4rem)',
      },
      boxShadow: {
        'luxury': '0 20px 60px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.04)',
        'gold': '0 4px 20px rgba(201, 169, 98, 0.15)',
      },
      transitionTimingFunction: {
        'luxury': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
