import 'dotenv/config';
import app from './app';
import { connectDatabase } from './config/db';

async function start() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) throw new Error('MONGODB_URI and JWT_SECRET must be configured');
  await connectDatabase(process.env.MONGODB_URI);
  const port = Number(process.env.PORT ?? 4000);
  app.listen(port, () => console.log(`Meme'd API listening on port ${port}`));
}
start().catch((error) => { console.error('Failed to start API', error); process.exit(1); });
