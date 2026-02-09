# Project Context: BAIC Requirements Management System

## Project Overview
This project is a **Requirements Management System** frontend application built with **React 19**, **TypeScript**, and **Vite**. It features a comprehensive suite of tools for managing requirements, projects, and visual modeling.

## Technology Stack
*   **Framework:** React 19
*   **Build Tool:** Vite
*   **Language:** TypeScript
*   **Routing:** React Router DOM (v7)
*   **UI Component Library:** Ant Design (antd v6)
*   **Visual Modeling:** @antv/x6, @antv/x6-plugin-dnd, @antv/x6-react-shape
*   **Styling:** Standard CSS (per-component/page styles)

## Project Structure
The `src` directory is organized as follows:

```text
src/
├── assets/                  # Static assets
├── components/              # Reusable UI components & Specialized Editors
│   ├── DimensionEditor/     # Components for editing dimensions
│   ├── dsl-editor/          # Domain Specific Language editor
│   ├── form-panel/          # Complex form panel implementation (contains many sub-files)
│   ├── graph/               # Graph visualization components (AntV X6 integration)
│   ├── nodes/               # Custom nodes for the graph
│   ├── RequirementOverview/ # Requirement overview components
│   ├── LeftBar.tsx          # Navigation sidebar
│   └── TopBar.tsx           # Application header
├── config/                  # Configuration files
├── layouts/                 # Layout components
│   └── MainLayout.tsx       # Main layout logic (wraps authenticated routes)
├── models/                  # Data models and TypeScript interfaces
├── pages/                   # Page-level components (Route targets)
│   ├── CreateProject.tsx
│   ├── CreateRequirement.tsx
│   ├── Home.tsx
│   ├── Login.tsx
│   ├── ProjectDetail.tsx
│   ├── ProjectManagement.tsx
│   ├── ProjectWorkSpace.tsx
│   ├── Register.tsx
│   └── RequirementSectionEditor.tsx
├── App.tsx                  # Application Router configuration
├── main.tsx                 # Entry point
└── index.css                # Global styles
```

## Application Routes (from App.tsx)

### Public Routes
*   `/login` - User Login
*   `/register` - User Registration

### Authenticated Routes (Wrapped in MainLayout)
*   `/` - Home Dashboard
*   `/project` - Project Management List
*   `/create-project` - Create New Project
*   `/project/:type` - Project Management (Filtered by type)
*   `/project/:type/:id` - Project Detail View
*   `/workspace/:projectKey` - Project Workspace (likely for editing/modeling)
*   `/project/:type/:id/create` - Create Requirement
*   `/project/:type/:id/create/section/:sectionKey` - Requirement Section Editor

## Key Features Inferred from Structure
1.  **Visual Modeling**: The presence of `graph/`, `nodes/` and `@antv/x6` dependencies suggests a strong focus on visual diagrams or modeling capabilities.
2.  **Complex Forms**: The `form-panel/` directory in components has a large number of children (76 files), indicating a very complex or dynamic form system.
3.  **Project Lifecycle**: Dedicated pages for creating, viewing details, and managing workspaces for projects.
4.  **Requirement Management**: Specialized editors for requirements and sections (`RequirementSectionEditor`, `DimensionEditor`).

## Development Conventions
*   **Styling**: CSS files are co-located with their components (e.g., `Home.tsx` + `Home.css`).
*   **Routing**: React Router v7 is used with a `Routes` configuration in `App.tsx`.
*   **Layouts**: `MainLayout` handles the persistent UI frame for the application.
*   **Component/page creation**: Component/page creation must follow this file structure: Create a directory named after the component containing Component.tsx, Component.css, and an index.ts entry point for exports.

