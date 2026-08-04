import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Fully static/client-rendered (see #241 and v2/AGENTS.md's web section):
// no server functions or loaders are written here, so nothing this app
// serves is ever server-rendered data - future tickets (#249, #250) fetch
// everything client-side over a direct NATS websocket connection.
export default defineConfig({
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
});
