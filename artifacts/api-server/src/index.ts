import 'dotenv/config';
import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { setupWebSocket } from "./ws-server";


const port = Number(process.env.PORT) || 3000;

const server = createServer(app);

setupWebSocket(server);

server.listen(port, () => {
  logger.info({ port }, "Server listening");
});
