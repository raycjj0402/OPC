/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f0ff',
          100: '#e4e4ff',
          200: '#cdccff',
          300: '#aba8ff',
          400: '#8480ff',
          500: '#6055f7',
          600: '#5234ed',
          700: '#4626d9',
          800: '#3a20b5',
          900: '#311d90',
          950: '#1e0f62',
        },
        brand: {
          purple: '#667eea',
          violet: '#764ba2',
        }
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-brand-light': 'linear-gradient(135deg, #a78bfa 0%, #c084fc 100%)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
