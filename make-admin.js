import { Pool } from '@neondatabase/serverless';
import 'dotenv/config';

async function main() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    console.log("No connection string found");
    return;
  }
  const pool = new Pool({ connectionString });
  
  try {
    const res = await pool.query("UPDATE users SET role = 'admin' WHERE email = 'denmercera@gmail.com' RETURNING *");
    if (res.rows.length > 0) {
      console.log("Successfully made denmercera@gmail.com an admin:", res.rows[0]);
    } else {
      console.log("User denmercera@gmail.com not found. Try logging in first.");
    }
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await pool.end();
  }
}
main();
