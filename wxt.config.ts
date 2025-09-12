import { defineConfig } from 'wxt';

export default defineConfig({
  outDir: "dist",
  publicDir: 'public',
  webExt: {
    disabled: true,
  },
  manifest: {
    name: 'Gofakeit',
    version: '1.0',
    description: 'Generate fake data for testing and development',
    icons: {
      16: 'images/icon16.png',
      48: 'images/icon48.png',
      128: 'images/icon128.png',
    },
    permissions: ['scripting', 'activeTab', 'contextMenus', 'storage'],
    host_permissions: ['<all_urls>'],
    web_accessible_resources: [
      {
        resources: ['images/full.svg'],
        matches: ['<all_urls>'],
      },
    ],
    commands: {
      'trigger-autofill': {
        suggested_key: {
          default: 'Ctrl+Shift+F',
        },
        description: 'Trigger fake data generation on active tab',
      },
    },
  },
});
