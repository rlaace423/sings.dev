/**
 * OG card layout for sings.dev.
 *
 * Returns a Satori-compatible element tree (no JSX/React — just plain objects
 * shaped like React elements). Satori only supports flexbox, so the layout is
 * intentionally a single flex column with no absolute positioning.
 *
 * Palette mirrors the site's dark theme so the card reads as the same brand
 * across slack/x/discord/etc:
 *   bg     #24283b   (night-800)
 *   accent #e0af68   (Tokyo Night yellow, matches SiteBrand "$" + ".dev")
 *   text   #c0caf5   (night-50)
 *   muted  #737aa2   (night-300)
 */

type SatoriNode = {
	type: string;
	props: {
		style?: Record<string, unknown>;
		children?: SatoriNode | SatoriNode[] | string | number;
		[key: string]: unknown;
	};
};

const el = (
	type: string,
	style: Record<string, unknown>,
	children?: SatoriNode | SatoriNode[] | string,
): SatoriNode => ({
	type,
	props: { style, children },
});

export type OGCardInput = {
	title: string;
	category: string;
	date: string; // pre-formatted YYYY-MM-DD
	lang: "ko" | "en";
};

const COLORS = {
	bg: "#24283b",
	accent: "#e0af68",
	text: "#c0caf5",
	muted: "#737aa2",
} as const;

/**
 * Naive title size selector. Satori auto-wraps long titles, but very long
 * titles can still overflow the card. Shrink the font for long ones to keep
 * the card balanced.
 */
const titleFontSize = (title: string) => {
	const len = title.length;
	if (len <= 28) return 72;
	if (len <= 48) return 60;
	if (len <= 72) return 52;
	return 44;
};

export function buildOGCard({ title, category, date, lang }: OGCardInput): SatoriNode {
	return el(
		"div",
		{
			width: 1200,
			height: 630,
			display: "flex",
			flexDirection: "column",
			justifyContent: "space-between",
			background: COLORS.bg,
			padding: "72px 80px",
			fontFamily: "Pretendard",
			color: COLORS.text,
		},
		[
			// Top: category chip ("$ category"). Monospace family with
			// Pretendard fallback so Hangul (e.g., "블로그") still renders.
			el(
				"div",
				{
					display: "flex",
					alignItems: "center",
					fontSize: 32,
					color: COLORS.accent,
					letterSpacing: "0.02em",
					fontFamily: "JetBrains Mono, Pretendard",
				},
				[
					el("span", { marginRight: 16, fontWeight: 700 }, "$"),
					el("span", { fontWeight: 500 }, category),
				],
			),

			// Middle: title (grows to fill remaining vertical space).
			// `display: -webkit-box` + line-clamp is the only way Satori
			// truncates overflowing text — it doesn't honor a `display: flex`
			// here, and overlong titles would otherwise push the footer off
			// the card.
			el(
				"div",
				{
					display: "-webkit-box",
					fontSize: titleFontSize(title),
					fontWeight: 700,
					lineHeight: 1.2,
					letterSpacing: "-0.02em",
					color: COLORS.text,
					// @ts-expect-error — Satori-specific webkit props.
					"-webkit-box-orient": "vertical",
					"-webkit-line-clamp": 3,
					overflow: "hidden",
				},
				title,
			),

			// Bottom: brand mark + date. Monospace ties this row to the
			// `$ _` terminal motif and gives the date tabular figures.
			el(
				"div",
				{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					fontSize: 26,
					fontFamily: "JetBrains Mono, Pretendard",
				},
				[
					el(
						"div",
						{
							display: "flex",
							alignItems: "baseline",
							color: COLORS.text,
						},
						[
							el("span", { color: COLORS.accent, marginRight: 12, fontWeight: 700 }, "$"),
							el("span", { fontWeight: 500 }, "sings"),
							el("span", { color: COLORS.accent, fontWeight: 500 }, ".dev"),
						],
					),
					el(
						"div",
						{ color: COLORS.muted, fontWeight: 400 },
						date,
					),
				],
			),
		],
	);
}
