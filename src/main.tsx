import ReactDOM from "react-dom/client";
import "./styles/index.css";
import App from "./app/App";

/*
 * Optional local brand override. Any `src/app/styles/*.local.css` is picked up here and
 * applied after the library defaults, so it wins.
 *
 * These files are gitignored on purpose: this repository is public, and brand palettes
 * are not. A glob is used rather than a plain import because a static import of a
 * gitignored file would break `npm run dev` for anyone who clones the repo — with a
 * glob, zero matches is simply a no-op and the sandbox renders in neutral.
 *
 * See src/app/styles/README.md.
 */
import.meta.glob("./app/styles/*.local.css", { eager: true });

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
