"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  Banknote,
  ChevronDown,
  ChevronRight,
  Coins,
  Currency,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type Coin = {
  id?: string | number;
  title?: string;
  issuerCode?: string;
  issuerName?: string;
  minYear?: number;
  maxYear?: number;
  frontThumbUrl?: string;
  backThumbUrl?: string;
  [key: string]: unknown;
};

type Issuer = {
  code: string;
  name: string;
};

type CoinsResponse = {
  items: Coin[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  issuers: Issuer[];
  raw?: Coin[];
};

const PAGE_SIZE = 90;

export default function Home() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isRawDataOpen, setIsRawDataOpen] = useState(false);
  const [rawData, setRawData] = useState<Coin[] | null>(null);
  const [isRawLoading, setIsRawLoading] = useState(false);
  const [rawError, setRawError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedIssuer, setSelectedIssuer] = useState("ALL");
  const [issuedBefore, setIssuedBefore] = useState("");
  const [issuedAfter, setIssuedAfter] = useState("");
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("ALL");

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);

    return () => window.clearTimeout(handle);
  }, [searchText]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedIssuer, issuedAfter, issuedBefore, type]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });

    if (debouncedSearch.trim()) {
      params.set("search", debouncedSearch.trim());
    }
    if (selectedIssuer !== "ALL") {
      params.set("issuer", selectedIssuer);
    }
    if (issuedAfter.trim()) {
      params.set("issuedAfter", issuedAfter.trim());
    }
    if (issuedBefore.trim()) {
      params.set("issuedBefore", issuedBefore.trim());
    }
    if (type !== "ALL") {
      params.set("category", type);
    }

    fetch(`/api/coins?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load coins (${res.status})`);
        }
        return res.json() as Promise<CoinsResponse>;
      })
      .then((data) => {
        if (!active) {
          return;
        }

        setCoins(data.items);
        setTotalCount(data.total);
        setTotalPages(data.totalPages || 1);
        if (data.issuers) {
          setIssuers(data.issuers);
        }

        if (data.page !== page) {
          setPage(data.page);
        }
      })
      .catch((err: unknown) => {
        if (!active) {
          return;
        }
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setError(err instanceof Error ? err.message : "Unexpected error");
        setCoins([]);
        setTotalCount(0);
        setTotalPages(1);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [page, debouncedSearch, selectedIssuer, issuedAfter, issuedBefore, type]);

  useEffect(() => {
    if (!isRawDataOpen || rawData !== null) {
      return;
    }

    let active = true;
    const controller = new AbortController();

    setIsRawLoading(true);
    setRawError(null);

    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("pageSize", String(PAGE_SIZE));
    params.set("includeRaw", "true");
    if (type !== "ALL") {
      params.set("category", type);
    }

    fetch(`/api/coins?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load raw data (${res.status})`);
        }
        return res.json() as Promise<CoinsResponse>;
      })
      .then((data) => {
        if (!active) {
          return;
        }
        setRawData(data.raw ?? data.items ?? []);
      })
      .catch((err: unknown) => {
        if (!active) {
          return;
        }
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setRawError(err instanceof Error ? err.message : "Unexpected error");
      })
      .finally(() => {
        if (active) {
          setIsRawLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [isRawDataOpen, rawData, type]);

  const effectiveTotalPages = Math.max(totalPages, 1);
  const displayPage = Math.max(1, Math.min(page, effectiveTotalPages));

  const rangeLabel = useMemo(() => {
    if (!totalCount) {
      return "No coins to display";
    }
    const start = (displayPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(displayPage * PAGE_SIZE, totalCount);
    return `Showing ${start}-${end} of ${totalCount} coin${
      totalCount === 1 ? "" : "s"
    }`;
  }, [displayPage, totalCount]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">United States Coins</h1>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gird-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="gap-2 flex flex-col">
            <Label htmlFor="search">Name:</Label>
            <Input
              id="search"
              type="text"
              placeholder="Washington Quarter"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div className="gap-2 flex flex-col">
            <Label htmlFor="issuer">Issuer:</Label>
            <Select
              value={selectedIssuer}
              onValueChange={(v) => setSelectedIssuer(v)}
            >
              <SelectTrigger id="issuer" className="w-full">
                <SelectValue placeholder="Select issuer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Issuers</SelectItem>
                {issuers.map((issuer) => (
                  <SelectItem key={issuer.code} value={issuer.code}>
                    {issuer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="gap-2 flex flex-col">
            <Label htmlFor="issued-after">Issued After:</Label>
            <Input
              id="issued-after"
              type="number"
              placeholder="1873"
              value={issuedAfter}
              onChange={(e) => setIssuedAfter(e.target.value)}
            />
          </div>
          <div className="gap-2 flex flex-col">
            <Label htmlFor="issued-before">Issued Before:</Label>
            <Input
              id="issued-before"
              type="number"
              placeholder="1965"
              value={issuedBefore}
              onChange={(e) => setIssuedBefore(e.target.value)}
            />
          </div>
          <div className="gap-2 flex flex-col">
            <Label htmlFor="type">Type:</Label>
            <Select value={type} onValueChange={(v) => setType(v)}>
              <SelectTrigger id="type" className="w-full">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="coin">Coins</SelectItem>
                <SelectItem value="banknote">Banknotes</SelectItem>
                <SelectItem value="exonumia">Exonumia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">{rangeLabel}</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className={isLoading ? "animate-pulse" : ""}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={displayPage <= 1 || isLoading}
            >
              Previous
            </Button>
            <span className="text-sm font-medium">
              <Input
                type="number"
                value={displayPage}
                onChange={(e) => setPage(Number(e.target.value))}
                className="w-16 mr-2"
              />
              of {effectiveTotalPages}
            </span>
            <Button
              variant="outline"
              className={isLoading ? "animate-pulse" : ""}
              onClick={() =>
                setPage((prev) =>
                  totalCount === 0 ? 1 : Math.min(prev + 1, effectiveTotalPages)
                )
              }
              disabled={
                isLoading ||
                totalCount === 0 ||
                displayPage >= effectiveTotalPages
              }
            >
              Next
            </Button>
          </div>
        </div>
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {!isLoading && !coins.length && !error ? (
          <Card className="col-span-full border-2 border-dashed border-muted-foreground/40 bg-muted/20">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No coins match the selected filters.
            </CardContent>
          </Card>
        ) : (
          coins.map((coin) => {
            const key =
              coin.id !== undefined && coin.id !== null
                ? String(coin.id)
                : `${coin.title ?? "coin"}-${coin.issuerCode ?? "unknown"}-${
                    coin.maxYear ?? ""
                  }`;

            return (
              <Card key={key} className="flex h-full flex-col">
                <CardHeader>
                  <CardTitle>
                    {coin.category === "coin" && (
                      <Coins className="inline mr-2" />
                    )}
                    {coin.category === "banknote" && (
                      <Banknote className="inline mr-2" />
                    )}
                    {coin.category === "exonumia" && (
                      <Currency className="inline mr-2" />
                    )}
                    {coin.title || "Untitled coin"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow space-y-3 text-sm">
                  <p>
                    Issued by {coin.issuerName || "Unknown issuer"}
                    {coin.minYear && coin.minYear === coin.maxYear
                      ? ` in ${coin.minYear}`
                      : coin.minYear && coin.maxYear
                      ? ` from ${coin.minYear} to ${coin.maxYear}`
                      : coin.minYear
                      ? ` starting in ${coin.minYear}`
                      : coin.maxYear
                      ? ` up to ${coin.maxYear}`
                      : ", unknown year"}
                  </p>
                  <div className="flex flex-row gap-4">
                    {coin.frontThumbUrl ? (
                      <Image
                        src={String(coin.frontThumbUrl)}
                        alt={`${coin.title || "Coin"} front`}
                        width={100}
                        height={100}
                        className="mt-2"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center bg-gray-200">
                        <span className="text-center text-xs text-gray-600">
                          No Front Image
                        </span>
                      </div>
                    )}
                    {coin.backThumbUrl ? (
                      <Image
                        src={String(coin.backThumbUrl)}
                        alt={`${coin.title || "Coin"} back`}
                        width={100}
                        height={100}
                        className="mt-2"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center bg-gray-200">
                        <span className="text-center text-xs text-gray-600">
                          No Back Image
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <Link href={`/coinDetail?id=${coin.id}`}>
                  <CardFooter className="mt-auto flex items-center justify-between border-t text-sm">
                    <span>View Details</span>
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </CardFooter>
                </Link>
              </Card>
            );
          })
        )}
      </div>
      <Collapsible open={isRawDataOpen} onOpenChange={setIsRawDataOpen}>
        <CollapsibleTrigger asChild>
          <Button className="mt-4 w-full" variant="ghost">
            Raw Data
            <ChevronDown
              className={`transition-transform ${
                isRawDataOpen ? "rotate-180" : ""
              }`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {isRawLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading raw data…</span>
            </div>
          )}
          {rawError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {rawError}
            </div>
          )}
          {rawData && (
            <>
              <p>Total items: {rawData.length}</p>
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(rawData, null, 2)}
              </pre>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
