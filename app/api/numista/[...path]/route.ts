import { NextRequest, NextResponse } from "next/server";

const NUMISTA_API_BASE_URL = "https://api.numista.com/v3";
const NUMISTA_API_KEY_HEADER = "Numista-API-Key";
const RETRY_HEADERS = [
  "retry-after",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "x-ratelimit-reset",
] as const;

const resolveApiKey = (request: NextRequest): string | undefined => {
  const headerCandidates = [
    NUMISTA_API_KEY_HEADER,
    "numista-api-key",
    "x-numista-api-key",
  ];

  for (const headerName of headerCandidates) {
    const value = request.headers.get(headerName);
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }

  const envKey =
    process.env.NUMISTA_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_NUMISTA_API_KEY?.trim();

  return envKey && envKey.length > 0 ? envKey : undefined;
};

const buildUpstreamUrl = (pathSegments: string[], search: string) => {
  const sanitizedSegments = pathSegments
    .filter((segment) => segment && segment.length > 0)
    .map((segment) => segment.trim());

  if (sanitizedSegments.some((segment) => segment.includes(".."))) {
    throw new Error("Invalid path segment detected.");
  }

  const path = sanitizedSegments
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${NUMISTA_API_BASE_URL}/${path}${search}`;
};

export async function GET(
  request: NextRequest,
  context: { params: { path?: string[] } }
) {
  const pathSegments = context.params.path ?? [];

  if (!pathSegments.length) {
    return NextResponse.json(
      { error: "A Numista API path is required." },
      { status: 400 }
    );
  }

  let upstreamUrl: string;
  try {
    upstreamUrl = buildUpstreamUrl(pathSegments, request.nextUrl.search);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }

  const apiKey = resolveApiKey(request);

  if (!apiKey) {
    return NextResponse.json(
      { error: "A Numista API key is required." },
      { status: 400 }
    );
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        [NUMISTA_API_KEY_HEADER]: apiKey,
        accept: request.headers.get("accept") ?? "application/json",
      },
      cache: "no-store",
    });

    const responseHeaders = new Headers();
    const contentType = upstreamResponse.headers.get("content-type");
    if (contentType) {
      responseHeaders.set("content-type", contentType);
    }

    responseHeaders.set("cache-control", "no-store");

    for (const headerName of RETRY_HEADERS) {
      const value = upstreamResponse.headers.get(headerName);
      if (value) {
        responseHeaders.set(headerName, value);
      }
    }

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Failed to proxy Numista request:", error);
    return NextResponse.json(
      { error: "Failed to reach Numista API." },
      { status: 502 }
    );
  }
}
