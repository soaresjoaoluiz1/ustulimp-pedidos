/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Paleta Ustulimp (tirada do logo) — azul-marinho (primário) + ciano (acento) + verde folha */
        navy: {
          DEFAULT: '#024F83',
          50: '#eaf4fa',
          100: '#cce3f1',
          200: '#99c7e3',
          500: '#0282AF',
          600: '#026a99',
          700: '#025b8e',
          800: '#024F83',
          900: '#013150'
        },
        brand: {
          blue: '#0282AF',
          'blue-light': '#01A5C8',
          cyan: '#01BFD7',
          green: '#01B27C'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 3px rgba(2,79,131,.05), 0 6px 20px rgba(2,79,131,.04)',
        'card-hover': '0 4px 12px rgba(2,79,131,.08), 0 12px 32px rgba(2,79,131,.06)'
      }
    }
  },
  plugins: []
}
