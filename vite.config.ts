import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import chatHandler from "./api/chat";

const DEFAULT_CHAT_API_PORT = 8787;
const SERVER_ENV_KEYS = [
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "CHAT_NOTIFICATION_EMAIL",
  "CHAT_NOTIFICATION_WEBHOOK",
  "RESEND_API_KEY",
  "CHAT_NOTIFICATION_FROM",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY",
  "CHAT_ADMIN_TOKEN",
];

type ChatHandler = typeof chatHandler;
type ChatRequest = Parameters<ChatHandler>[0];
type ChatResponse = Parameters<ChatHandler>[1];

async function readRequestBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

function addVercelResponseMethods(response: ServerResponse): ChatResponse {
  const apiResponse = response as unknown as ChatResponse & {
    status?: (statusCode: number) => ChatResponse;
    json?: (body: unknown) => ChatResponse;
  };

  apiResponse.status = (statusCode: number) => {
    response.statusCode = statusCode;
    return apiResponse;
  };

  apiResponse.json = (body: unknown) => {
    if (!response.headersSent) {
      response.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    response.end(JSON.stringify(body));
    return apiResponse;
  };

  return apiResponse;
}

function localChatApiPlugin(port: number): Plugin {
  let apiServer: ReturnType<typeof createServer> | undefined;

  return {
    name: "local-chat-api",
    configureServer(viteServer) {
      apiServer = createServer(async (request, response) => {
        if (!request.url?.startsWith("/api/chat")) {
          response.statusCode = 404;
          response.end();
          return;
        }

        try {
          const body = await readRequestBody(request);
          const apiRequest = request as unknown as ChatRequest & { body?: unknown };
          apiRequest.body = body;
          await chatHandler(apiRequest, addVercelResponseMethods(response));
        } catch {
          if (!response.headersSent) {
            response.statusCode = 500;
            response.setHeader("Content-Type", "application/json; charset=utf-8");
            response.end(JSON.stringify({ error: "Local chat API failed" }));
          } else {
            response.end();
          }
        }
      });

      apiServer.on("error", (error) => {
        viteServer.config.logger.error(`Local chat API error: ${error.message}`);
      });
      apiServer.listen(port, "127.0.0.1");

      viteServer.httpServer?.once("close", () => {
        apiServer?.close();
        apiServer = undefined;
      });
    },
  };
}

function getPort(env: Record<string, string>): number {
  const configuredPort = Number(env.CHAT_DEV_API_PORT || process.env.CHAT_DEV_API_PORT);
  return Number.isInteger(configuredPort) && configuredPort > 0 && configuredPort < 65536
    ? configuredPort
    : DEFAULT_CHAT_API_PORT;
}

function loadServerEnvironment(mode: string): Record<string, string> {
  const env = loadEnv(mode, process.cwd(), "");

  for (const key of SERVER_ENV_KEYS) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  }

  return env;
}

export default defineConfig(({ mode }) => {
  const env = loadServerEnvironment(mode);
  const chatApiPort = getPort(env);

  return {
    plugins: [react(), tailwindcss(), localChatApiPlugin(chatApiPort)],
    server: {
      proxy: {
        "/api": {
          target: `http://127.0.0.1:${chatApiPort}`,
          changeOrigin: true,
        },
      },
    },
    resolve: {
      tsconfigPaths: true,
    },
  };
});
