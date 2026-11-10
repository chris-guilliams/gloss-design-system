import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/visual',
    snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{projectName}/{arg}{ext}',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
    use: {
        baseURL: 'http://127.0.0.1:8080',
        trace: 'on-first-retry',
        screenshot: {
            animations: 'disabled',
        },
    },
    projects: [
        {
            name: 'desktop',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1200, height: 900 },
            },
        },
        {
            name: 'tablet',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 768, height: 1024 },
            },
        },
        {
            name: 'mobile',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 375, height: 667 },
                isMobile: true,
            },
        },
    ],
    webServer: {
        command: 'node scripts/serve-static.mjs',
        port: 8080,
        reuseExistingServer: !process.env.CI,
        stdout: 'ignore',
        stderr: 'pipe',
    },
});
