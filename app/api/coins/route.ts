import { NextRequest, NextResponse } from "next/server";
import coinsData from "@/app/unitedStatesMoney.json";

type Issuer = {
  code: string;
  name: string;
};

type RawCoin = {
  title?: unknown;
  issuerCode?: string;
  issuerName?: string;
  minYear?: number;
  maxYear?: number;
  category?: string;
  [key: string]: unknown;
};

type CategoryOption = {
  code: string;
  name: string;
  value: string;
};

const PAGE_SIZE_FALLBACK = 12;
const MAX_PAGE_SIZE = 100;

const CATEGORY_CONFIG: CategoryOption[] = [
  { code: "coins", name: "Coins", value: "coin" },
  { code: "banknotes", name: "Banknotes", value: "banknote" },
  { code: "exonumia", name: "Exonumia", value: "exonumia" },
];

const sourceCoins: RawCoin[] = Array.isArray(coinsData)
  ? (coinsData as RawCoin[])
  : [];

const normalizedCoins = sourceCoins.map((coin) => ({
  ...coin,
  title: typeof coin.title === "string" ? coin.title : "",
}));

const sortedCoins = [...normalizedCoins].sort(
  (a, b) => (b.maxYear ?? 0) - (a.maxYear ?? 0)
);

const issuers: Issuer[] = Array.from(
  (() => {
    const map = new Map<string, string>();
    sortedCoins.forEach((coin) => {
      const code = coin?.issuerCode;
      if (!code) {
        return;
      }
      const name =
        typeof coin.issuerName === "string" && coin.issuerName.trim().length
          ? coin.issuerName
          : String(code);
      if (!map.has(code)) {
        map.set(code, name);
      }
    });
    return map;
  })()
).map(([code, name]) => ({ code, name }));

const categories = CATEGORY_CONFIG.filter((category) =>
  sortedCoins.some((coin) => coin.category === category.value)
).map(({ code, name }) => ({ code, name }));

const parseYear = (value: string | null): number | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const filterCoins = (
  coins: typeof sortedCoins,
  search: string | null,
  issuer: string | null,
  issuedAfter: number | undefined,
  issuedBefore: number | undefined,
  category: string | null
) => {
  const searchLower = search?.trim().toLowerCase() ?? "";
  const hasSearch = searchLower.length > 0;
  const issuerFilter = issuer && issuer !== "ALL" ? issuer : null;
  const categoryFilter = category && category !== "ALL" ? category.toLowerCase() : null;

  return coins.filter((coin) => {
    const title = coin.title ?? "";
    const matchesSearch = hasSearch ? title.toLowerCase().includes(searchLower) : true;
    const matchesIssuer = issuerFilter ? coin.issuerCode === issuerFilter : true;
    const matchesIssuedAfter =
      issuedAfter !== undefined ? (coin.maxYear ?? 9999) >= issuedAfter : true;
    const matchesIssuedBefore =
      issuedBefore !== undefined ? (coin.minYear ?? 0) <= issuedBefore : true;
    const matchesCategory = categoryFilter ? coin.category === categoryFilter : true;

    return (
      matchesSearch &&
      matchesIssuer &&
      matchesIssuedAfter &&
      matchesIssuedBefore &&
      matchesCategory
    );
  });
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const searchParams = url.searchParams;

  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("pageSize");
  const searchParam = searchParams.get("search");
  const issuerParam = searchParams.get("issuer");
  const issuedAfterParam = searchParams.get("issuedAfter");
  const issuedBeforeParam = searchParams.get("issuedBefore");
  const includeRaw = searchParams.get("includeRaw") === "true";
  const categoryParam = searchParams.get("category");

  const pageCandidate = Number.parseInt(pageParam ?? "1", 10);
  const page = Number.isFinite(pageCandidate) && pageCandidate > 0 ? pageCandidate : 1;

  const pageSizeCandidate = Number.parseInt(pageSizeParam ?? "", 10);
  const pageSize = Number.isFinite(pageSizeCandidate)
    ? Math.min(Math.max(pageSizeCandidate, 1), MAX_PAGE_SIZE)
    : PAGE_SIZE_FALLBACK;

  const issuedAfter = parseYear(issuedAfterParam);
  const issuedBefore = parseYear(issuedBeforeParam);

  const filteredCoins = filterCoins(
    sortedCoins,
    searchParam,
    issuerParam,
    issuedAfter,
    issuedBefore,
    categoryParam
  );

  const total = filteredCoins.length;
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
  const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;

  const startIndex = (safePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const items = total > 0 ? filteredCoins.slice(startIndex, endIndex) : [];

  return NextResponse.json({
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
    issuers,
    categories,
    ...(includeRaw ? { raw: filteredCoins } : {}),
  });
}
