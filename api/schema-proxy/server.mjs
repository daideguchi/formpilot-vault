import http from "node:http";
import { inferSchemaWithProxy } from "./schema-proxy.js";

const port = Number(process.env.PORT || 8787);

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    if (request.method !== "POST" || request.url !== "/api/schema/infer") {
      sendJson(response, 404, { error: "not_found" });
      return;
    }

    const payload = JSON.parse(await readBody(request));
    const result = await inferSchemaWithProxy({
      payload,
      env: process.env,
      fetchImpl: globalThis.fetch,
      date: new Date()
    });
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
  }
});

server.listen(port, () => {
  console.log(`schema proxy listening on http://127.0.0.1:${port}/api/schema/infer`);
});

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 200_000) {
        request.destroy();
        reject(new Error("body_too_large"));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization"
  });
  if (status === 204) {
    response.end();
    return;
  }
  response.end(JSON.stringify(data));
}
