/**
 * Mount the archive filter behavior on `/posts` (and the en/ counterpart).
 *
 * The two locale variants previously carried near-identical inline scripts,
 * with the only real differences being four label strings. Keeping the logic
 * here lets each page only declare its labels and call `mountArchiveFilter`,
 * killing the drift risk between the two copies.
 *
 * The script tags that import this helper are client-side `<script>` blocks in
 * `src/pages/posts/index.astro` and `src/pages/en/posts/index.astro`. The
 * helper does nothing on the server because all DOM references live inside the
 * exported function body.
 */

export type ArchiveFilterLabels =
	| {
			format: "ko";
			archive: string; // e.g. "총 %count%개의 글"
			filtered: string; // e.g. "총 %count%개의 글 조건에 맞음"
	  }
	| {
			format: "en";
			archiveSingular: string;
			archivePlural: string;
			filteredSingular: string;
			filteredPlural: string;
	  };

const ACTIVE_TAG_CLASSES = [
	"bg-dawn-800",
	"text-dawn-50",
	"dark:bg-night-50",
	"dark:text-night-900",
];

const INACTIVE_TAG_CLASSES = [
	"bg-dawn-200",
	"text-dawn-700",
	"hover:bg-dawn-300",
	"hover:text-dawn-800",
	"dark:bg-night-900",
	"dark:text-night-200",
	"dark:hover:bg-night-700",
	"dark:hover:text-night-50",
];

function formatCount(
	visibleCount: number,
	hasFilters: boolean,
	labels: ArchiveFilterLabels,
): string {
	if (labels.format === "ko") {
		const template = hasFilters ? labels.filtered : labels.archive;
		return template.replace(/%count%/g, String(visibleCount));
	}

	const isPlural = visibleCount !== 1;
	const template = hasFilters
		? isPlural
			? labels.filteredPlural
			: labels.filteredSingular
		: isPlural
			? labels.archivePlural
			: labels.archiveSingular;
	return template.replace(/%count%/g, String(visibleCount));
}

export function mountArchiveFilter(labels: ArchiveFilterLabels): void {
	const archive = document.querySelector("[data-posts-archive]");
	if (!(archive instanceof HTMLElement)) return;

	const categorySelect = document.querySelector("[data-category-filter]");
	if (!(categorySelect instanceof HTMLSelectElement)) return;

	const tagButtons = Array.from(
		document.querySelectorAll("[data-tag-filter]"),
	).filter((button): button is HTMLButtonElement => button instanceof HTMLButtonElement);
	const items = Array.from(archive.querySelectorAll("[data-post-item]")).filter(
		(item): item is HTMLElement => item instanceof HTMLElement,
	);
	const count = archive.querySelector("[data-results-count]");
	const empty = archive.querySelector("[data-empty-results]");
	const selectedTags = new Set<string>();

	const syncTagButton = (button: HTMLButtonElement): void => {
		const tag = button.dataset.tagFilter ?? "";
		const active = selectedTags.has(tag);

		button.setAttribute("aria-pressed", String(active));
		button.classList.toggle("bg-dawn-800", active);
		button.classList.toggle("text-dawn-50", active);
		button.classList.toggle("dark:bg-night-50", active);
		button.classList.toggle("dark:text-night-900", active);

		ACTIVE_TAG_CLASSES.forEach((className) => {
			if (!active) button.classList.remove(className);
		});

		INACTIVE_TAG_CLASSES.forEach((className) => {
			button.classList.toggle(className, !active);
		});
	};

	const updateCount = (visibleCount: number): void => {
		const hasFilters =
			categorySelect.value.length > 0 || selectedTags.size > 0;
		if (count) {
			count.textContent = formatCount(visibleCount, hasFilters, labels);
		}
		if (empty instanceof HTMLElement) empty.hidden = visibleCount !== 0;
	};

	const applyFilters = (): void => {
		const selectedCategory = categorySelect.value;
		let visibleCount = 0;

		items.forEach((item) => {
			const itemCategory = item.dataset.category ?? "";
			const itemTags = (item.dataset.tags ?? "")
				.split(",")
				.map((tag) => tag.trim())
				.filter(Boolean);

			const matchesCategory =
				selectedCategory === "" || itemCategory === selectedCategory;
			const matchesTags =
				selectedTags.size === 0 ||
				itemTags.some((tag) => selectedTags.has(tag));
			const visible = matchesCategory && matchesTags;

			item.hidden = !visible;
			item.classList.toggle("hidden", !visible);
			if (visible) visibleCount += 1;
		});

		updateCount(visibleCount);
	};

	tagButtons.forEach((button) => {
		syncTagButton(button);
		button.addEventListener("click", () => {
			const tag = button.dataset.tagFilter ?? "";
			if (!tag) return;

			if (selectedTags.has(tag)) {
				selectedTags.delete(tag);
			} else {
				selectedTags.add(tag);
			}

			syncTagButton(button);
			applyFilters();
		});
	});

	categorySelect.addEventListener("change", applyFilters);
	applyFilters();
}
