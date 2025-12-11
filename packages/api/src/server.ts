import { app } from './app.js';
import { getLogger } from '@align-agents/logger';

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
const logger = getLogger();

app.listen(port, () => {
    logger.info({ port }, 'Server is running');
});
