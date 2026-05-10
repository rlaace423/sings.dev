// Mermaid `themeVariables` mappings for the site's dawn (light) and night
// (dark) palettes. Source palette: src/styles/global.css `@theme` block.
// Used by rehype-mermaid in astro.config.ts.

export const mermaidThemeLight = {
	primaryColor: "#e8e3d9",         // dawn-200 — node fill
	primaryBorderColor: "#414868",   // dawn-700 — node frame
	primaryTextColor: "#24283b",     // dawn-800 — node body text
	secondaryColor: "#f5f3ee",       // dawn-100 — subgraph bg = page bg
	secondaryBorderColor: "#dcd6cc", // dawn-300 — subgraph hairline
	tertiaryColor: "#faf8f2",        // dawn-50  — deeper subgraph
	lineColor: "#414868",            // dawn-700 — edges/arrows
	mainBkg: "transparent",
	titleColor: "#24283b",           // dawn-800
	noteBkgColor: "#e8e3d9",         // dawn-200 (sequence/state notes — future-proofing)
	fontFamily: "inherit",
} as const;

export const mermaidThemeDark = {
	primaryColor: "#292e42",         // night-700
	primaryBorderColor: "#737aa2",   // night-300
	primaryTextColor: "#c0caf5",     // night-50
	secondaryColor: "#24283b",       // night-800 — subgraph bg = page bg
	secondaryBorderColor: "#3b4261", // night-600
	tertiaryColor: "#1f2335",        // night-900
	lineColor: "#737aa2",            // night-300
	mainBkg: "transparent",
	titleColor: "#c0caf5",           // night-50
	noteBkgColor: "#292e42",         // night-700
	fontFamily: "inherit",
} as const;
