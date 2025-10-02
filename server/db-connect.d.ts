import { Pool } from 'pg';

export const pool: Pool;
export const poolPromise: Promise<Pool>;

declare const _default: {
  pool: Pool;
  poolPromise: Promise<Pool>;
};

export default _default;
