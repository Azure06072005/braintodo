/**
 * Centralizes environment-mode reads behind a small module (see FE026)
 * rather than reading import.meta.env.DEV directly at every call site.
 *
 * Why: import.meta.env is build-time-substituted by Vite and not reliably
 * mutable at test-runtime across all test runners/configurations. Routing
 * every "is this a dev build" check through this one module lets tests
 * deterministically simulate production behavior via
 * vi.mock("../config/env", () => ({ IS_DEV: false })) instead.
 */
export const IS_DEV = import.meta.env.DEV;
