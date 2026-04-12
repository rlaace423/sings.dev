export const defaultLocale = "ko";

export const locales = ["ko", "en"] as const;

export type Locale = (typeof locales)[number];

export const labels: Record<Locale, string> = {
	ko: "한국어",
	en: "English",
};

export const ui = {
	ko: {
		"nav.home": "홈",
		"nav.posts": "포스트",
		"nav.about": "소개",
		"nav.resume": "이력서",
		"nav.language": "언어",
		"nav.theme": "테마",
		"action.allPosts": "모든 글",
		"action.readMore": "더 읽기",
	},
	en: {
		"nav.home": "Home",
		"nav.posts": "Posts",
		"nav.about": "About",
		"nav.resume": "Resume",
		"nav.language": "Language",
		"nav.theme": "Theme",
		"action.allPosts": "All posts",
		"action.readMore": "Read more",
	},
} as const;

export type TranslationKey = keyof (typeof ui)[typeof defaultLocale];

export const isLocale = (value: string | undefined): value is Locale =>
	Boolean(value) && locales.includes(value as Locale);

export const getLocaleFromPathname = (pathname: string): Locale => {
	const [, maybeLocale] = pathname.split("/");
	return isLocale(maybeLocale) ? maybeLocale : defaultLocale;
};

export const useTranslations = (locale: string | Locale) => {
	const lang = isLocale(locale) ? locale : defaultLocale;

	return (key: TranslationKey) => ui[lang][key] ?? ui[defaultLocale][key];
};
