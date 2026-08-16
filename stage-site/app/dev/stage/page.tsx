import { StageRoute } from "./StageRoute";

/**
 * The stage, at the same path it has in the product, so
 * tests/e2e/motion.spec.ts runs against this export unchanged:
 *
 *   PLAYWRIGHT_BASE_URL=<origin> npx playwright test tests/e2e/motion.spec.ts
 *
 * That equivalence is the point of the whole site. A review link that
 * shows something the motion suite has not measured would be a demo, not
 * evidence.
 */

export default function StagePage() {
  return <StageRoute />;
}
