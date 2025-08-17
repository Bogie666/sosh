/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0f172a',
        'dark-card': 'rgba(15, 23, 42, 0.95)',
        'dark-border': 'rgba(148, 163, 184, 0.2)',
        'dark-text': '#e2e8f0',
        'dark-text-muted': '#cbd5e1',
        'dark-text-secondary': '#9ca3af',
        'accent-blue': '#60a5fa',
        'accent-green': '#10b981',
        'accent-red': '#ef4444',
        'accent-yellow': '#f59e0b',
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        'gradient-blue': 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        'gradient-green': 'linear-gradient(135deg, #10b981, #059669)',
        'gradient-gray': 'linear-gradient(135deg, #64748b, #475569)',
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.3)',
        'glow-yellow': '0 0 20px rgba(245, 158, 11, 0.3)',
        'dark': '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
        'dark-lg': '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'slide-down': 'slideDown 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideDown: {
          from: {
            maxHeight: '0',
            opacity: '0',
            paddingTop: '0',
            paddingBottom: '0'
          },
          to: {
            maxHeight: '2000px',
            opacity: '1',
            paddingTop: 'initial',
            paddingBottom: 'initial'
          }
        },
        slideUp: {
          from: {
            maxHeight: '2000px',
            opacity: '1'
          },
          to: {
            maxHeight: '0',
            opacity: '0',
            paddingTop: '0',
            paddingBottom: '0'
          }
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
