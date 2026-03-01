import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { hostname } from "node:os";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import dotenv from "dotenv";
logging.set_level(logging.INFO);

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");

const PORT = process.env.PORT || 4040;
const HOST = process.env.HOST || "0.0.0.0";
const env = process.env.env || "production";
const dscWebhook = process.env.webhookthing;
const blockedIpsPath = path.join(__dirname, "..", "blocked.json");
let blockedIps = [];
try {
  const data = readFileSync(blockedIpsPath, "utf-8");
  blockedIps = JSON.parse(data);
} catch (err) {
  console.error("Could not load blocked.json, continuing with empty list.");
}
const fastify = Fastify({
  trustProxy: true,
  serverFactory: (handler) => {
    return createServer()
      .on("request", (req, res) => {
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
        handler(req, res);
      })
      .on("upgrade", (req, socket, head) => {
        const ip =
          req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
          req.socket.remoteAddress;
        if (blockedIps.includes(ip)) return socket.destroy();
        if (req.url.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
        else socket.end();
      });
  },
  logger: env === "development",
});

fastify.addHook("onRequest", async (request, reply) => {
  if (blockedIps.includes(request.ip)) {
    reply.code(403).send({ error: "Access denied from this IP." });
  }
});
fastify.register(fastifyStatic, {
  root: publicDir,
  prefix: "/",
  decorateReply: true,
});

fastify.get("/", (req, reply) => {
  return reply.sendFile("index.html", publicDir);
});

fastify.register(fastifyStatic, {
  root: epoxyPath,
  prefix: "/epoxy/",
  decorateReply: false,
});

fastify.register(fastifyStatic, {
  root: baremuxPath,
  prefix: "/baremux/",
  decorateReply: false,
});

fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  reply.status(500).send({ error: "Internal Server Error" });
});

async function shutdown() {
  try {
    await fastify.close();
    process.exit(0);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

fastify.listen({ port: PORT, host: HOST }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  const address = fastify.server.address();
  console.log(`Server running in ${env} mode`);
  console.log(`Listening on:`);
  console.log(`\thttp://localhost:${address.port}`);
  console.log(`\thttp://${hostname()}:${address.port}`);
  if (address.family === "IPv6") {
    console.log(`\thttp://[${address.address}]:${address.port}`);
  } else {
    console.log(`\thttp://${address.address}:${address.port}`);
  }
});

fastify.post("/report-bug", async (req, reply) => {
  const { name, bug, url, ip } = req.body;
  try {
    const response = await fetch(dscWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `# New Bug Report!`,
        embeds: [
          {
            title: "Bug Report",
            type: "rich",
            color: 0xff0000,
            fields: [
              { name: "Report Type:", value: name, inline: true },
              { name: "Description:", value: bug },
              { name: "Page URL:", value: url },
              { name: "From:", value: ip },
            ],
            footer: { text: "Galaxy Bug Report" },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    if (response.ok) {
      return reply.send({ status: "ok" });
    } else {
      return reply.code(500).send({ error: "Failed to send bug report" });
    }
  } catch (err) {
    return reply.code(500).send({ error: err.message });
  }
});

fastify.get("/allow", async (req, reply) => {
  return reply.code(200).send({ status: "allowed" });
});
