/** @type {import('tailwindcss').Config} */
module.exports = {
  purge: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        // Paleta AgroMark
        primary: {
          DEFAULT: '#277D47', // Verde institucional
          50: '#f0f9f4',
          100: '#dcf2e3',
          200: '#bbe5cc',
          300: '#8dd1a8',
          400: '#5ab57d',
          500: '#369b5c',
          600: '#277D47', // Verde institucional
          700: '#1F6239', // Verde mais escuro (hover)
          800: '#1d5030',
          900: '#194228',
        },
        secondary: {
          DEFAULT: '#F2F2F2', // Cinza claro
          50: '#FAFAFA',
          100: '#F2F2F2', // Cinza claro
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        accent: {
          DEFAULT: '#FFD166', // Amarelo terroso
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#FFD166', // Amarelo terroso
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        support: {
          DEFAULT: '#333333', // Grafite
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#333333', // Grafite
          900: '#171717',
        },
        soft: {
          DEFAULT: '#A5C9A1', // Verde claro
          50: '#F3F8F2',
          100: '#E7F1E5',
          200: '#CFE3CB',
          300: '#A5C9A1', // Verde claro
          400: '#85B580',
          500: '#65A160',
          600: '#4F8A4A',
          700: '#3F6F3B',
          800: '#32572F',
          900: '#284625',
        },
        // Cards financeiros
        expense: {
          DEFAULT: '#E76F51', // Contas a pagar
          50: '#FDF4F2',
          100: '#FCE8E3',
          200: '#F8CFC7',
          300: '#F2ADA0',
          400: '#EA8A79',
          500: '#E76F51', // Contas a pagar
          600: '#D85A3F',
          700: '#B8472F',
          800: '#973B28',
          900: '#7C3124',
        },
        income: {
          DEFAULT: '#3A86FF', // Contas a receber
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3A86FF', // Contas a receber
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        }
      },
      fontFamily: {
        sans: ['Poppins', 'Montserrat', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
        body: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      minHeight: {
        '44': '44px', // Tamanho mínimo para botões (acessibilidade)
      },
    },
  },
  plugins: [],
}
