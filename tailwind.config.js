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
        // Identidade SEGUE Imobiliária — paleta oficial da marca
        // (terracota + marrom), fundos de tela/modal permanecem
        // brancos; brand.cream/brand.border cobrem cards, badges,
        // hovers e divisores.
        brand: {
          950: '#180f0a',
          900: '#261912',      // Sidebar / Menu Lateral / textos escuros
          800: '#332218',      // tom intermediário (uso pontual)
          700: '#593825',      // Secundária / Hover
          600: '#7a5138',      // tom claro do marrom (uso pontual)
          accent: '#a64324',      // Destaque / Ação principal (terracota)
          accentDark: '#593825',  // hover de botões/itens em destaque (reaproveita o marrom "hover")
          accentLight: '#c9836a', // tom claro do terracota (avatares, ícones sutis)
          cream: '#f1ede5',       // fundo de cards/badges/hovers
          border: '#bfb8ae'       // bordas e divisores
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
