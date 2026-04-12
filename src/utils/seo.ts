import { defaultLocale, locales, type Locale } from "../i18n/ui.ts";

const normalizePathname = (pathname: string) => {
	if (!pathname) return "/";
	return pathname.startsWith("/") ? pathname : `/${pathname}`;
};

const stripLocalePrefix = (pathname: string) => {
	const normalized = normalizePathname(pathname);

	for (const locale of locales) {
		if (normalized === `/${locale}` || normalized === `/${locale}/`) {
			return "/";
		}

		if (normalized.startsWith(`/${locale}/`)) {
			return normalized.slice(locale.length + 1);
		}
	}

	return normalized;
};

const getLocalizedPathname = (pathname: string, locale: Locale) => {
	const basePath = stripLocalePrefix(pathname);

	if (locale === defaultLocale) return basePath;
	if (basePath === "/") return `/${locale}/`;

	return `/${locale}${basePath}`;
};

export const getLocalizedSeoUrls = (site: string | URL, pathname: string) => ({
	canonical: new URL(normalizePathname(pathname), site).toString(),
	alternates: Object.fromEntries(
		locales.map((locale) => [locale, new URL(getLocalizedPathname(pathname, locale), site).toString()]),
	) as Record<Locale, string>,
});
