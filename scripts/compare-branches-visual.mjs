import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const tempHarnessDir = path.join('/tmp', 'gloss-visual-harness-temp');

function run(command, options = {}) {
    console.log(`\n> ${command}`);
    return execSync(command, { stdio: 'inherit', cwd: rootDir, ...options });
}

function getGitOutput(command) {
    return execSync(command, { encoding: 'utf8', cwd: rootDir }).trim();
}

function isGitRef(ref) {
    if (!ref) {
        return false;
    }
    try {
        execSync(`git rev-parse --verify --quiet "${ref}"`, {
            stdio: 'ignore',
            cwd: rootDir,
        });
        return true;
    } catch {
        return false;
    }
}

const startingBranch = getGitOutput('git rev-parse --abbrev-ref HEAD');

// Parse CLI arguments
// Usage:
//   node scripts/compare-branches-visual.mjs [base-branch] [target-branch] [fixture-filter]
//   node scripts/compare-branches-visual.mjs [base-branch] [fixture-filter]
const arg1 = process.argv[2];
const arg2 = process.argv[3];
const arg3 = process.argv[4];

let baseBranch = 'main';
let targetBranch = startingBranch;
let fixtureFilter = '';

if (isGitRef(arg1) && isGitRef(arg2)) {
    baseBranch = arg1;
    targetBranch = arg2;
    fixtureFilter = arg3 || process.env.VISUAL_TEST || '';
} else if (isGitRef(arg1)) {
    baseBranch = arg1;
    targetBranch = startingBranch;
    fixtureFilter = arg2 || process.env.VISUAL_TEST || '';
} else if (arg1) {
    baseBranch = 'main';
    targetBranch = startingBranch;
    fixtureFilter = arg1 || process.env.VISUAL_TEST || '';
}

if (baseBranch === targetBranch) {
    console.error(
        `\n[Error] Cannot compare branch "${baseBranch}" against itself.\nPlease specify different branches to compare:`,
    );
    console.error(`  npm run test:visual:diff -- <base-branch> <target-branch> [fixture-filter]\n`);
    process.exit(1);
}

console.log(`=======================================================`);
console.log(` Visual Diff Workflow`);
console.log(` Base (Reference):   ${baseBranch}`);
console.log(` Target (Comparison): ${targetBranch}`);
if (fixtureFilter) {
    console.log(` Fixture Filter:      "${fixtureFilter}"`);
}
console.log(` Workspace Branch:    ${startingBranch} (will return here)`);
console.log(`=======================================================`);

// Check for uncommitted working tree changes on the starting branch
const status = getGitOutput('git status --porcelain');
let didStash = false;
let testFailed = false;

// Backup test harness files to temp so they persist across branch switches
fs.rmSync(tempHarnessDir, { recursive: true, force: true });
fs.mkdirSync(tempHarnessDir, { recursive: true });

const harnessFiles = [
    'playwright.config.mjs',
    'scripts/serve-static.mjs',
    'scripts/compare-branches-visual.mjs',
    'tests/visual/visual.spec.mjs',
];

for (const file of harnessFiles) {
    const src = path.join(rootDir, file);
    if (fs.existsSync(src)) {
        const dest = path.join(tempHarnessDir, file);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
    }
}

function restoreHarnessFiles() {
    for (const file of harnessFiles) {
        const dest = path.join(rootDir, file);
        const src = path.join(tempHarnessDir, file);
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.copyFileSync(src, dest);
        }
    }
}

function cleanupTempHarnessFiles(branch) {
    if (branch === startingBranch) {
        return;
    }
    for (const file of harnessFiles) {
        const filePath = path.join(rootDir, file);
        if (fs.existsSync(filePath)) {
            try {
                fs.rmSync(filePath, { force: true, recursive: true });
            } catch {
                // Ignore cleanup errors
            }
        }
    }
}

try {
    if (status.length > 0) {
        console.log(`\nStashing tracked working tree changes on ${startingBranch}...`);
        run('git stash push -m "temp-visual-compare-auto-stash"');
        didStash = true;
    }

    // 1. Checkout Base Branch and Capture Baselines
    console.log(`\n--> [1/4] Checking out base branch: ${baseBranch}`);
    run(`git checkout -f ${baseBranch}`);
    restoreHarnessFiles();

    console.log(`\n--> [2/4] Building CSS and capturing baseline snapshots on ${baseBranch}...`);
    run('npm run build:css');

    const envPrefix = fixtureFilter ? `VISUAL_TEST=${fixtureFilter} ` : '';
    try {
        run(`${envPrefix}npx playwright test -u`);
    } catch {
        console.log(
            `\n[Notice] Some baseline snapshots had dynamic frame differences. Proceeding with comparison...`,
        );
    }

    // 2. Checkout Target Branch and Run Comparison
    console.log(`\n--> [3/4] Checking out target branch: ${targetBranch}`);
    cleanupTempHarnessFiles(baseBranch);
    run(`git checkout -f ${targetBranch}`);
    restoreHarnessFiles();

    console.log(`\n--> [4/4] Building CSS and running visual diff on ${targetBranch}...`);
    run('npm run build:css');

    try {
        run(`${envPrefix}npx playwright test`);
    } catch {
        testFailed = true;
    }

    cleanupTempHarnessFiles(targetBranch);
} catch (error) {
    console.error(`\n[Error during visual comparison]`, error);
    testFailed = true;
} finally {
    // Safety cleanup: always return to starting branch
    const finalBranch = getGitOutput('git rev-parse --abbrev-ref HEAD');
    if (finalBranch !== startingBranch) {
        console.log(`\n--> Returning to starting branch: ${startingBranch}...`);
        cleanupTempHarnessFiles(finalBranch);
        run(`git checkout -f ${startingBranch}`);
        restoreHarnessFiles();
    }
    if (didStash) {
        try {
            console.log(`Restoring stashed changes on ${startingBranch}...`);
            run('git stash pop');
        } catch {
            // Ignore if pop failed
        }
    }
    fs.rmSync(tempHarnessDir, { recursive: true, force: true });
}

if (testFailed) {
    console.log(`\n=======================================================`);
    console.log(` ❌ Visual differences detected between ${baseBranch} and ${targetBranch}!`);
    console.log(` View side-by-side differences in browser by running:`);
    console.log(`   npx playwright show-report`);
    console.log(`=======================================================\n`);
    process.exit(1);
} else {
    console.log(`\n=======================================================`);
    console.log(
        ` ✅ All visual snapshots match! (Zero regressions between ${baseBranch} and ${targetBranch})`,
    );
    console.log(`=======================================================\n`);
}
