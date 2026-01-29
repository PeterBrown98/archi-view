import { Component, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MonacoEditorModule } from "ngx-monaco-editor-v2";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-info-modal",
  standalone: true,
  imports: [CommonModule, MonacoEditorModule, FormsModule],
  templateUrl: "./info-modal.component.html",
  styleUrls: ["./info-modal.component.css"],
})
export class InfoModalComponent {
  @Input() data: any;
  @Output() close = new EventEmitter<void>();
  isExpanded = false;
  activeTab: "ts" | "html" = "ts";
  editorOptions = {
    theme: "vs-dark",
    language: "typescript",
    readOnly: true,
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineNumbers: "on",
    folding: true,
    wordWrap: "on",
    symbolSearch: true,
  };

  toggleExpand() {
    if (!this.isExpanded) {
      this.isExpanded = true;
    } else {
      this.isExpanded = false;
    }
  }

  setTab(tab: "ts" | "html") {
    this.activeTab = tab;
    this.editorOptions = {
      ...this.editorOptions,
      language: tab === "ts" ? "typescript" : "html",
    };
  }
}
