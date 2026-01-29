# 🏛️ Archiview

**Archiview** is a professional-grade static analysis tool designed to map, visualize, and explore complex web application architectures. It transforms raw source code into an interactive visual map, making it easier for developers to understand component relationships, service injections, and routing logic.



---

## 🚀 Overview

Modern web applications can become a "black box" of nested routes and hidden dependencies. **Archiview** sheds light on your project by parsing your codebase and generating a dynamic graph and a structured sitemap.

Originally built with a focus on **Angular**, its core logic is designed to be framework-agnostic, paving the way for future support of React and other modern libraries.

---

## ✨ Key Features

### 🔍 Smart Routing Tree
A minimalist, glassmorphism-inspired sitemap that reflects your app's true hierarchy.
* **Recursive Parsing:** Visualizes nested `children` routes.
* **Dynamic Indicators:** Automatically tags parameterized routes (e.g., `:id`).
* **Visual Guides:** Clean, geometric connectors for better readability.

### 🕸️ Interactive Dependency Graph
Powered by **Cytoscape.js**, the graph provides a birds-eye view of your architecture:
* **Injection Mapping:** See where services are being used.
* **Containment Logic:** Understand which components host others.
* **Navigation Flows:** Visualize how users move between views.

### 📊 Project Insights
Instantly get a high-level summary of your project's scale, including component and service counts.

---

## 🛠️ Tech Stack

* **Core:** [Angular](https://angular.io/)
* **Visualization:** [Cytoscape.js](https://js.cytoscape.org/)
* **Parsing:** TypeScript AST Logic
* **Styling:** Custom CSS with Glassmorphism & Tailwind principles
* **AI Integration:** Powered by Gemini AI for advanced code insights

---

## 🏗️ Getting Started

### Prerequisites
* Node.js (LTS version recommended)
* npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone [https://github.com/PeterBrown98/archi-view.git](https://github.com/PeterBrown98/archi-view.git)
