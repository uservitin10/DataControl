import { Pool, PoolClient } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;

export async function withAuthenticatedClient<T>(
  user: { id: string; role: string } | null,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (user) {
      await client.query("SELECT set_config('app.current_user_id', $1, true)", [user.id]);
      await client.query("SELECT set_config('app.current_role', $1, true)", [user.role]);
    }

    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}