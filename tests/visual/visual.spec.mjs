import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const testsDir = path.resolve(process.cwd(), 'tests');

// Read all HTML test fixtures from /tests (excluding index.html)
const allTestFiles = fs
    .readdirSync(testsDir)
    .filter((file) => file.endsWith('.html') && file !== 'index.html')
    .sort();

// Optional filter via environment variable (e.g. VISUAL_TEST=body)
const filter = process.env.VISUAL_TEST;
const filesToTest = filter ? allTestFiles.filter((f) => f.includes(filter)) : allTestFiles;

for (const file of filesToTest) {
    const testName = path.basename(file, '.html');

    test(`Fixture: ${testName}`, async ({ page }) => {
        await page.goto(`/tests/${file}`);

        // Wait for Sofia Pro and other web fonts to finish rendering
        await page.evaluate(() => document.fonts.ready);

        // Capture full page screenshot and compare against baseline
        await expect(page).toHaveScreenshot(`${testName}.png`, {
            fullPage: true,
            maxDiffPixels: 50,
        });
    });
}
