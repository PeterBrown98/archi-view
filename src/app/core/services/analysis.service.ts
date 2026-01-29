import { Injectable } from "@angular/core";
import * as ts from "typescript";
import { ElementDefinition } from "cytoscape";
import {
  RouteNode,
  ComponentInfo,
  ServiceInfo,
  AnalysisData,
  FlatRouteDisplay,
} from "../models/analysis.model";

@Injectable({
  providedIn: "root",
})
export class AnalysisService {
  private fileContents = new Map<string, string>();
  private componentsMap = new Map<string, ComponentInfo>();
  private servicesMap = new Map<string, ServiceInfo>();
  private routeTree: RouteNode[] = [];

  constructor() {}

  async performFullAnalysis(files: File[]): Promise<AnalysisData> {
    this.resetData();
    for (const file of files.filter(
      (f) => f.name.endsWith(".ts") || f.name.endsWith(".html"),
    )) {
      const path = file.webkitRelativePath;
      this.fileContents.set(path, await file.text());
    }
    this.mapMetadata();
    const entryPath = Array.from(this.fileContents.keys()).find((p) =>
      p.endsWith("app.routes.ts"),
    );
    if (entryPath) {
      this.routeTree = this.analyzeFileRecursive(entryPath);
    }
    const elements = this.generateGraphElements();

    return {
      elements,
      components: this.componentsMap,
      services: this.servicesMap,
      routeTree: this.routeTree,
    };
  }

  private resetData() {
    this.fileContents.clear();
    this.componentsMap.clear();
    this.servicesMap.clear();
    this.routeTree = [];
  }

  private mapMetadata() {
    this.fileContents.forEach((content, path) => {
      if (!path.endsWith(".ts")) return;
      const classMatch = content.match(/class\s+([a-zA-Z0-9_]+)/);
      if (!classMatch) return;
      const className = classMatch[1];
      if (/@Component\s*\(/g.test(content)) {
        const selectorMatch = content.match(/selector:\s*['"]([^'"]+)['"]/);
        this.componentsMap.set(className, {
          className,
          selector: selectorMatch ? selectorMatch[1] : "",
          templatePath: path.replace(".ts", ".html"),
          tsPath: path,
        });
      } else if (/@Injectable\s*\(/g.test(content)) {
        this.servicesMap.set(className, {
          className,
          filePath: path,
        });
      }
    });
  }

  private generateGraphElements(): ElementDefinition[] {
    const elements: ElementDefinition[] = [];
    const addedEdges = new Set<string>();
    const addedNodes = new Set<string>();
    this.componentsMap.forEach((info, name) => {
      elements.push({
        data: {
          id: name,
          label: name,
          type: "Component",
          filePath: info.tsPath,
          selector: info.selector,
        },
      });
      addedNodes.add(name);
    });
    this.servicesMap.forEach((info, name) => {
      elements.push({
        data: {
          id: name,
          label: name,
          type: "Service",
          filePath: info.filePath,
        },
      });
      addedNodes.add(name);
    });
    this.componentsMap.forEach((info, compName) => {
      const tsContent = this.fileContents.get(info.tsPath) || "";
      this.servicesMap.forEach((servInfo, servName) => {
        if (new RegExp(`[:\\s]${servName}[\\s,)]`, "g").test(tsContent)) {
          this.addEdge(
            elements,
            compName,
            servName,
            "@injection",
            "injection-edge",
            addedEdges,
          );
        }
      });
    });
    this.servicesMap.forEach((info, serviceName) => {
      const tsContent = this.fileContents.get(info.filePath) || "";
      this.servicesMap.forEach((otherServInfo, otherServName) => {
        if (serviceName === otherServName) return;
        if (new RegExp(`[:\\s]${otherServName}[\\s,)]`, "g").test(tsContent)) {
          this.addEdge(
            elements,
            serviceName,
            otherServName,
            "@injection",
            "injection-edge",
            addedEdges,
          );
        }
      });
    });
    const processRoute = (
      node: RouteNode,
      lastComp?: string,
      parentPath: string = "",
    ) => {
      const currentPath = `${parentPath}/${node.path}`.replace(/\/+/g, "/");
      if (node.component && lastComp && node.component !== lastComp) {
        if (addedNodes.has(lastComp) && addedNodes.has(node.component)) {
          this.addEdge(
            elements,
            lastComp,
            node.component,
            `route ${currentPath}`,
            "nav-edge",
            addedEdges,
          );
        }
      }
      const nextParent = node.component || lastComp;
      node.children.forEach((c) => processRoute(c, nextParent, currentPath));
    };
    this.routeTree.forEach((n) => processRoute(n));
    this.componentsMap.forEach((info, className) => {
      const htmlContent = this.fileContents.get(info.templatePath) || "";
      const tsContent = this.fileContents.get(info.tsPath) || "";
      const combined = htmlContent + tsContent;
      this.componentsMap.forEach((other, otherName) => {
        if (className === otherName) return;
        if (new RegExp(`<${other.selector}[\\s/>]`, "i").test(combined)) {
          this.addEdge(
            elements,
            className,
            otherName,
            "contains",
            "contains-edge",
            addedEdges,
          );
        }
      });
      this.parseNavigations(
        className,
        combined,
        tsContent,
        elements,
        addedEdges,
      );
    });
    return elements;
  }

  private addEdge(
    elements: any[],
    source: string,
    target: string,
    label: string,
    cssClass: string,
    edges: Set<string>,
  ) {
    const id = `${cssClass}-${source}-${target}-${label}`;
    if (!edges.has(id)) {
      elements.push({
        data: {
          id,
          source,
          target,
          label,
          type:
            cssClass === "nav-edge"
              ? "Navigation"
              : cssClass === "injection-edge"
                ? "Injection"
                : "Containment",
        },
        classes: cssClass,
      });
      edges.add(id);
    }
  }

  private parseNavigations(
    className: string,
    combinedContent: string,
    tsContent: string,
    elements: any[],
    addedEdges: Set<string>,
  ) {
    const routerLinkAnchor = /routerLink\]?\s*=\s*/gi;
    let match;
    while ((match = routerLinkAnchor.exec(combinedContent)) !== null) {
      const startValueIdx = match.index + match[0].length;
      const quoteChar = combinedContent[startValueIdx];
      if (quoteChar !== '"' && quoteChar !== "'") continue;
      const endValueIdx = combinedContent.indexOf(quoteChar, startValueIdx + 1);
      if (endValueIdx === -1) continue;
      const rawValue = combinedContent.substring(
        startValueIdx + 1,
        endValueIdx,
      );

      let segments: string[] = [];
      if (rawValue.trim().startsWith("[")) {
        const internalQuotesPattern = /['"]([^'"]+)['"]/g;
        let internalMatch;
        while (
          (internalMatch = internalQuotesPattern.exec(rawValue)) !== null
        ) {
          segments.push(internalMatch[1]);
        }
      } else {
        segments = rawValue.split("/").filter((s) => s.trim() !== "");
      }

      const cleanSegments = segments
        .map((s) => s.replace(/^\//, "").trim())
        .filter((s) => s !== "" && !s.includes(".") && !s.includes("("));
      const target = this.matchRouteRecursive(this.routeTree, cleanSegments);
      if (target) {
        this.addEdge(
          elements,
          className,
          target,
          `route /${cleanSegments.join("/")}`,
          "nav-edge",
          addedEdges,
        );
      }
    }

    const tsNavPattern =
      /navigate(?:ByUrl)?\s*\(\s*(\[[\s\S]*?\]|['"][\s\S]*?['"])/g;
    let tsMatch;
    while ((tsMatch = tsNavPattern.exec(tsContent)) !== null) {
      const rawTsValue = tsMatch[1];
      let tsSegments: string[] = [];

      if (rawTsValue.startsWith("[")) {
        const parts = rawTsValue.replace(/[\[\]]/g, "").split(",");
        parts.forEach((part) => {
          const trimmed = part.trim();
          if (trimmed.startsWith("'") || trimmed.startsWith('"')) {
            const val = trimmed.replace(/['"]/g, "");
            tsSegments.push(...val.split("/").filter((s) => s !== ""));
          } else if (trimmed !== "") {
            tsSegments.push(":dynamic");
          }
        });
      } else {
        tsSegments = rawTsValue
          .replace(/['"]/g, "")
          .split("/")
          .filter((s) => s.trim() !== "");
      }

      const cleanTsSegments = tsSegments
        .map((s) => s.trim())
        .filter((s) => s !== "" && !s.includes(".") && !s.includes("("));
      const tsTarget = this.matchRouteRecursive(
        this.routeTree,
        cleanTsSegments,
      );
      if (tsTarget) {
        const pathLabel = `route /${cleanTsSegments.join("/").replace(":dynamic", ":param")}`;
        this.addEdge(
          elements,
          className,
          tsTarget,
          pathLabel,
          "nav-edge",
          addedEdges,
        );
      }
    }
  }

  private analyzeFileRecursive(filePath: string): RouteNode[] {
    const content = this.fileContents.get(filePath);
    if (!content) return [];
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
    );
    const routeArray = this.findRouteArray(sourceFile);
    return routeArray ? this.parseRouteArray(routeArray, filePath) : [];
  }

  private parseRouteArray(
    arrayNode: ts.ArrayLiteralExpression,
    filePath: string,
  ): RouteNode[] {
    const nodes: RouteNode[] = [];
    arrayNode.elements.forEach((element) => {
      if (ts.isObjectLiteralExpression(element)) {
        const props = element.properties;
        const pathProp = props.find(
          (p) => p.name?.getText() === "path",
        ) as ts.PropertyAssignment;
        if (pathProp) {
          const rawPath = pathProp.initializer.getText().replace(/['"]/g, "");
          const pathSegments = rawPath.split("/").filter((s) => s !== "");

          if (pathSegments.length > 1) {
            let currentChildren = nodes;
            pathSegments.forEach((segment, idx) => {
              const isLast = idx === pathSegments.length - 1;
              let existing = currentChildren.find((n) => n.path === segment);
              if (!existing) {
                existing = { path: segment, filePath, children: [] };
                currentChildren.push(existing);
              }
              if (isLast) this.fillRouteData(existing, props, filePath);
              currentChildren = existing.children;
            });
          } else {
            const node: RouteNode = { path: rawPath, filePath, children: [] };
            this.fillRouteData(node, props, filePath);
            nodes.push(node);
          }
        }
      }
    });
    return nodes;
  }

  private fillRouteData(
    node: RouteNode,
    props: ts.NodeArray<ts.ObjectLiteralElementLike>,
    filePath: string,
  ) {
    const compProp = props.find(
      (p) => p.name?.getText() === "component",
    ) as ts.PropertyAssignment;
    const loadCompProp = props.find(
      (p) => p.name?.getText() === "loadComponent",
    ) as ts.PropertyAssignment;
    if (compProp) node.component = compProp.initializer.getText();
    else if (loadCompProp) {
      const match = loadCompProp.initializer
        .getText()
        .match(/import\(['"](.*?)['"]\)/);
      if (match) {
        const target = this.resolveRelativePath(filePath, match[1]);
        node.component = this.getComponentNameFromFile(target);
      }
    }
    const childrenProp = props.find(
      (p) => p.name?.getText() === "children",
    ) as ts.PropertyAssignment;
    if (childrenProp && ts.isArrayLiteralExpression(childrenProp.initializer)) {
      node.children = this.parseRouteArray(childrenProp.initializer, filePath);
    }
    const loadChildrenProp = props.find(
      (p) => p.name?.getText() === "loadChildren",
    ) as ts.PropertyAssignment;
    if (loadChildrenProp) {
      const importMatch = loadChildrenProp.initializer
        .getText()
        .match(/import\(['"](.*?)['"]\)/);
      if (importMatch) {
        const target = this.resolveRelativePath(filePath, importMatch[1]);
        node.children = this.analyzeFileRecursive(target);
      }
    }
  }

  private getComponentNameFromFile(filePath: string): string {
    const content = this.fileContents.get(filePath);
    if (!content) return "Component";
    const match = content.match(/class\s+([a-zA-Z0-9_]+)/);
    return match ? match[1] : "Component";
  }

  private findRouteArray(node: ts.Node): ts.ArrayLiteralExpression | undefined {
    if (ts.isArrayLiteralExpression(node)) return node;
    return ts.forEachChild(node, (n) => this.findRouteArray(n));
  }

  private resolveRelativePath(
    currentFile: string,
    relativeImport: string,
  ): string {
    const lastSlashIndex = currentFile.lastIndexOf("/");
    const currentDir =
      lastSlashIndex !== -1 ? currentFile.substring(0, lastSlashIndex) : "";
    const parts = currentDir.split("/").filter((p) => p !== "");
    const relParts = relativeImport.split("/").filter((p) => p !== "");
    for (const part of relParts) {
      if (part === ".") continue;
      if (part === "..") parts.pop();
      else parts.push(part);
    }
    const targetBase = parts.join("/");
    return (
      Array.from(this.fileContents.keys()).find(
        (k) =>
          k.startsWith(targetBase) &&
          (k.endsWith(".ts") || k.endsWith(".routes.ts")),
      ) || ""
    );
  }

  private matchRouteRecursive(
    routes: RouteNode[],
    segments: string[],
    depth: number = 0,
  ): string | undefined {
    if (segments.length === 0) {
      for (const route of routes) {
        if (route.component) return route.component;
        const res = this.matchRouteRecursive(route.children, []);
        if (res) return res;
      }
      return undefined;
    }
    for (const route of routes) {
      const routeSegments = route.path.split("/").filter((s) => s !== "");
      if (routeSegments.length === 0) {
        const wrapperRes = this.matchRouteRecursive(
          route.children,
          segments,
          depth + 1,
        );
        if (wrapperRes) return wrapperRes;
        continue;
      }
      if (segments.length >= routeSegments.length) {
        let isMatch = true;
        for (let i = 0; i < routeSegments.length; i++) {
          const rSeg = routeSegments[i];
          const nSeg = segments[i];
          const segmentMatch =
            rSeg === nSeg || rSeg.startsWith(":") || nSeg === ":dynamic";
          if (!segmentMatch) {
            isMatch = false;
            break;
          }
        }
        if (isMatch) {
          const remainingSegments = segments.slice(routeSegments.length);
          if (remainingSegments.length === 0) {
            if (route.component) return route.component;
            const defaultChild = this.matchRouteRecursive(route.children, []);
            if (defaultChild) return defaultChild;
          }
          const childRes = this.matchRouteRecursive(
            route.children,
            remainingSegments,
            depth + 1,
          );
          if (childRes) return childRes;
        }
      }
    }
    return undefined;
  }

  getSourceCode(className: string): { ts: string; html: string } {
    const compInfo = this.componentsMap.get(className);
    if (compInfo) {
      return {
        ts:
          this.fileContents.get(compInfo.tsPath) || "// Codice TS non trovato",
        html: this.fileContents.get(compInfo.templatePath) || "",
      };
    }
    const servInfo = this.servicesMap.get(className);
    if (servInfo) {
      return {
        ts:
          this.fileContents.get(servInfo.filePath) ||
          "// Codice Service non trovato",
        html: "",
      };
    }
    return { ts: "", html: "" };
  }

  generateReport(): string {
    let report = `# Architecture Report - ${new Date().toLocaleDateString()}\n\n`;
    report += `## Summary\n`;
    report += `- Components: ${this.componentsMap.size}\n`;
    report += `- Services: ${this.servicesMap.size}\n\n`;
    report += `## Components List\n`;
    this.componentsMap.forEach((comp) => {
      report += `### ${comp.className}\n`;
      report += `- Selector: \`${comp.selector}\`\n`;
      report += `- Path: \`${comp.tsPath}\`\n\n`;
    });
    report += `## Services List\n`;
    this.servicesMap.forEach((serv) => {
      report += `### ${serv.className}\n`;
      report += `- Path: \`${serv.filePath}\`\n\n`;
    });
    return report;
  }

  getFlattenedRoutes(): FlatRouteDisplay[] {
    const flattened: FlatRouteDisplay[] = [];
    const traverse = (node: RouteNode, level: number) => {
      flattened.push({
        path: node.path === "" ? "/" : node.path,
        level: level,
      });
      if (node.children && node.children.length > 0) {
        node.children.forEach((child) => traverse(child, level + 1));
      }
    };
    this.routeTree.forEach((rootNode) => traverse(rootNode, 0));
    return flattened;
  }
}
