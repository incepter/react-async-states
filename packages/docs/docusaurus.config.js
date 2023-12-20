// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'React async states',
  tagline: 'A multi-paradigm state management library for React',
  url: 'https://incepter.github.io',
  baseUrl: '/react-async-states/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'incepter', // Usually your GitHub org/user name.
  projectName: 'react-async-states', // Usually your repo name.

  presets: [
    [
      '@docusaurus/preset-classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/incepter/react-async-states/edit/main/packages/docs',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
        gtag: {
          trackingID: 'G-WT8TFH0HBF',
          anonymizeIP: true,
        },
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      announcementBar: {
        id: 'support_palestine',
        content:
          '<div>Free Palestine <img src="https://flagcdn.com/ps.svg" width="30" alt="Palestine"></div><p>We stand with the People of Palestine! We stand for Justice, Human Rights and Freedom!</p>',
        backgroundColor: '#242526',
        textColor: '#fff',
        isCloseable: false,
      },
      navbar: {
        title: 'react-async-states',
        logo: {
          alt: 'My Site Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'doc',
            docId: 'intro',
            position: 'left',
            label: 'Tutorial',
          },
          {
            href: 'https://github.com/incepter/react-async-states', // go github
            label: 'Github', // change to github
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Tutorial',
                to: '/docs/intro',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              // {
              //   label: 'Stack Overflow',
              //   href: 'https://stackoverflow.com/questions/tagged/react',
              // },
              // {
              //   label: 'Discord',
              //   href: 'https://discordapp.com/invite/docusaurus',
              // },
              // {
              //   label: 'Twitter',
              //   href: 'https://twitter.com/docusaurus',
              // },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Github',
                href: 'https://github.com/incepter/react-async-states',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} react-async-states, Inc. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: ['powershell', 'typescript']
      },
    }),

  themes: ['@docusaurus/theme-live-codeblock'],
};

module.exports = config;
