import { ItemView, WorkspaceLeaf, TFile } from "obsidian";
import type TomePlugin from "../main";

export const TOME_GALLERY_VIEW = "tome-gallery-view";

interface GalleryEntry {
	file: TFile;
	title: string;
	author: string;
	cover?: string;
	status?: string;
	rating?: number;
}

export class GalleryView extends ItemView {
	constructor(leaf: WorkspaceLeaf, private plugin: TomePlugin) {
		super(leaf);
	}

	getViewType() {
		return TOME_GALLERY_VIEW;
	}
	getDisplayText() {
		return "Tome library";
	}
	getIcon() {
		return "book-open";
	}

	async onOpen() {
		await this.render();
	}

	async render() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass("tome-gallery-container");

		const header = container.createDiv({ cls: "tome-gallery-header" });
		header.createEl("h2", { text: "Tome library" });
		const refreshBtn = header.createEl("button", { text: "Refresh" });
		refreshBtn.addEventListener("click", () => this.render());

		const entries = this.collectBooks();

		if (entries.length === 0) {
			container.createEl("p", {
				text: "No books yet. Run 'Tome: Add a book' from the command palette.",
			});
			return;
		}

		const grid = container.createDiv({ cls: "tome-gallery-grid" });

		for (const entry of entries) {
			const card = grid.createDiv({ cls: "tome-card" });

			const coverEl = card.createDiv({ cls: "tome-card-cover" });
			if (entry.cover) {
				const resourcePath = this.app.vault.adapter.getResourcePath(entry.cover);
				coverEl.createEl("img", { attr: { src: resourcePath } });
			} else {
				coverEl.createDiv({ cls: "tome-no-cover", text: entry.title.slice(0, 1) });
			}

			card.createEl("div", { cls: "tome-card-title", text: entry.title });
			card.createEl("div", { cls: "tome-card-author", text: entry.author });

			const statusEl = card.createEl("select", { cls: "tome-card-status" });
			["want-to-read", "reading", "read", "on-hold", "dnf"].forEach((s) => {
				const opt = statusEl.createEl("option", { text: s, value: s });
				if (s === entry.status) opt.selected = true;
			});
			statusEl.addEventListener("change", async () => {
				await this.plugin.updateFrontmatterField(entry.file, "status", statusEl.value);
			});

			const ratingEl = card.createDiv({ cls: "tome-card-rating" });
			for (let i = 1; i <= 5; i++) {
				const star = ratingEl.createSpan({
					text: (entry.rating ?? 0) >= i ? "★" : "☆",
					cls: "tome-star",
				});
				star.addEventListener("click", async () => {
					await this.plugin.updateFrontmatterField(entry.file, "rating", i);
					this.render();
				});
			}

			card.addEventListener("dblclick", () => {
				this.app.workspace.getLeaf(false).openFile(entry.file);
			});
		}
	}

	private collectBooks(): GalleryEntry[] {
		const files = this.app.vault.getMarkdownFiles();
		const entries: GalleryEntry[] = [];

		for (const file of files) {
			const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
			if (!fm) continue;
			const tags = fm.tags;
			const isBook = Array.isArray(tags) ? tags.includes("book") : tags === "book";
			if (!isBook) continue;

			let cover: string | undefined;
			const coverField: string | undefined = fm.cover;
			if (coverField) {
				const match = coverField.match(/\[\[(.+?)(\|.*)?\]\]/);
				const path = match ? match[1] : coverField;
				const abstractFile = this.app.metadataCache.getFirstLinkpathDest(path, file.path);
				if (abstractFile) cover = abstractFile.path;
			}

			entries.push({
				file,
				title: fm.title ?? file.basename,
				author: Array.isArray(fm.author) ? fm.author.join(", ") : fm.author ?? "",
				cover,
				status: fm.status,
				rating: fm.rating,
			});
		}

		return entries.sort((a, b) => a.title.localeCompare(b.title));
	}
}
