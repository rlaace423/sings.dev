// Mermaid `themeVariables` mappings for the site's dawn (light) and night
// (dark) palettes. Source palette: src/styles/global.css `@theme` block.
// Used by rehype-mermaid in astro.config.ts.

export const mermaidThemeLight = {
	primaryColor: "#e8e3d9",         // dawn-200 — primary hue (mermaid uses for headers/legends)
	primaryBorderColor: "#414868",   // dawn-700
	primaryTextColor: "#24283b",     // dawn-800
	nodeBkg: "#e8e3d9",              // dawn-200 — actual node fill (base theme uses this, not primaryColor)
	nodeBorder: "#414868",           // dawn-700 — node frame
	secondaryColor: "#f5f3ee",       // dawn-100 — fallback for non-cluster panels
	secondaryBorderColor: "#dcd6cc", // dawn-300 — fallback hairline
	tertiaryColor: "#faf8f2",        // dawn-50  — deeper nesting
	clusterBkg: "#f5f3ee",           // dawn-100 — subgraph bg = page bg, so nesting reads as grouping
	clusterBorder: "#dcd6cc",        // dawn-300 — subgraph hairline (matches figure img border)
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
	nodeBkg: "#292e42",              // night-700 — actual node fill
	nodeBorder: "#737aa2",           // night-300 — node frame
	secondaryColor: "#24283b",       // night-800 — fallback for non-cluster panels
	secondaryBorderColor: "#3b4261", // night-600 — fallback hairline
	tertiaryColor: "#1f2335",        // night-900
	clusterBkg: "#24283b",           // night-800 — subgraph bg = page bg
	clusterBorder: "#3b4261",        // night-600 — subgraph hairline
	lineColor: "#737aa2",            // night-300
	mainBkg: "transparent",
	titleColor: "#c0caf5",           // night-50
	noteBkgColor: "#292e42",         // night-700
	fontFamily: "inherit",
} as const;
