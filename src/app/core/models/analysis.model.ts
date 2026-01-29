import { ElementDefinition } from "cytoscape";

export interface RouteNode {
  path: string;
  component?: string;
  filePath: string;
  children: RouteNode[];
}

export interface ComponentInfo {
  className: string;
  selector: string;
  templatePath: string;
  tsPath: string;
  tsContent?: string;
  htmlContent?: string;
}

export interface ServiceInfo {
  className: string;
  filePath: string;
}

export interface AnalysisData {
  elements: ElementDefinition[];
  components: Map<string, ComponentInfo>;
  services: Map<string, ServiceInfo>;
  routeTree: RouteNode[];
}

export interface FlatRouteDisplay {
  path: string;
  level: number;
}
