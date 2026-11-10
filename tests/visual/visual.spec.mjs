import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const testsDir = path.resolve(process.cwd(), 'tests');

// Dynamic demos (video streams, iframes, scroll animations) that fluctuate on full-page capture
const EXCLUDED_FIXTURES = new Set(['cover', 'scrollspy', 'sticky-parallax', 'video']);

// Read all HTML test fixtures from /tests (excluding index.html and excluded demos)
const allTestFiles = fs
    .readdirSync(testsDir)
    .filter((file) => {
        if (!file.endsWith('.html') || file === 'index.html') {
            return false;
        }
        const name = path.basename(file, '.html');
        return !EXCLUDED_FIXTURES.has(name);
    })
    .sort();

// Optional filter via environment variable (e.g. VISUAL_TEST=body)
const filter = process.env.VISUAL_TEST;
const filesToTest = filter ? allTestFiles.filter((f) => f.includes(filter)) : allTestFiles;

for (const file of filesToTest) {
    const testName = path.basename(file, '.html');

    test(`Fixture: ${testName}`, async ({ page }) => {
        // Freeze virtual clock for time-dependent fixtures (e.g., countdown timer)
        if (testName === 'countdown') {
            await page.clock.setFixedTime(new Date('2026-01-01T12:00:00Z'));
        }

        await page.goto(`/tests/${file}`);

        // Wait for web fonts (Sofia Pro) and network assets to finish loading
        await page.evaluate(() => document.fonts.ready);
        try {
            await page.waitForLoadState('networkidle', { timeout: 3000 });
        } catch {
            // Proceed if network idle times out on external assets
        }

        // Neutralize parallax scroll transformations to prevent frame drift during full-page stitching
        await page.addStyleTag({
            content: `
                [uk-slider-parallax], [gls-slider-parallax],
                [uk-parallax], [gls-parallax],
                [uk-scrollspy], [gls-scrollspy] {
                    transform: none !important;
                    animation: none !important;
                    transition: none !important;
                }
            `,
        });

        // Pause any video elements and reset frame to 0
        await page.evaluate(() => {
            document.querySelectorAll('video').forEach((v) => {
                try {
                    v.pause();
                    v.currentTime = 0;
                } catch {
                    // Ignore video errors in headless
                }
            });
        });

        // Mask elements with dynamic calculations (videos and parallax slider demo)
        const mask = [];
        const videoCount = await page.locator('video').count();
        if (videoCount > 0) {
            mask.push(page.locator('video'));
        }

        const parallaxSliders = page.locator(
            '[gls-slider]:has([gls-slider-parallax]), [uk-slider]:has([uk-slider-parallax])',
        );
        if ((await parallaxSliders.count()) > 0) {
            mask.push(parallaxSliders);
        }

        // Capture full page screenshot and compare against baseline
        await expect(page).toHaveScreenshot(`${testName}.png`, {
            fullPage: true,
            maxDiffPixels: 50,
            mask,
        });
    });
}
