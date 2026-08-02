import { createClient } from "loggly";
import type { LogglyEvent } from "./logcheck";

export interface LogglyCredentials {
  subdomain: string;
  token: string;
  auth?: string;
  json?: boolean;
}

export interface LogglySearchOptions {
  query: string;
  from: string;
  until: string;
  order: string;
  size: number;
}

export interface LogglyDataSource {
  search(options: LogglySearchOptions): Promise<LogglyEvent[]>;
}

// Real implementation, backed by the `loggly` npm client (same one the
// original service used) - uses native Promise, as the original does.
export function createLogglyDataSource(
  credentials: LogglyCredentials | null,
): LogglyDataSource {
  return {
    search(options: LogglySearchOptions): Promise<LogglyEvent[]> {
      if (!credentials) {
        return Promise.reject(
          new Error("logcheck: loggly credentials not configured"),
        );
      }
      return new Promise(function (resolve, reject) {
        const client = createClient(credentials);
        client.search(options).run(function (err, results) {
          if (err) {
            reject(err);
          } else {
            resolve(results.events as LogglyEvent[]);
          }
        });
      });
    },
  };
}
