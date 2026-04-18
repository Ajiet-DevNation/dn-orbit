import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

let connectionString = process.env.DATABASE_URL;
if (connectionString?.startsWith("'") && connectionString?.endsWith("'")) {
  connectionString = connectionString.slice(1, -1);
}

console.log("URL:", connectionString);

const pool = new Pool({ connectionString });
pool.query("SELECT 1").then(res => {
  console.log("Success!", res.rows);
  process.exit(0);
}).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
