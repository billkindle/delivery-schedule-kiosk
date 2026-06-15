/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Event card accent colors kept in safelist since they're assembled dynamically
  safelist: [
    'border-cs-blue', 'border-cs-green', 'border-cs-orange',
  ],
  theme: {
    extend: {
      colors: {
        cs: {
          // Backgrounds
          dark:     '#16232B', // neutral-015 — page bg
          card:     '#222E36', // neutral-014 — card/header bg
          raised:   '#303B42', // neutral-013 — elevated surfaces
          border:   '#404B51', // neutral-012
          // Text
          muted:    '#81888D', // neutral-007
          subtle:   '#656E73', // neutral-009
          // Brand blues
          blue:     '#0363C9', // blue-005 primary
          sky:      '#117EE2', // blue-004
          navy:     '#012D5A', // blue-009
          // Brand greens
          green:    '#79B701', // green-005 primary
          lime:     '#86CB01', // green-004
          // Brand orange (innovation accent)
          orange:   '#F75805', // orange-005
          ember:    '#E15005', // orange-006
          // Supporting blue
          cobalt:   '#0359B5', // blue-006
        },
      },
      fontFamily: {
        sans: [
          '"SF Pro Display"', '"SF Pro Text"',
          '-apple-system', 'BlinkMacSystemFont',
          '"Inter"', '"Segoe UI"', 'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
