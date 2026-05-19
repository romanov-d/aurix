import app from '../server/app.js';

// Vercel serverless functions expect a standard Node.js (req, res) handler.
// Express app IS a (req, res) handler — export it directly.
// (serverless-http is for AWS Lambda and does NOT work with Vercel)
export default app;
