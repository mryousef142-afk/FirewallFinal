/// <reference lib="webworker" />

type MaybePromise<T> = T | Promise<T>;

interface Env {
  BACKEND_URL?: string;
  ASSETS: {
    fetch(request: Request): MaybePromise<Response>;
  };
}

const PROXY_PATH_PREFIXES = ["/api/", "/telegram/"];

export default {
  async fetch(request: Request, env: Env, _ctx: unknown): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return handleOptions(request);
    }

    if (url.pathname === "/healthz") {
      return withCors(
        request,
        Response.json({
          status: "ok",
          worker: "tg-firewall",
          timestamp: new Date().toISOString(),
        }),
      );
    }

    if (shouldProxy(url.pathname)) {
      return proxyRequest(request, env);
    }

    return serveStaticAsset(request, env);
  },
};

function shouldProxy(pathname: string): boolean {
  return PROXY_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function handleOptions(request: Request): Response {
  const origin = request.headers.get("Origin");
  const acrHeaders = request.headers.get("Access-Control-Request-Headers");
  const acrMethod = request.headers.get("Access-Control-Request-Method");

  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", origin ?? "*");
  headers.set("Access-Control-Allow-Methods", acrMethod ?? "GET,POST,PUT,DELETE,OPTIONS");
  if (acrHeaders) {
    headers.set("Access-Control-Allow-Headers", acrHeaders);
  } else {
    headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
  }
  headers.set("Access-Control-Max-Age", "86400");
  if (origin) {
    headers.set("Vary", "Origin");
  }
  return new Response(null, { status: 204, headers });
}

async function proxyRequest(request: Request, env: Env): Promise<Response> {
  const backendOrigin = env.BACKEND_URL;
  if (!backendOrigin) {
    return withCors(
      request,
      new Response(
        JSON.stringify({
          error: "Backend origin is not configured",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      ),
    );
  }

  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(incomingUrl.pathname + incomingUrl.search, backendOrigin);
  targetUrl.hash = incomingUrl.hash;

  const headers = cloneRequestHeaders(request);
  headers.set("x-forwarded-host", incomingUrl.host);
  headers.set("x-forwarded-proto", incomingUrl.protocol.replace(":", ""));
  const connectingIp = request.headers.get("CF-Connecting-IP");
  if (connectingIp) {
    headers.set("x-forwarded-for", connectingIp);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    body: needsRequestBody(request.method) ? request.body : undefined,
    redirect: "manual",
  };

  try {
    const response = await fetch(targetUrl.toString(), init);
    return withCors(request, response);
  } catch (error) {
    return withCors(
      request,
      new Response(
        JSON.stringify({
          error: "Upstream request failed",
          detail: error instanceof Error ? error.message : String(error),
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      ),
    );
  }
}

function cloneRequestHeaders(request: Request): Headers {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() === "host") {
      return;
    }
    headers.set(key, value);
  });
  return headers;
}

function needsRequestBody(method: string): boolean {
  return !["GET", "HEAD"].includes(method.toUpperCase());
}

async function serveStaticAsset(request: Request, env: Env): Promise<Response> {
  const response = await env.ASSETS.fetch(request);
  if (response.status !== 404 || request.method !== "GET") {
    return response;
  }

  const url = new URL(request.url);
  url.pathname = "/index.html";

  const fallbackRequest = new Request(url.toString(), {
    method: "GET",
    headers: request.headers,
    redirect: "manual",
  });

  return env.ASSETS.fetch(fallbackRequest);
}

function withCors(request: Request, response: Response): Response {
  const origin = request.headers.get("Origin");
  const headers = new Headers(response.headers);

  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    const vary = headers.get("Vary");
    headers.set("Vary", vary ? `${vary}, Origin` : "Origin");
  } else if (!headers.has("Access-Control-Allow-Origin")) {
    headers.set("Access-Control-Allow-Origin", "*");
  }

  if (!headers.has("Access-Control-Allow-Headers")) {
    headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
  }

  if (!headers.has("Access-Control-Allow-Methods")) {
    headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
