module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ['"Orbitron"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 600ms ease-out both',
        'fade-in-up': 'fadeInUp 700ms ease-out both',
        'gradient-shift': 'gradientShift 8s ease infinite',
        floaty: 'floaty 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};