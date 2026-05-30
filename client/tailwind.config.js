export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E8401C',
          dark: '#FF4500',
        },
        fire: {
          DEFAULT: '#FF4500',
          light: '#FF4500',
          dark: '#FF4500',
        },
        ember: '#FF7A1A',
        night: {
          DEFAULT: '#0A0A0A',
          light: '#FFFFFF',
        },
        ink: {
          DEFAULT: '#111111',
          light: '#F8F8F8',
        },
        ash: {
          DEFAULT: '#1C1C1C',
          light: '#F0F0F0',
        },
        smoke: {
          DEFAULT: '#2E2E2E',
          light: '#E8E8E8',
        },
        chalk: {
          DEFAULT: '#F5F2EE',
          light: '#1A1A1A',
        },
        fog: {
          DEFAULT: '#6B6B6B',
          light: '#666666',
        },
        mist: {
          DEFAULT: '#3D3D3D',
          light: '#D0D0D0',
        },
        gold: '#C9A84C',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        bebas: ['Bebas Neue', 'sans-serif'],
        barlow: ['Barlow', 'sans-serif'],
        'barlow-condensed': ['Barlow Condensed', 'sans-serif'],
      },
      keyframes: {
        fadeUp: {
          'from': { opacity: '0', transform: 'translateY(40px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          'from': { opacity: '0', transform: 'translateX(-60px)' },
          'to': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          'from': { opacity: '0', transform: 'scale(0.92)' },
          'to': { opacity: '1', transform: 'scale(1)' },
        },
        ticker: {
          'from': { transform: 'translateX(0)' },
          'to': { transform: 'translateX(-50%)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(255,69,0,0.4)' },
          '70%': { boxShadow: '0 0 0 20px rgba(255,69,0,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(255,69,0,0)' },
        },
        grain: {
          '0%, 100%': { backgroundPosition: '0% 0%' },
          '10%': { backgroundPosition: '-5% -10%' },
          '30%': { backgroundPosition: '3% 5%' },
          '60%': { backgroundPosition: '-8% 2%' },
          '80%': { backgroundPosition: '5% -5%' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.8s ease forwards',
        slideRight: 'slideRight 0.8s cubic-bezier(0.16,1,0.3,1) forwards',
        scaleIn: 'scaleIn 0.6s ease forwards',
        ticker: 'ticker 22s linear infinite',
        'pulse-ring': 'pulse-ring 2s ease infinite',
        grain: 'grain 8s steps(10) infinite',
      },
      transitionDuration: {
        '300': '300ms',
      },
      clipPath: {
        'angled': 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
        'angled-sm': 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
        'angled-lg': 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
      },
    },
  },
  plugins: [
    function ({ addVariant }) {
      addVariant('light', 'html:not(.dark) &')
    },
  ],
}
