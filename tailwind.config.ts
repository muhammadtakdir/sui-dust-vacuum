import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sui: {
          blue: '#4DA2FF',
          dark: '#0F1419',
          darker: '#080B0E',
          card: '#1A1F26',
          border: '#2D3640',
          muted: '#6B7280',
          success: '#22C55E',
          warning: '#F59E0B',
          danger: '#EF4444',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'sui-gradient': 'linear-gradient(135deg, #4DA2FF 0%, #6366F1 100%)',
        'dust-gradient': 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'vacuum': 'vacuum 1s ease-in-out',
        'particle': 'particle 2s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(77, 162, 255, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(77, 162, 255, 0.6)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'vacuum': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(0.5)', opacity: '0.5' },
          '100%': { transform: 'scale(0) translateX(100px)', opacity: '0' },
        },
        'particle': {
          '0%': { transform: 'translate(0, 0) scale(1)', opacity: '1' },
          '100%': { transform: 'translate(var(--x), var(--y)) scale(0)', opacity: '0' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
