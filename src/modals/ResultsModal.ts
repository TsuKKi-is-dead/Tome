import { App, Modal } from "obsidian";
import { BookRecord } from "../types";

export class ResultsModal extends Modal {
	constructor(
		app: App,
		private results: BookRecord[],
		private onSelect: (book: BookRecord) => void
	) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.addClass("tome-results-modal");
		contentEl.createEl("h2", { text: `${this.results.length} result(s)` });

		if (this.results.length === 0) {
			contentEl.createEl("p", {
				text: "No books found. Try a different search, or check enabled providers in settings.",
			});
			return;
		}

		const list = contentEl.createDiv({ cls: "tome-results-list" });

		for (const book of this.results) {
			const item = list.createDiv({ cls: "tome-result-item" });

			const coverWrap = item.createDiv({ cls: "tome-result-cover" });
			if (book.coverUrl) {
				coverWrap.createEl("img", { attr: { src: book.coverUrl, loading: "lazy" } });
			} else {
				coverWrap.createDiv({ cls: "tome-no-cover", text: "No cover" });
			}

			const info = item.createDiv({ cls: "tome-result-info" });
			info.createEl("div", { cls: "tome-result-title", text: book.title });
			info.createEl("div", {
				cls: "tome-result-authors",
				text: book.authors?.join(", ") || "Unknown author",
			});
			info.createEl("div", {
				cls: "tome-result-meta",
				text: [book.publishedDate, book.publisher, book.pageCount ? `${book.pageCount}p` : null]
					.filter(Boolean)
					.join(" · "),
			});
			info.createEl("div", { cls: "tome-result-source", text: `via ${book.source}` });

			item.addEventListener("click", () => {
				this.close();
				this.onSelect(book);
			});
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}
