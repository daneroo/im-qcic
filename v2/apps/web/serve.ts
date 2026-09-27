// Production server: `bun run start`. TanStack Start's built server entry
// only renders routes - it does not serve dist/client (a 404 for /assets/*),
// so files there are served first and everything else falls through to it.
import { resolve, sep } from "node:path";

// A built artifact, absent until `bun run build`: imported by a path the
// type checker does not follow.
const entry: string = "./dist/server/server.js";
const { default: server } = (await import(entry)) as {
  default: { fetch(request: Request): Promise<Response> };
};

const clientDir = resolve(import.meta.dir, "dist/client");
const port = Number(process.env.PORT ?? 8000);

Bun.serve({
  port,
  async fetch(request) {
    const path = resolve(clientDir, "." + new URL(request.url).pathname);
    if (path.startsWith(clientDir + sep)) {
      const file = Bun.file(path);
      if (await file.exists()) return new Response(file);
    }
    return server.fetch(request);
  },
});

console.log(`web listening on :${port}`);
