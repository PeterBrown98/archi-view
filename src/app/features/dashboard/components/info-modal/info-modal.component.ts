import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-info-modal',
  standalone: true,
  imports: [CommonModule, MonacoEditorModule, FormsModule],
  templateUrl: './info-modal.component.html',
  styleUrls: ['./info-modal.component.css']
})
export class InfoModalComponent {
  @Input() data: any; // Dati del nodo + codici sorgenti
  @Output() close = new EventEmitter<void>();

  isExpanded = false;
  activeTab: 'ts' | 'html' = 'ts';
  
  // Opzioni per Monaco Editor
  editorOptions = {
  theme: 'vs-dark',
  language: 'typescript',
  readOnly: true,
  minimap: { enabled: false }, // La minimap in una modale spesso ingombra
  automaticLayout: true,
  scrollBeyondLastLine: false, // Evita lo spazio vuoto infinito in fondo
  fontSize: 14,
  lineNumbers: 'on',
  folding: true, // Permette di chiudere le funzioni/classi
  wordWrap: 'on', // Fondamentale: evita lo scroll orizzontale se il codice è lungo
  symbolSearch: true, // Permette di cercare metodi con Ctrl+Shift+O (se supportato)
};

  toggleExpand() {
  if (!this.isExpanded) {
    this.isExpanded = true;
    // Aspettiamo 350ms (la transizione CSS dura 300ms) prima di mostrare l'editor
  } else {
    this.isExpanded = false;
  }
}

  setTab(tab: 'ts' | 'html') {
    this.activeTab = tab;
    this.editorOptions = { 
      ...this.editorOptions, 
      language: tab === 'ts' ? 'typescript' : 'html' 
    };
  }
}