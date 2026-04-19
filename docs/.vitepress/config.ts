import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid({
  title: 'Gymi-Vorbereitung Docs',
  description: 'Technical documentation for the content engine',
  lang: 'en',

  // Mermaid requires browser DOM — exclude from SSR to prevent blank pages
  vite: {
    optimizeDeps: {
      include: ['mermaid'],
    },
    ssr: {
      noExternal: ['vitepress-plugin-mermaid', 'mermaid'],
    },
  },

  mermaid: {},

  themeConfig: {
    logo: '📚',

    nav: [
      { text: 'Product', link: '/product/strategy' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Collections', link: '/collections/' },
      { text: 'Lifecycle', link: '/lifecycle' },
      { text: 'Scripts', link: '/scripts/seed' },
      { text: 'Testing', link: '/testing' },
    ],

    sidebar: [
      {
        text: 'Product',
        items: [
          { text: 'Strategy', link: '/product/strategy' },
          { text: 'User Flows & Interaction', link: '/product/user-flows-and-interaction' },
        ],
      },
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Architecture', link: '/guide/architecture' },
        ],
      },
      {
        text: 'Collections',
        items: [
          { text: 'Overview', link: '/collections/' },
          { text: 'Exercises', link: '/collections/exercises' },
          { text: 'Users', link: '/collections/users' },
          { text: 'Prompt Templates', link: '/collections/prompt-templates' },
          { text: 'Audit Log', link: '/collections/audit-log' },
        ],
      },
      {
        text: 'Content Engine',
        items: [
          { text: 'Exercise Lifecycle', link: '/lifecycle' },
        ],
      },
      {
        text: 'Scripts & Testing',
        items: [
          { text: 'Seed Script', link: '/scripts/seed' },
          { text: 'Integration Tests', link: '/testing' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/romank-crisp/gymi-pruf' },
    ],

    footer: {
      message: 'Internal documentation — not for distribution',
    },

    search: {
      provider: 'local',
    },
  },
})
