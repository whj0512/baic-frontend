# Repository Guidelines

## Project Structure & Module Organization
`src/main.tsx` bootstraps the app, and `src/App.tsx` defines the route tree. Put route-level screens in `src/pages/`, shared UI in `src/components/`, and reusable hooks in `src/hooks/`. Domain models and graph import/export strategies live in `src/models/`, while API and WebSocket endpoint helpers are centralized in `src/config/api.ts`. Most UI modules keep a sibling `.css` file and an optional `index.ts` barrel. Use `public/` and `src/assets/` for static assets, and treat `helps/` as reference material for backend contracts and modeling docs.

## Build, Test, and Development Commands
Run `npm ci` to install the locked dependency set. Use `npm run dev` to start the Vite development server, `npm run build` to generate the production bundle, and `npm run preview` to serve the built output locally. Run `npm run lint` before pushing changes; it is the main automated quality check configured in this repo.

## Coding Style & Naming Conventions
This project uses React + TypeScript with function components, ES modules, 2-space indentation, and the existing no-semicolon style. Keep component, page, and model filenames in PascalCase such as `ProjectWorkSpace.tsx` and `Requirement.ts`. Use camelCase for hooks and utilities, with hooks prefixed by `use`, for example `useProjectSync.ts`. Keep styles adjacent to the component they support, and prefer small barrel exports like `index.ts` where the surrounding folder already uses that pattern.

## Testing Guidelines
There is no automated test runner or coverage threshold configured in `package.json` yet. For now, treat `npm run lint` and focused manual verification as required. For UI changes, verify authentication, project creation, workspace loading, graph editing, and DSL/graph conversion flows in the local dev server. If you add tests, prefer colocated `*.test.ts` or `*.test.tsx` files and add the matching script to `package.json`.

## Commit & Pull Request Guidelines
Recent commits follow Conventional Commit-style subjects such as `feat: implement project workspace...`. Keep commit messages short, imperative, and scoped with prefixes like `feat:`, `fix:`, or `refactor:`. Pull requests should include a concise summary, linked task or issue, manual test notes, and screenshots or recordings for visual editor or page changes.

## Configuration & Integration Notes
Frontend endpoint configuration depends on `VITE_API_BASE_URL` and `VITE_WS_BASE_URL`. Keep environment-specific URLs in Vite env files rather than hardcoding them in components.

## 注意
你修改完代码后无需进行 `eslint` 和 `tsc --noEmit` 检查，相关命令由 CI 进行
