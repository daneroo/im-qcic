// No types published for `loggly` - minimal ambient declaration covering
// only the surface this package actually uses.
declare module "loggly" {
  export interface LogglySearch {
    run(
      callback: (err: Error | null, results: { events: unknown[] }) => void,
    ): void;
  }

  export interface LogglyClient {
    search(options: unknown): LogglySearch;
  }

  export function createClient(options: unknown): LogglyClient;
}
