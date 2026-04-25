import { defaultLocale, type Locale } from "../i18n/ui.ts";
import { slugifyTaxonomy } from "../utils/blog.ts";

type ArchiveBrowseConfig = {
	categoryDescriptions: Record<string, string>;
};

const archiveBrowseConfig: Record<Locale, ArchiveBrowseConfig> = {
	ko: {
		categoryDescriptions: {
			development: "구현과 설계의 선택을 차분하게 풀어낸 글입니다.",
			operations: "운영 과정에서 드러나는 시스템의 결을 다룹니다.",
			essay: "기술 작업의 태도와 감각을 짧게 정리한 글입니다.",
		},
	},
	en: {
		categoryDescriptions: {
			development: "Notes on implementation choices and system design.",
			operations: "Writing about the shape of systems in real operation.",
			essay: "Short technical essays about practice, tone, and judgment.",
		},
	},
};

export const getArchiveBrowseConfig = (lang: Locale) =>
	archiveBrowseConfig[lang] ?? archiveBrowseConfig[defaultLocale];

export const getCategoryDescription = (lang: Locale, category: string) =>
	getArchiveBrowseConfig(lang).categoryDescriptions[slugifyTaxonomy(category)] ??
	"";
