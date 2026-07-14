import { App, Modal, Setting, Notice } from "obsidian";

export class SearchModal extends Modal {
	private query = "";
	private onSubmit: (query: string) => void;

	constructor(app: App, onSubmit: (query: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: "Add a book" });
		contentEl.createEl("p", {
			text: "Enter an ISBN (10 or 13 digit) or a title / author search.",
			cls: "setting-item-description",
		});

		let inputEl: HTMLInputElement;

		new Setting(contentEl).setName("Search").addText((text) => {
			inputEl = text.inputEl;
			text.setPlaceholder("e.g. 9780593135204 or Project Hail Mary").onChange((v) => {
				this.query = v;
			});
			text.inputEl.addEventListener("keydown", (e) => {
				if (e.key === "Enter") this.submit();
			});
		});

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Search")
				.setCta()
				.onClick(() => this.submit())
		);

		window.setTimeout(() => inputEl?.focus(), 20);
	}

	private submit() {
		if (!this.query.trim()) {
			new Notice("Type an ISBN or title first.");
			return;
		}
		this.close();
		this.onSubmit(this.query.trim());
	}

	onClose() {
		this.contentEl.empty();
	}
}
