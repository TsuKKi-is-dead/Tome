import { App, Modal, Setting } from "obsidian";
import { BookRecord, ReadingStatus } from "../types";

const STATUS_OPTIONS: { value: ReadingStatus; label: string }[] = [
	{ value: "want-to-read", label: "Want to read" },
	{ value: "reading", label: "Reading" },
	{ value: "read", label: "Read" },
	{ value: "on-hold", label: "On hold" },
	{ value: "dnf", label: "Did not finish" },
];

export class BookDetailsModal extends Modal {
	constructor(
		app: App,
		private book: BookRecord,
		private defaultStatus: string,
		private onConfirm: (book: BookRecord) => void
	) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: this.book.title });

		let status: ReadingStatus = (this.defaultStatus as ReadingStatus) ?? "want-to-read";
		let rating = 0;
		let progress = 0;

		new Setting(contentEl).setName("Status").addDropdown((dd) => {
			STATUS_OPTIONS.forEach((o) => dd.addOption(o.value, o.label));
			dd.setValue(status);
			dd.onChange((v) => (status = v as ReadingStatus));
		});

		new Setting(contentEl)
			.setName("Rating")
			.setDesc("0-5, half-points allowed. Leave at 0 if you don't want to rate yet.")
			.addSlider((s) =>
				s
					.setLimits(0, 5, 0.5)
					.setValue(0)
					.setDynamicTooltip()
					.onChange((v) => (rating = v))
			);

		new Setting(contentEl)
			.setName("Progress")
			.setDesc("Optional - percent complete.")
			.addSlider((s) =>
				s
					.setLimits(0, 100, 5)
					.setValue(0)
					.setDynamicTooltip()
					.onChange((v) => (progress = v))
			);

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Create note")
				.setCta()
				.onClick(() => {
					this.close();
					this.onConfirm({ ...this.book, status, rating, progress });
				})
		);
	}

	onClose() {
		this.contentEl.empty();
	}
}
