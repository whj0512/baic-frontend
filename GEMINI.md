# Project Context: BAIC Requirements Management System

## Project Overview
This project is a **Requirements Management System** frontend application built with **React 19**, **TypeScript**, and **Vite**. It currently provides a basic structure for user authentication (Login/Register) and a main dashboard (Home).

## Technology Stack
*   **Framework:** React 19
*   **Build Tool:** Vite
*   **Language:** TypeScript
*   **Routing:** React Router DOM (v7)
*   **Styling:** Standard CSS (per-component/page styles)

## Project Structure
```text
src/
├── components/       # Reusable UI components
│   └── TopBar.tsx    # (Existing but seemingly unused in App.tsx)
├── pages/            # Page-level components
│   ├── Home.tsx      # Main dashboard/landing page
│   ├── Login.tsx     # User login page
│   └── Register.tsx  # User registration page
├── App.tsx           # Main application component & Router configuration
├── main.tsx          # Application entry point
└── assets/           # Static assets (images, icons)
```

## Building and Running
The project uses `npm` for dependency management and scripts.

*   **Install Dependencies:** `npm install`
*   **Start Development Server:** `npm run dev` (Runs on `http://localhost:5173` by default)
*   **Build for Production:** `npm run build`
*   **Preview Production Build:** `npm run preview`
*   **Lint Code:** `npm run lint`

## Development Conventions

### Coding Style
*   **Components:** Functional components with Hooks.
*   **Routing:** Defined in `src/App.tsx` using `BrowserRouter` and `Routes`.
*   **Language:**
    *   **Code:** TypeScript (English variable/function names).
    *   **UI Text:** Chinese (Simplified).
*   **Styling:** CSS files are co-located with their components (e.g., `Home.tsx` imports `Home.css`).

### Current Status & TODOs
*   **Navigation:** Basic routing is implemented (`/`, `/login`, `/register`).
*   **Home Page:** Contains a static layout with feature cards and a "Logout" button with a TODO placeholder.
*   **Authentication:** Login and Register pages exist but likely contain mock/placeholder logic.
*   **State Management:** No global state management library (like Redux or Zustand) is currently observed.

## Key Files
*   `src/App.tsx`: Central router configuration. Defines the navigation flow.
*   `src/pages/Home.tsx`: The main landing page after login.
*   `vite.config.ts`: Vite configuration file.
*   `package.json`: Project dependencies and scripts.
