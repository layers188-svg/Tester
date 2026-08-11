// `server-only` throws by design when imported outside a React Server
// Component. Unit tests import server modules directly, so alias it to
// this no-op (see vitest.config.mts).
export {};
