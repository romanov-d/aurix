import 'dotenv/config';   // load .env for local dev only
import app from './app.js';

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`[api] http://localhost:${PORT}`));
