// import { Component } from '@angular/core';
// import * as ts from 'typescript';
// import cytoscape from 'cytoscape';

// interface RouteNode {
//   path: string;
//   component?: string;
//   filePath: string;
//   children: RouteNode[];
// }

// interface ComponentInfo {
//   className: string;
//   selector: string;
//   templatePath: string;
//   tsPath: string;
// }

// interface ServiceInfo {
//   className: string;
//   filePath: string;
// }

// @Component({
//   selector: 'app-root',
//   standalone: true,
//   templateUrl: './app.component.html',
//   styleUrl: './app.component.css',
// })
// export class AppComponent {
//   fileList: File[] = [];
//   fileContents = new Map<string, string>();
//   routeTree: RouteNode[] = [];
//   componentsMap = new Map<string, ComponentInfo>();
//   cy: any;
//   // Per gestire il popup informativo
//   selectedElement: any = null;
//   popupPosition = { x: 0, y: 0 };
//   servicesMap = new Map<string, ServiceInfo>();

//   handleFolderSelection(event: any) {
//     const files = event.target.files;
//     if (files) {
//       this.fileList = Array.from(files);
//       this.fileContents.clear();
//       this.componentsMap.clear();
//       this.servicesMap.clear();
//     }
//   }

//   async startAnalysis() {
//     for (const file of this.fileList.filter(
//       (f) => f.name.endsWith('.ts') || f.name.endsWith('.html'),
//     )) {
//       const path = file.webkitRelativePath;
//       this.fileContents.set(path, await file.text());
//     }

//     this.mapOnlyComponents();

//     const entryPath = Array.from(this.fileContents.keys()).find((p) =>
//       p.endsWith('app.routes.ts'),
//     );
//     if (entryPath) {
//       this.routeTree = this.analyzeFileRecursive(entryPath);
//       console.log('ALBERO ROTTE COSTRUITO:', this.routeTree);
//       this.initGraph();
//     }
//   }

//   private mapOnlyComponents() {
//     this.fileContents.forEach((content, path) => {
//       if (path.endsWith('.ts')) {
//         const classMatch = content.match(/class\s+([a-zA-Z0-9_]+)/);
//         if (!classMatch) return;

//         // Logica Componenti (esistente)
//         if (/@Component\s*\(/g.test(content)) {
//           const selectorMatch = content.match(/selector:\s*['"]([^'"]+)['"]/);
//           this.componentsMap.set(classMatch[1], {
//             className: classMatch[1],
//             selector: selectorMatch ? selectorMatch[1] : '',
//             templatePath: path.replace('.ts', '.html'),
//             tsPath: path,
//           });
//         }
//         // Logica Servizi
//         else if (/@Injectable\s*\(/g.test(content)) {
//           this.servicesMap.set(classMatch[1], {
//             className: classMatch[1],
//             filePath: path,
//           });
//         }
//       }
//     });
//   }

//   private initGraph() {
//     const elements: any[] = [];
//     const addedEdges = new Set<string>();
//     const addedNodes = new Set<string>();

//     // 1. Aggiunta Nodi Componenti
//     this.componentsMap.forEach((info, className) => {
//       elements.push({
//         data: {
//           id: className,
//           label: className,
//           type: 'Component',
//           filePath: info.tsPath,
//           selector: info.selector,
//         },
//       });
//       addedNodes.add(className);
//     });

//     // 2. Aggiunta Nodi Servizi
//     this.servicesMap.forEach((info, className) => {
//       elements.push({
//         data: {
//           id: className,
//           label: className,
//           type: 'Service',
//           filePath: info.filePath,
//         },
//       });
//       addedNodes.add(className);
//     });

//     // 3. Archi Injection: Componenti -> Servizi
//     this.componentsMap.forEach((info, compName) => {
//       const tsContent = this.fileContents.get(info.tsPath) || '';
//       this.servicesMap.forEach((servInfo, servName) => {
//         const injectionRegex = new RegExp(`[:\\s]${servName}[\\s,)]`, 'g');
//         if (injectionRegex.test(tsContent)) {
//           this.addEdge(elements, compName, servName, '@injection', 'injection-edge', addedEdges);
//         }
//       });
//     });

//     // 4. NUOVA AGGIUNTA: Archi Injection: Servizi -> Servizi
//     this.servicesMap.forEach((info, serviceName) => {
//       const tsContent = this.fileContents.get(info.filePath) || '';
//       this.servicesMap.forEach((otherServInfo, otherServName) => {
//         if (serviceName === otherServName) return;
//         const injectionRegex = new RegExp(`[:\\s]${otherServName}[\\s,)]`, 'g');
//         if (injectionRegex.test(tsContent)) {
//           this.addEdge(elements, serviceName, otherServName, '@injection', 'injection-edge', addedEdges);
//         }
//       });
//     });

//     // 5. GESTIONE ROTTE
//     const processRoute = (node: RouteNode, lastComp?: string, parentPath: string = '') => {
//       const currentPath = `${parentPath}/${node.path}`.replace(/\/+/g, '/');
//       if (node.component && lastComp && node.component !== lastComp) {
//         if (addedNodes.has(lastComp) && addedNodes.has(node.component)) {
//           this.addEdge(elements, lastComp, node.component, `route ${currentPath}`, 'nav-edge', addedEdges);
//         }
//       }
//       const nextParent = node.component || lastComp;
//       node.children.forEach((c) => processRoute(c, nextParent, currentPath));
//     };
//     this.routeTree.forEach((n) => processRoute(n));

//     // 6. RELAZIONI DI UTILIZZO E NAVIGAZIONE (HTML/TS)
//     this.componentsMap.forEach((info, className) => {
//       const htmlContent = this.fileContents.get(info.templatePath) || '';
//       const tsContent = this.fileContents.get(info.tsPath) || '';
//       const combinedContent = htmlContent + tsContent;

//       this.componentsMap.forEach((otherInfo, otherClassName) => {
//         if (className === otherClassName) return;
//         const tagRegex = new RegExp(`<${otherInfo.selector}[\\s/>]`, 'i');
//         if (tagRegex.test(combinedContent)) {
//           this.addEdge(elements, className, otherClassName, 'contains', 'contains-edge', addedEdges);
//         }
//       });

//       // RouterLink
//       const routerLinkAnchor = /routerLink\]?\s*=\s*/gi;
//       let match;
//       while ((match = routerLinkAnchor.exec(combinedContent)) !== null) {
//         const startValueIdx = match.index + match[0].length;
//         const quoteChar = combinedContent[startValueIdx];
//         if (quoteChar !== '"' && quoteChar !== "'") continue;
//         const endValueIdx = combinedContent.indexOf(quoteChar, startValueIdx + 1);
//         if (endValueIdx === -1) continue;
//         const rawValue = combinedContent.substring(startValueIdx + 1, endValueIdx);
//         let segments: string[] = [];
//         if (rawValue.trim().startsWith('[')) {
//           const internalQuotesPattern = /['"]([^'"]+)['"]/g;
//           let internalMatch;
//           while ((internalMatch = internalQuotesPattern.exec(rawValue)) !== null) {
//             segments.push(internalMatch[1]);
//           }
//         } else {
//           segments = rawValue.split('/').filter((s) => s.trim() !== '');
//         }
//         const cleanSegments = segments.map((s) => s.replace(/^\//, '').trim()).filter((s) => s !== '' && !s.includes('.') && !s.includes('('));
//         const target = this.matchRouteRecursive(this.routeTree, cleanSegments);
//         if (target) {
//           this.addEdge(elements, className, target, `route /${cleanSegments.join('/')}`, 'nav-edge', addedEdges);
//         }
//       }

//       // Router Navigate
//       const tsNavPattern = /navigate(?:ByUrl)?\s*\(\s*(\[[\s\S]*?\]|['"][\s\S]*?['"])/g;
//       let tsMatch;
//       while ((tsMatch = tsNavPattern.exec(tsContent)) !== null) {
//         const rawTsValue = tsMatch[1];
//         let tsSegments: string[] = [];
//         if (rawTsValue.startsWith('[')) {
//           const parts = rawTsValue.replace(/[\[\]]/g, '').split(',');
//           parts.forEach((part) => {
//             const trimmed = part.trim();
//             if (trimmed.startsWith("'") || trimmed.startsWith('"')) {
//               const val = trimmed.replace(/['"]/g, '');
//               tsSegments.push(...val.split('/').filter((s) => s !== ''));
//             } else if (trimmed !== '') {
//               tsSegments.push(':dynamic');
//             }
//           });
//         } else {
//           tsSegments = rawTsValue.replace(/['"]/g, '').split('/').filter((s) => s.trim() !== '');
//         }
//         const cleanTsSegments = tsSegments.map((s) => s.trim()).filter((s) => s !== '' && !s.includes('.') && !s.includes('('));
//         const tsTarget = this.matchRouteRecursive(this.routeTree, cleanTsSegments);
//         if (tsTarget) {
//           const pathLabel = `route /${cleanTsSegments.join('/').replace(':dynamic', ':param')}`;
//           this.addEdge(elements, className, tsTarget, pathLabel, 'nav-edge', addedEdges);
//         }
//       }
//     });

//     this.renderCytoscape(elements);
//   }

//   private addEdge(elements: any[], source: string, target: string, label: string, cssClass: string, edges: Set<string>) {
//     const id = `${cssClass}-${source}-${target}-${label}`;
//     if (!edges.has(id)) {
//       elements.push({
//         data: {
//           id,
//           source,
//           target,
//           label,
//           type: cssClass === 'nav-edge' ? 'Navigation' : cssClass === 'injection-edge' ? 'Injection' : 'Containment',
//         },
//         classes: cssClass,
//       });
//       edges.add(id);
//     }
//   }

//   private matchRouteRecursive(routes: RouteNode[], segments: string[], depth: number = 0): string | undefined {
//     if (segments.length === 0) {
//       for (const route of routes) {
//         if (route.component) return route.component;
//         const res = this.matchRouteRecursive(route.children, []);
//         if (res) return res;
//       }
//       return undefined;
//     }
//     for (const route of routes) {
//       const routeSegments = route.path.split('/').filter((s) => s !== '');
//       if (routeSegments.length === 0) {
//         const wrapperRes = this.matchRouteRecursive(route.children, segments, depth + 1);
//         if (wrapperRes) return wrapperRes;
//         continue;
//       }
//       if (segments.length >= routeSegments.length) {
//         let isMatch = true;
//         for (let i = 0; i < routeSegments.length; i++) {
//           const rSeg = routeSegments[i];
//           const nSeg = segments[i];
//           const segmentMatch = rSeg === nSeg || rSeg.startsWith(':') || nSeg === ':dynamic';
//           if (!segmentMatch) {
//             isMatch = false;
//             break;
//           }
//         }
//         if (isMatch) {
//           const remainingSegments = segments.slice(routeSegments.length);
//           if (remainingSegments.length === 0) {
//             if (route.component) return route.component;
//             const defaultChild = this.matchRouteRecursive(route.children, []);
//             if (defaultChild) return defaultChild;
//           }
//           const childRes = this.matchRouteRecursive(route.children, remainingSegments, depth + 1);
//           if (childRes) return childRes;
//         }
//       }
//     }
//     return undefined;
//   }

//   private renderCytoscape(elements: any[]) {
//     this.cy = cytoscape({
//       container: document.getElementById('cy'),
//       elements: elements,
//       style: [
//         { selector: 'node', style: { label: 'data(label)', 'text-valign': 'center', color: '#fff', 'background-color': '#3498db', shape: 'round-rectangle', width: '180px', height: '45px', 'font-size': '11px' } },
//         { selector: 'edge', style: { width: 2, 'line-color': '#bdc3c7', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#bdc3c7', 'curve-style': 'bezier', label: 'data(label)', 'font-size': '9px', 'text-background-opacity': 1, 'text-background-color': '#ffffff', 'text-rotation': 'autorotate' } },
//         { selector: '.nav-edge', style: { 'line-color': '#27ae60', 'line-style': 'dashed' } },
//         { selector: '.contains-edge', style: { 'line-color': '#8e44ad' } },
//         { selector: ':selected', style: { 'background-color': '#e74c3c', 'line-color': '#e74c3c', 'target-arrow-color': '#e74c3c' } },
//         { selector: 'node[type = "Service"]', style: { shape: 'diamond', 'background-color': '#e67e22', width: '150px', height: '60px' } },
//         { selector: '.injection-edge', style: { 'line-color': '#e67e22', 'target-arrow-color': '#e67e22', 'line-style': 'dotted' } },
//       ],
//       layout: { name: 'cose', nodeRepulsion: () => 6000000, idealEdgeLength: () => 200, edgeElasticity: () => 100, nestingFactor: 5, gravity: 0.2, padding: 50, refresh: 20, fit: true },
//     });

//     this.cy.on('tap', (evt: any) => {
//       if (evt.target === this.cy) {
//         this.selectedElement = null;
//       } else {
//         const position = evt.renderedPosition;
//         this.popupPosition = { x: position.x, y: position.y };
//         this.selectedElement = evt.target.data();
//       }
//     });
//   }

//   private analyzeFileRecursive(filePath: string): RouteNode[] {
//     const content = this.fileContents.get(filePath);
//     if (!content) return [];
//     const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
//     const routeArray = this.findRouteArray(sourceFile);
//     return routeArray ? this.parseRouteArray(routeArray, filePath) : [];
//   }

//   private parseRouteArray(arrayNode: ts.ArrayLiteralExpression, filePath: string): RouteNode[] {
//     const nodes: RouteNode[] = [];
//     arrayNode.elements.forEach((element) => {
//       if (ts.isObjectLiteralExpression(element)) {
//         const props = element.properties;
//         const pathProp = props.find((p) => p.name?.getText() === 'path') as ts.PropertyAssignment;
//         if (pathProp) {
//           const rawPath = pathProp.initializer.getText().replace(/['"]/g, '');
//           const pathSegments = rawPath.split('/').filter((s) => s !== '');
//           if (pathSegments.length > 1) {
//             let currentChildren = nodes;
//             pathSegments.forEach((segment, idx) => {
//               const isLast = idx === pathSegments.length - 1;
//               let existing = currentChildren.find((n) => n.path === segment);
//               if (!existing) {
//                 existing = { path: segment, filePath, children: [] };
//                 currentChildren.push(existing);
//               }
//               if (isLast) this.fillRouteData(existing, props, filePath);
//               currentChildren = existing.children;
//             });
//           } else {
//             const node: RouteNode = { path: rawPath, filePath, children: [] };
//             this.fillRouteData(node, props, filePath);
//             nodes.push(node);
//           }
//         }
//       }
//     });
//     return nodes;
//   }

//   private fillRouteData(node: RouteNode, props: ts.NodeArray<ts.ObjectLiteralElementLike>, filePath: string) {
//     const compProp = props.find((p) => p.name?.getText() === 'component') as ts.PropertyAssignment;
//     const loadCompProp = props.find((p) => p.name?.getText() === 'loadComponent') as ts.PropertyAssignment;
//     if (compProp) node.component = compProp.initializer.getText();
//     else if (loadCompProp) {
//       const match = loadCompProp.initializer.getText().match(/import\(['"](.*?)['"]\)/);
//       if (match) {
//         const target = this.resolveRelativePath(filePath, match[1]);
//         node.component = this.getComponentNameFromFile(target);
//       }
//     }
//     const childrenProp = props.find((p) => p.name?.getText() === 'children') as ts.PropertyAssignment;
//     if (childrenProp && ts.isArrayLiteralExpression(childrenProp.initializer)) {
//       node.children = this.parseRouteArray(childrenProp.initializer, filePath);
//     }
//     const loadChildrenProp = props.find((p) => p.name?.getText() === 'loadChildren') as ts.PropertyAssignment;
//     if (loadChildrenProp) {
//       const importMatch = loadChildrenProp.initializer.getText().match(/import\(['"](.*?)['"]\)/);
//       if (importMatch) {
//         const target = this.resolveRelativePath(filePath, importMatch[1]);
//         node.children = this.analyzeFileRecursive(target);
//       }
//     }
//   }

//   private getComponentNameFromFile(filePath: string): string {
//     const content = this.fileContents.get(filePath);
//     if (!content) return 'Component';
//     const match = content.match(/class\s+([a-zA-Z0-9_]+)/);
//     return match ? match[1] : 'Component';
//   }

//   private findRouteArray(node: ts.Node): ts.ArrayLiteralExpression | undefined {
//     if (ts.isArrayLiteralExpression(node)) return node;
//     return ts.forEachChild(node, (n) => this.findRouteArray(n));
//   }

//   private resolveRelativePath(currentFile: string, relativeImport: string): string {
//     const lastSlashIndex = currentFile.lastIndexOf('/');
//     const currentDir = lastSlashIndex !== -1 ? currentFile.substring(0, lastSlashIndex) : '';
//     const parts = currentDir.split('/').filter((p) => p !== '');
//     const relParts = relativeImport.split('/').filter((p) => p !== '');
//     for (const part of relParts) {
//       if (part === '.') continue;
//       if (part === '..') parts.pop();
//       else parts.push(part);
//     }
//     const targetBase = parts.join('/');
//     return Array.from(this.fileContents.keys()).find((k) => k.startsWith(targetBase) && (k.endsWith('.ts') || k.endsWith('.routes.ts'))) || '';
//   }
// }


import { Component } from '@angular/core';
import { DashboardComponent } from './features/dashboard/dashboard.component';

// app.component.ts
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DashboardComponent], // <-- Importa qui
  template: `<app-dashboard></app-dashboard>`
})
export class AppComponent {}