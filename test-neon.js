import { neon } from '@neondatabase/serverless';

const sql = neon('postgres://user:pass@ep-fake-host.neon.tech/dbname?sslmode=require');
console.log("sql function keys:", Object.keys(sql));
