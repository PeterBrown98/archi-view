import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
} from "@angular/core";
import cytoscape, { Core, ElementDefinition } from "cytoscape";

@Component({
  selector: "app-graph-viewer",
  standalone: true,
  template: `<div #cyContainer id="cy"></div>`,
  styles: [
    `
      #cy {
        width: 100%;
        height: 100%;
        display: block;
        background-color: #0f172a; /* Slate 950 - Darker */
        background-image: radial-gradient(#1e293b 1px, transparent 1px);
        background-size: 40px 40px; /* Effetto griglia puntinata */
      }
    `,
  ],
})
export class GraphViewerComponent implements OnChanges {
  @ViewChild("cyContainer") cyContainer!: ElementRef;
  @Input() elements: ElementDefinition[] = [];
  @Input() set searchTerm(value: string) {
    this._searchTerm = value;
    this.applyFilter();
  }
  @Output() nodeSelected = new EventEmitter<any>();
  private cy?: Core;
  private _searchTerm: string = "";

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["elements"] && this.elements.length > 0) {
      this.renderGraph();
    }
  }

  private applyFilter() {
    if (!this.cy) return;
    const term = this._searchTerm.toLowerCase().trim();
    this.cy.batch(() => {
      this.cy!.elements().removeStyle("opacity");
      this.cy!.elements().removeClass("filtered dimmed highlighted");
      if (!term) return;
      this.cy!.elements().addClass("filtered");
      this.cy!.elements().forEach((ele: any) => {
        const label = ele.data("label")?.toLowerCase() || "";
        if (label.includes(term)) {
          ele.removeClass("filtered");
        }
      });
    });
  }

  private renderGraph() {
    this.cy = cytoscape({
      container: this.cyContainer.nativeElement,
      elements: this.elements,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "text-valign": "center",
            "text-halign": "center",
            color: "#cbd5e1",
            "background-color": "#1e293b",
            "border-width": 2,
            "border-color": "#334155",
            shape: "round-rectangle",
            width: "160px",
            height: "45px",
            "font-size": "12px",
            "font-family": "Inter, sans-serif",
            "font-weight": "bold",
            "text-margin-y": 0,
            "transition-property": "background-color, border-color, opacity",
            "transition-duration": 300,
          },
        },
        {
          selector: 'node[type = "Component"]',
          style: { "border-color": "#3b82f6", "background-color": "#0f172a" },
        },
        {
          selector: 'node[type = "Service"]',
          style: {
            shape: "round-diamond",
            "background-color": "#064e3b",
            "border-color": "#10b981",
            width: "140px",
            height: "50px",
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            "line-color": "#475569",
            "target-arrow-color": "#475569",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            "control-point-step-size": 40,
            label: "data(label)",
            "font-size": "10px",
            color: "#94a3b8",
            "text-background-opacity": 0.8,
            "text-background-color": "#0f172a",
            "text-background-padding": "3px",
            "text-rotation": "autorotate",
            "arrow-scale": 1.2,
            ghost: "yes",
            "ghost-offset-y": 1,
            "ghost-opacity": 0.1,
          },
        },
        {
          selector: "node.highlighted",
          style: {
            opacity: 1,
            "border-width": 4,
            "border-color": "#3b82f6",
            "z-index": 999,
          },
        },
        {
          selector: "edge.highlighted",
          style: {
            opacity: 1,
            "line-color": "#3b82f6",
            "target-arrow-color": "#3b82f6",
            width: 3,
            "z-index": 998,
          },
        },

        {
          selector: ".dimmed",
          style: {
            opacity: 0.2,
            "text-opacity": 0,
            events: "no",
          },
        },
        {
          selector: ":selected",
          style: {
            "border-width": 4,
            "border-color": "#f59e0b",
            "background-color": "#451a03",
            "line-color": "#f59e0b",
            "target-arrow-color": "#f59e0b",
            "overlay-color": "#f59e0b",
            "overlay-opacity": 0.2,
          },
        },
        {
          selector: ".nav-edge",
          style: {
            "line-color": "#f43f5e",
            "target-arrow-color": "#f43f5e",
            "line-style": "dashed",
          },
        },
        {
          selector: ".injection-edge",
          style: {
            "line-color": "#10b981",
            "target-arrow-color": "#10b981",
            "line-style": "dotted",
          },
        },
        {
          selector: ".contains-edge",
          style: { "line-color": "#3b82f6", "target-arrow-color": "#3b82f6" },
        },
        { selector: ".filtered", style: { opacity: 0.1 } },
      ],
      layout: {
        name: "concentric",
        concentric: (node: any) => {
          return node.data("type") === "Service" ? 2 : 1;
        },
        levelWidth: () => 1,
        spacingFactor: 1.3,
        nodeDimensionsIncludeLabels: true,
        animate: true,
        animationDuration: 1000,
        fit: true,
        padding: 100,
        sweep: undefined,
        clockwise: true,
        startAngle: (3 / 2) * Math.PI,
      },
    });

    this.cy.on("mouseover", "node", (evt) => {
      const node = evt.target;
      this.cy?.batch(() => {
        this.cy?.elements().addClass("dimmed");

        node.removeClass("dimmed").addClass("highlighted");
        node.outgoers().removeClass("dimmed").addClass("highlighted");
      });
    });

    this.cy.on("mouseout", "node", () => {
      this.cy?.batch(() => {
        this.cy?.elements().removeClass("dimmed highlighted");
      });
    });

    this.cy.on("tap", "node", (evt) => {
      this.nodeSelected.emit({
        data: evt.target.data(),
        position: evt.renderedPosition,
      });
    });

    this.cy.on("mouseover", "node", (evt) => {
      const node = evt.target;
      this.cy?.batch(() => {
        this.cy?.elements().addClass("dimmed");
        node.removeClass("dimmed").addClass("highlighted");
        const realOutgoers = node.outgoers().filter((ele: any) => {
          if (ele.isEdge()) {
            return ele.target().id() !== node.id();
          }
          return ele.id() !== node.id();
        });
        realOutgoers.removeClass("dimmed").addClass("highlighted");
      });
    });
  }
}
