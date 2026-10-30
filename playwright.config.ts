import { defineConfig, devices } from "playwright/test";

// Visual regression suite for the built site. See docs/spec-testing.md.
//
// Runs against `dist/` through `tests/visual/serve.mjs`, so `npm run build`
// must happen first. Screenshot baselines are stored per platform (macOS
// locally, Linux in CI) because Chromium rasterizes text differently on
// each; see the "Baselines" section of the spec for how to refresh them.

const PORT = 4173;

export default defineConfig({
	testDir: "tests/visual",
	testMatch: /.*\.spec\.ts$/,
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 2 : undefined,
	reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
	outputDir: "test-results",
	snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{platform}/{arg}{ext}",
	timeout: 30_000,
	expect: {
		timeout: 5_000,
		toHaveScreenshot: {
			animations: "disabled",
			caret: "hide",
			scale: "css",
			maxDiffPixelRatio: 0.001,
		},
		toMatchSnapshot: {
			maxDiffPixelRatio: 0.001,
		},
	},
	use: {
		baseURL: `http://127.0.0.1:${PORT}`,
		colorScheme: "light",
		trace: "retain-on-failure",
	},
	webServer: {
		command: `node tests/visual/serve.mjs ${PORT}`,
		url: `http://127.0.0.1:${PORT}/`,
		reuseExistingServer: !process.env.CI,
		timeout: 15_000,
	},
	projects: [
		{
			// Build-artifact checks that need no browser (OG PNGs). Baselines are
			// platform-independent, so no {platform} segment in their path.
			name: "artifacts",
			testMatch: /og-images\.spec\.ts$/,
			snapshotPathTemplate: "{testDir}/__screenshots__/artifacts/{arg}{ext}",
		},
		{
			name: "desktop",
			testIgnore: /og-images\.spec\.ts$/,
			use: {
				...devices["Desktop Chrome"],
				viewport: { width: 1280, height: 900 },
			},
		},
		{
			// A narrow Android-class viewport. `isMobile` (from the device
			// preset) makes Chromium honour the viewport meta tag the way
			// Chrome Android does, which is what the overflow checks rely on.
			name: "mobile",
			testIgnore: /og-images\.spec\.ts$/,
			use: {
				...devices["Pixel 7"],
				viewport: { width: 360, height: 740 },
				deviceScaleFactor: 1,
			},
		},
	],
});
