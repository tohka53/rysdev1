// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
    "./src/app/**/*.{html,ts,js}"
  ],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fefce8',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        medical: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in-up': 'slideInUp 0.5s ease-out',
        'slide-in-down': 'slideInDown 0.5s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 2s ease-in-out infinite',
        'bounce-slow': 'bounce 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInDown: {
          '0%': { transform: 'translateY(-30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'button': '0 4px 8px rgba(0, 0, 0, 0.1)',
        'button-hover': '0 8px 16px rgba(0, 0, 0, 0.15)',
      },
      borderRadius: {
        'card': '0.75rem',
        'button': '0.5rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      }
    },
  },
  plugins: [
    // Plugin para forms (opcional)
    // require('@tailwindcss/forms'),
    
    // Plugin para typography (opcional)
    // require('@tailwindcss/typography'),
    
    // Plugin personalizado para componentes médicos
    function({ addComponents, theme }) {
      addComponents({
        '.btn': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `${theme('spacing.3')} ${theme('spacing.6')}`,
          fontWeight: theme('fontWeight.medium'),
          borderRadius: theme('borderRadius.button'),
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          border: 'none',
          outline: 'none',
          textDecoration: 'none',
          '&:focus': {
            outline: `2px solid ${theme('colors.primary.500')}`,
            outlineOffset: '2px',
          },
        },
        '.btn-primary': {
          background: `linear-gradient(135deg, ${theme('colors.primary.600')}, ${theme('colors.primary.700')})`,
          color: theme('colors.white'),
          '&:hover': {
            background: `linear-gradient(135deg, ${theme('colors.primary.700')}, ${theme('colors.primary.800')})`,
            transform: 'translateY(-2px)',
            boxShadow: `0 10px 20px rgba(37, 99, 235, 0.3)`,
          },
        },
        '.btn-secondary': {
          backgroundColor: theme('colors.secondary.100'),
          color: theme('colors.secondary.700'),
          border: `1px solid ${theme('colors.secondary.300')}`,
          '&:hover': {
            backgroundColor: theme('colors.secondary.200'),
            transform: 'translateY(-2px)',
            boxShadow: theme('boxShadow.button'),
          },
        },
        '.card': {
          backgroundColor: theme('colors.white'),
          borderRadius: theme('borderRadius.card'),
          padding: theme('spacing.6'),
          boxShadow: theme('boxShadow.card'),
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: theme('boxShadow.card-hover'),
          },
        },
        '.medical-gradient': {
          background: `linear-gradient(135deg, ${theme('colors.medical.500')}, ${theme('colors.primary.600')})`,
        },
        '.health-gradient': {
          background: `linear-gradient(135deg, ${theme('colors.success.400')}, ${theme('colors.medical.500')})`,
        },
      })
    }
  ],
}