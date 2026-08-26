/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        // Cores oficiais de status das vistorias
        status: {
          agendada: '#2196F3',   // Azul - Vistoria Agendada
          aceita: '#FFC107',     // Amarelo - Aceita pelo vistoriador
          finalizada: '#4CAF50', // Verde - Finalizada
          cancelada: '#F44336'   // Vermelho - Deletada/Cancelada
        },
        // Identidade SEGUE Imobiliária
        brand: {
          950: '#0B1120',
          900: '#0F172A',
          800: '#151F32',
          700: '#1E293B',
          600: '#334155',
          accent: '#4F46E5',
          accentDark: '#4338CA',
          accentLight: '#818CF8'
        }
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15, 23, 42, 0.06), 0 1px 3px 0 rgba(15, 23, 42, 0.08)',
        modal: '0 20px 40px -8px rgba(15, 23, 42, 0.35)'
      },
      borderRadius: {
        xl2: '1rem'
      }
    }
  },
  plugins: []
}
