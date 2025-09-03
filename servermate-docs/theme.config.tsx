import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span>ServerMate Docs</span>,
  project: {
    link: 'https://github.com/your-org/servermate',
  },
  docsRepositoryBase: 'https://github.com/your-org/servermate/blob/main/docs',
  footer: {
    text: 'ServerMate Documentation',
  },
  useNextSeoProps() {
    return {
      titleTemplate: '%s – ServerMate'
    }
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="ServerMate" />
      <meta property="og:description" content="Discord server management made easy" />
    </>
  ),
  banner: {
    key: 'beta',
    text: (
      <a href="https://app.servermate.gg" target="_blank">
        🎉 ServerMate is in beta – Try it now →
      </a>
    )
  }
}

export default config
