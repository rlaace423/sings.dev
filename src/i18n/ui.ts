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
		"nav.search": "검색",
		"nav.posts": "포스트",
		"nav.about": "소개",
		"nav.resume": "이력서",
		"nav.language": "언어",
		"nav.theme": "테마",
		"action.allPosts": "모든 글",
		"action.readMore": "더 읽기",
		"search.title": "검색",
		"search.placeholder": "글 제목이나 내용을 검색하세요",
		"search.hint": "Esc 키로 닫기",
		"search.loading": "검색 준비 중...",
		"search.unavailable": "검색 인덱스는 프로덕션 빌드 후 사용할 수 있습니다.",
		"search.close": "검색 닫기",
		"lightbox.label": "확대된 이미지",
		"lightbox.close": "확대 닫기",
	},
	en: {
		"nav.home": "Home",
		"nav.search": "Search",
		"nav.posts": "Posts",
		"nav.about": "About",
		"nav.resume": "Resume",
		"nav.language": "Language",
		"nav.theme": "Theme",
		"action.allPosts": "All posts",
		"action.readMore": "Read more",
		"search.title": "Search",
		"search.placeholder": "Search titles or content",
		"search.hint": "Press Esc to close",
		"search.loading": "Preparing search...",
		"search.unavailable": "The search index is available after a production build.",
		"search.close": "Close search",
		"lightbox.label": "Expanded image",
		"lightbox.close": "Close zoomed image",
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
