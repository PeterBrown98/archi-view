import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisService } from '../../core/services/analysis.service';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { GraphViewerComponent } from './components/graph-viewer/graph-viewer.component';
import { ElementDefinition } from 'cytoscape';
import { InfoModalComponent } from './components/info-modal/info-modal.component';
import { FlatRouteDisplay } from '../../core/models/analysis.model';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent, GraphViewerComponent, InfoModalComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',

})
export class DashboardComponent {
  graphElements: ElementDefinition[] = [];
  analysisStats: any = null;
  selectedNode: any = null;
    currentSearch: string = '';
    currentRoutes: FlatRouteDisplay[] = [];

  constructor(private analysisService: AnalysisService) {}
@ViewChild(SidebarComponent) sidebar!: SidebarComponent;
  /**
   * Riceve i file dalla sidebar e avvia l'analisi tramite il service
   */
  async handleAnalysis(files: FileList) {
    const fileArray = Array.from(files);
    const result = await this.analysisService.performFullAnalysis(fileArray);
    
    this.graphElements = result.elements;
    this.analysisStats = {
      componentsCount: result.components.size,
      servicesCount: result.services.size
    };
    
    // Reset dello stato se viene fatta una nuova analisi
    this.currentRoutes = this.analysisService.getFlattenedRoutes();
    this.selectedNode = null;
  }

  /**
   * Gestisce il click su un nodo del grafo
   */
  onNodeSelected(event: any) {
  if (!event) {
    this.selectedNode = null;
    return;
  }

  const { data, position } = event;
  console.log('Nodo selezionato:', data);

  // Recuperiamo le sorgenti (funzionerà sia per Component che per Service)
  const sources = this.analysisService.getSourceCode(data.id);
  console.log('Sorgenti recuperate:', sources);

  this.selectedNode = {
    data: {
      ...data,
      tsContent: sources.ts,
      htmlContent: sources.html // Sarà stringa vuota per i Service
    },
    position
  };
}
}