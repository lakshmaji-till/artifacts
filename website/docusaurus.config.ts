import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const baseUrl = '/artifacts/';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'POS Desktop',
  tagline: 'Download the POS Desktop installer for your environment.',
  favicon: 'img/favicon.ico',

  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  url: 'https://lakshmaji-till.github.io',
  baseUrl,

  organizationName: 'lakshmaji-till',
  projectName: 'artifacts',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // Inter is the Oolio brand typeface (design.oolio.dev/typography).
  headTags: [
    {
      tagName: 'link',
      attributes: {rel: 'preconnect', href: 'https://fonts.googleapis.com'},
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossorigin: 'anonymous',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      },
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: false,
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      logo: {
        alt: 'POS Desktop',
        src: 'img/logo.png',
      },
      items: [
        {
          to: '/',
          label: 'POS Desktop',
          position: 'left',
          // Without this the item is active on every page: Docusaurus marks a
          // link active when the path starts with its target, and '/' resolves
          // to the base URL, which prefixes the whole site.
          activeBaseRegex: `^${baseUrl}?$`,
        },
        {
          to: '/downloads',
          label: 'Download',
          position: 'right',
          className: 'navbar-sponsor',
        },
        {
          href: 'https://github.com/lakshmaji-till/artifacts',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
