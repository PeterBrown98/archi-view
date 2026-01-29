import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisService } from '../../../../core/services/analysis.service';
import { FlatRouteDisplay } from '../../../../core/models/analysis.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  @Input() stats: any;
  @Input() routeTree: FlatRouteDisplay[] = [];
  @Output() folderSelected = new EventEmitter<FileList>();
  @Output() searchKey = new EventEmitter<string>();
  searchTerm: string = '';
  constructor(private analysisService: AnalysisService) {}

  onFileChange(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.folderSelected.emit(event.target.files);
    }
  }

  onSearch(event: any) {
    this.searchTerm = event.target.value;
    this.searchKey.emit(this.searchTerm);
  }

  clearSearch() {
    this.searchTerm = '';
    this.searchKey.emit('');
  }

  exportReport() {
    const reportContent = this.analysisService.generateReport();
    const blob = new Blob([reportContent], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${new Date().getTime()}.md`;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
