const DefaultConf = /**/ {
  client: {},
  ssr: {},
  server: {
    'www.giancarlobertini.com': {
      '/': {
        client: null,
        directory: '/home/dd/netlify_giancarlobertini',
        apis: [],
        runtime: 'lampp',
        origins: [],
        disabledRebuild: true,
        proxy: [80, 443],
      },
    },
    'giancarlobertini.com': {
      '/': {
        client: null,
        apis: [],
        runtime: 'lampp',
        origins: [],
        disabledRebuild: true,
        proxy: [80, 443],
        redirect: 'https://www.giancarlobertini.com',
      },
    },
    'www.ayleenbertini.com': {
      '/': {
        client: null,
        directory: '/home/dd/netlify_ayleenbertini',
        apis: [],
        runtime: 'lampp',
        origins: [],
        disabledRebuild: true,
        proxy: [80, 443],
      },
    },
    'ayleenbertini.com': {
      '/': {
        client: null,
        apis: [],
        runtime: 'lampp',
        origins: [],
        disabledRebuild: true,
        proxy: [80, 443],
        redirect: 'https://www.ayleenbertini.com',
      },
    },
  },
  cron: {
    records: {
      A: [
        {
          host: 'env:DDNS_HOST:example.com',
          dns: 'env:DDNS_PROVIDER:dondominio',
          api_key: 'env:DDNS_API_KEY:',
          user: 'env:DDNS_USER:',
        },
      ],
    },
    jobs: {
      dns: { expression: '* * * * *', enabled: true, instances: 1 },
      backups: { expression: '0 1 * * *', enabled: true, instances: 1 },
    },
  },
}; /**/

export { DefaultConf };
