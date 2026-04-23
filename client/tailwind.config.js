/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        // ── Light theme (WhatsApp Web style) ──────────────────────────
        wa: {
          green:     '#25D366',
          teal:      '#128C7E',
          dark:      '#075E54',
          sent:      '#D9FDD3',
          received:  '#FFFFFF',
          bg:        '#EFEAE2',
          panel:     '#F0F2F5',
          hover:     '#F5F6F6',
          border:    '#E9EDEF',
          text:      '#111B21',
          subtext:   '#667781',
          // dark-mode surface variants
          'd-bg':    '#0B141A',
          'd-panel': '#202C33',
          'd-hover': '#2A3942',
          'd-border':'#313D45',
          'd-text':  '#E9EDEF',
          'd-subtext':'#8696A0',
          'd-sent':  '#005C4B',
          'd-received':'#202C33',
        },
      },
      borderWidth: { 3: '3px' },
      boxShadow: {
        'bubble': '0 1px 2px rgba(0,0,0,0.13)',
        'panel':  '0 2px 12px rgba(0,0,0,0.12)',
        'modal':  '0 8px 40px rgba(0,0,0,0.22)',
        'glow':   '0 0 0 3px rgba(37,211,102,0.35)',
      },
      animation: {
        'spin-slow':   'spin 1.6s linear infinite',
        'bounce-dot':  'bounceDot 1.2s ease-in-out infinite',
        'fade-in-up':  'fadeInUp 0.18s ease-out',
        'slide-left':  'slideLeft 0.22s ease-out',
        'pop-in':      'popIn 0.2s cubic-bezier(0.175,0.885,0.32,1.275)',
        'pulse-ring':  'pulseRing 2s ease-out infinite',
        'shimmer':     'shimmer 1.6s linear infinite',
      },
      keyframes: {
        bounceDot: {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%':            { transform: 'translateY(-5px)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideLeft: {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        popIn: {
          from: { opacity: '0', transform: 'scale(0.85)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        pulseRing: {
          '0%':   { transform: 'scale(1)', opacity: '0.8' },
          '70%':  { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      backdropBlur: { xs: '4px' },
    },
  },
  plugins: [],
};
