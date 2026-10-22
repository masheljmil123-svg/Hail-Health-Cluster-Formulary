/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0B2A50',
        primary: {
          DEFAULT: '#145A91',
          deep: '#1A4E86',
        },
        teal: '#087F8C',
        clinical: '#EAF4FC',
        canvas: '#F7FAFD',
        ink: '#16324F',
        muted: '#5E738A',
        line: '#E3EDF5',
      },
      fontFamily: {
        sans: ['Inter', '"Noto Naskh Arabic"', 'Segoe UI', 'Tahoma', 'sans-serif'],
        serif: ['"Source Serif 4"', '"Noto Naskh Arabic"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 10px 30px rgba(16, 55, 96, 0.06)',
        lift: '0 16px 40px rgba(16, 55, 96, 0.10)',
        search: '0 14px 40px rgba(20, 70, 120, 0.12)',
        header: '0 1px 0 rgba(15, 45, 80, 0.06)',
      },
      maxWidth: {
        page: '1200px',
      },
    },
  },
  plugins: [],
};
