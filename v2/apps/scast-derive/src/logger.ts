import pino from "pino";

// Single instantiated pino logger for re-use - JSON to stdout, matching
// v2/apps/status's convention.
export const log = pino();
