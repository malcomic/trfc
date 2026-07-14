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
          DEFAULT: '#000000',
          dark: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#FFFFFF',
          light: '#000000',
        },
        night: {
          DEFAULT: '#000000',
          light: '#FFFFFF',
        },
        ink: {
          DEFAULT: '#0A0A0A',
          light: '#FAFAFA',
        },
        ash: {
          DEFAULT: '#141414',
          light: '#F5F5F5',
        },
        smoke: {
          DEFAULT: '#262626',
          light: '#E5E5E5',
        },
        chalk: {
          DEFAULT: '#FFFFFF',
          light: '#000000',
        },
        fog: {
          DEFAULT: '#A3A3A3',
          light: '#737373',
        },
        mist: {
          DEFAULT: '#525252',
          light: '#D4D4D4',
        },
        gold: '#C9A84C',
        // Fitness-inspired status colors
        'success-green': '#22C55E',
        'warning-amber': '#F59E0B',
        'danger-red': '#EF4444',
        'info-blue': '#3B82F6',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        bebas: ['var(--font-display)', 'sans-serif'],
        barlow: ['var(--font-body)', 'sans-serif'],
        'barlow-condensed': ['var(--font-condensed)', 'sans-serif'],
      },
      // Button sizing tokens
      height: {
        9: '2.25rem',   // 36px - sm button
        11: '2.75rem',  // 44px - md button (default)
        13: '3.25rem',  // 52px - lg button
      },
      // Consistent spacing scale
      spacing: {
        4: '1rem',      // 16px - small
        6: '1.5rem',    // 24px - medium (default)
        8: '2rem',      // 32px - large
        12: '3rem',     // 48px - xl
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
          '0%': { boxShadow: '0 0 0 0 rgba(255,255,255,0.4)' },
          '70%': { boxShadow: '0 0 0 20px rgba(255,255,255,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(255,255,255,0)' },
        },
        grain: {
          '0%, 100%': { backgroundPosition: '0% 0%' },
          '10%': { backgroundPosition: '-5% -10%' },
          '30%': { backgroundPosition: '3% 5%' },
          '60%': { backgroundPosition: '-8% 2%' },
          '80%': { backgroundPosition: '5% -5%' },
        },
        toastIn: {
          from: { opacity: '0', transform: 'translateY(16px) scale(0.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.8s ease forwards',
        slideRight: 'slideRight 0.8s cubic-bezier(0.16,1,0.3,1) forwards',
        scaleIn: 'scaleIn 0.6s ease forwards',
        ticker: 'ticker 22s linear infinite',
        'pulse-ring': 'pulse-ring 2s ease infinite',
        grain: 'grain 8s steps(10) infinite',
        toastIn: 'toastIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
      },
      transitionDuration: {
        '300': '300ms',
      },
      spacing: {
        '0.25': '0.0625rem',
        '0.75': '0.1875rem',
        '1.25': '0.3125rem',
        '1.75': '0.4375rem',
        '4.5': '1.125rem',
        '8.5': '2.125rem',
        '15': '3.75rem',
        '55': '13.75rem',
      },
      borderWidth: {
        '1.5': '1.5px',
      },
      scale: {
        '103': '1.03',
        '104': '1.04',
        '106': '1.06',
        '108': '1.08',
      },
      zIndex: {
        '100': '100',
      },
      fontSize: {
        'clamp-2xl': ['clamp(2rem, 5vw, 4rem)', { lineHeight: '1' }],
        'clamp-3xl': ['clamp(3rem, 8vw, 6rem)', { lineHeight: '1' }],
      },
      clipPath: {
        'angled': 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
        'angled-sm': 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
        'angled-lg': 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 8px))',
      },
    },
  },
  plugins: [
    function ({ addVariant }) {
      addVariant('light', 'html:not(.dark) &')
    },
  ],
}
