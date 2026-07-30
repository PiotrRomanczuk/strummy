// Re-export of the single generated source of truth (`database.types.ts`).
//
// Kept as a module so the many existing `@/types/...` imports keep working;
// there is deliberately no independent type definition here. Do not add one —
// a second copy is how these drifted out of sync with the schema before.
export type {
  Json,
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
} from '../database.types';
export { Constants } from '../database.types';
