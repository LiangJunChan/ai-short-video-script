/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Ice Blue Palette
        ice: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        // Semantic colors
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'soft-sm': '0 2px 8px rgba(15, 23, 42, 0.05)',
        'soft-md': '0 4px 16px rgba(15, 23, 42, 0.07)',
        'soft-lg': '0 8px 32px rgba(15, 23, 42, 0.09)',
        'focus': '0 0 0 3px rgba(125, 211, 252, 0.3)',
      },
    },
  },
  plugins: [],
}
