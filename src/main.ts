import { Plugin, Notice, normalizePath, TFile } from "obsidian";
import { DEFAULT_SETTINGS, TomeSettings, TomeSettingTab } from "./settings";
import { ProviderManager } from "./api/providerManager";
import { SearchModal } from "./modals/SearchModal";
import { ResultsModal } from "./modals/ResultsModal";
import { BookDetailsModal } from "./modals/BookDetailsModal";
import { GalleryView, TOME_GALLERY_VIEW } from "./views/GalleryView";
import { downloadCover } from "./cache/imageCache";
import { renderTemplate, renderFileName } from "./templateEngine";
import { BookRecord } from "./types";

export default class TomePlugin extends Plugin {
	settings!: TomeSettings;
	providerManager!: ProviderManager;

	async onload() {
		await this.loadSettings();
		this.providerManager = new ProviderManager(this.settings);

		this.registerView(TOME_GALLERY_VIEW, (leaf) => new GalleryView(leaf, this));

		this.addCommand({
			id: "add-book",
			name: "Add a book",
			callback: () => this.startSearchFlow(),
		});

		this.addCommand({
			id: "open-gallery",
			name: "Open library gallery",
			callback: () => this.activateGalleryView(),
		});

		this.addRibbonIcon("book-open", "Tome: Add a book", () => this.startSearchFlow());

		this.addSettingTab(new TomeSettingTab(this.app, this));
	}

	onunload() {
		this.providerManager?.clearCache();
	}

	async loadSettings() {
		const loaded = (await this.loadData()) as Partial<TomeSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded ?? {});
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Provider manager holds a reference to settings, but rebuild in case
		// provider order/enabled state changed, invalidating any stale cache.
		this.providerManager?.clearCache();
	}

	private startSearchFlow() {
    new SearchModal(this.app, (query) => {
        void this.runSearch(query);
    }).open();
}

private async runSearch(query: string) {
    const notice = new Notice("Tome: searching...", 0);
    try {
        const results = await this.providerManager.search(query);
        notice.hide();
        new ResultsModal(this.app, results, (book) => this.confirmDetails(book)).open();
    } catch (e) {
        notice.hide();
        console.error("Tome search failed", e);
        new Notice("Tome: search failed. Check your network settings / console for details.");
    }
}

	private confirmDetails(book: BookRecord) {
    new BookDetailsModal(this.app, book, this.settings.defaultStatus, (finalBook) => {
        void this.createBookNote(finalBook);
    }).open();
}

	private async createBookNote(book: BookRecord) {
		const notice = new Notice("Tome: creating note...", 0);
		try {
			let coverPath = "";
			if (book.coverUrl && this.settings.cacheCoversLocally) {
				const baseName = book.isbn13 ?? book.isbn10 ?? book.title;
				const localPath = await downloadCover(
					this.app,
					book.coverUrl,
					this.settings.coversFolder,
					baseName
				);
				if (localPath) coverPath = localPath;
			} else if (book.coverUrl) {
				coverPath = book.coverUrl;
			}

			const ctx = { ...book, coverPath, dateAdded: new Date().toISOString().slice(0, 10) };
			const fileName = renderFileName(this.settings.fileNameTemplate, ctx);
			const body = renderTemplate(this.settings.noteTemplate, ctx);

			await this.ensureFolder(this.settings.notesFolder);
			const path = normalizePath(`${this.settings.notesFolder}/${fileName}.md`);

			if (this.app.vault.getAbstractFileByPath(path)) {
				notice.hide();
				new Notice(`Tome: "${fileName}" already exists.`);
				return;
			}

			const file = await this.app.vault.create(path, body);
			notice.hide();
			new Notice(`Tome: added "${book.title}".`);

			if (this.settings.openAfterCreate) {
				await this.app.workspace.getLeaf(false).openFile(file);
			}
		} catch (e) {
			notice.hide();
			console.error("Tome: failed to create note", e);
			new Notice("Tome: failed to create note. See console for details.");
		}
	}

	private async ensureFolder(folder: string) {
		const normalized = normalizePath(folder);
		if (!this.app.vault.getAbstractFileByPath(normalized)) {
			await this.app.vault.createFolder(normalized).catch(() => {});
		}
	}

async activateGalleryView() {
    const { workspace } = this.app;
    const existing = workspace.getLeavesOfType(TOME_GALLERY_VIEW);
    if (existing.length > 0) {
        await workspace.revealLeaf(existing[0]);
        return;
    }
    const leaf = workspace.getLeaf("tab");
    await leaf.setViewState({ type: TOME_GALLERY_VIEW, active: true });
    await workspace.revealLeaf(leaf);
}

	/** Updates a single frontmatter field on a book note - used by inline gallery edits. */
	async updateFrontmatterField(file: TFile, field: string, value: string | number) {
    await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
        fm[field] = value;
    });
}
}