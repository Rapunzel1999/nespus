import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/e2e', testMatch:'*.spec.mjs', fullyParallel:false, workers:1,
  timeout:30000, expect:{timeout:10000}, retries:0, maxFailures:process.env.CI?3:0,
  outputDir:'outputs/e2e/results', reporter:[['list'],['html',{outputFolder:'outputs/e2e/report',open:'never'}]],
  use:{baseURL:'http://127.0.0.1:4180',trace:'retain-on-failure',screenshot:'only-on-failure',timezoneId:'Europe/Bucharest'},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome']}},{name:'webkit-mobile',use:{...devices['iPhone 13']}}],
  webServer:{command:'node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js dev --config tests/e2e/wrangler.json --local --persist-to .wrangler/e2e --ip 127.0.0.1 --port 4180 --inspector-port 0',url:'http://127.0.0.1:4180/__test/health',reuseExistingServer:false,timeout:60000},
});
