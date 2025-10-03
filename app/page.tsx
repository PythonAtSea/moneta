"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Banknote,
  ChevronRight,
  Coins,
  SquareStar,
  Loader2,
  Shrimp,
  CalendarArrowUp,
  CalendarArrowDown,
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowDown01,
  ArrowUp01,
  Heart,
  HeartPlus,
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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Home() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [selectedIssuer, setSelectedIssuer] = useState("ALL");
  const [issuedBefore, setIssuedBefore] = useState("");
  const [issuedAfter, setIssuedAfter] = useState("");
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [type, setType] = useState("ALL");
  const [sort, setSort] = useState("newest");
  const [favorites, setFavorites] = useState<string[]>([]);

  const params = useMemo(() => {
    const p = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });

    if (searchText.trim()) {
      p.set("search", searchText.trim());
    }
    if (selectedIssuer !== "ALL") {
      p.set("issuer", selectedIssuer);
    }
    if (issuedAfter.trim()) {
      p.set("issuedAfter", issuedAfter.trim());
    }
    if (issuedBefore.trim()) {
      p.set("issuedBefore", issuedBefore.trim());
    }
    if (type !== "ALL") {
      p.set("category", type);
    }
    p.set("sort", sort);

    return p;
  }, [page, searchText, selectedIssuer, issuedAfter, issuedBefore, type, sort]);

  const { data, error, isLoading, mutate } = useSWR<CoinsResponse>(
    `/api/coins?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  useEffect(() => {
    try {
      const storedFavorites = localStorage.getItem("favorites");
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
    } catch (error) {
      console.error("Failed to load favorites from localStorage:", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("favorites", JSON.stringify(favorites));
    } catch (error) {
      console.error("Failed to save favorites to localStorage:", error);
    }
  }, [favorites]);

  const { data: issuersData } = useSWR<CoinsResponse>(
    type === "ALL"
      ? "/api/coins?page=1&pageSize=1"
      : `/api/coins?page=1&pageSize=1&category=${type}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  useEffect(() => {
    if (issuersData?.issuers) {
      setIssuers(issuersData.issuers);
    }
  }, [issuersData]);

  useEffect(() => {
    if (data) {
      setCoins(data.items);
      setTotalCount(data.total);
      setTotalPages(data.totalPages || 1);
      if (data.issuers) {
        setIssuers(data.issuers);
      }
      if (data.page !== page) {
        setPage(data.page);
      }
    }
  }, [data, page]);

  const effectiveTotalPages = Math.max(totalPages, 1);
  const displayPage = Math.max(1, Math.min(page, effectiveTotalPages));

  const rangeLabel = useMemo(() => {
    if (isLoading) {
      return "Loading...";
    }
    if (!totalCount) {
      return "inflation fianlly destroyed not only the dollar, but all forms of currency. or the communists did it, idk. in all seriousness, nothing matches your filters.";
    }
    const start = (displayPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(displayPage * PAGE_SIZE, totalCount);
    return `Showing ${start}-${end} of ${totalCount} coin${
      totalCount === 1 ? "" : "s"
    }`;
  }, [displayPage, isLoading, totalCount]);

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
                <SelectItem value="ALL">
                  <Shrimp />
                  All Types
                </SelectItem>
                <SelectItem value="coin">
                  <Coins />
                  Coins
                </SelectItem>
                <SelectItem value="banknote">
                  <Banknote />
                  Banknotes
                </SelectItem>
                <SelectItem value="exonumia">
                  <SquareStar />
                  Exonumia
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="gap-2 flex flex-col">
            <Label htmlFor="sort">Sort:</Label>
            <Select value={sort} onValueChange={(v) => setSort(v)}>
              <SelectTrigger id="sort" className="w-full">
                <SelectValue placeholder="Select a sorting system" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">
                  <CalendarArrowUp />
                  Newest
                </SelectItem>
                <SelectItem value="oldest">
                  <CalendarArrowDown />
                  Oldest
                </SelectItem>
                <SelectItem value="issuer-asc">
                  <ArrowDownAZ />
                  Issuer A-Z
                </SelectItem>
                <SelectItem value="issuer-desc">
                  <ArrowUpAZ />
                  Issuer Z-A
                </SelectItem>
                <SelectItem value="id-asc">
                  <ArrowDown01 />
                  ID Ascending
                </SelectItem>
                <SelectItem value="id-desc">
                  <ArrowUp01 />
                  ID Descending
                </SelectItem>
                <SelectItem value="title-asc">
                  <ArrowDownAZ />
                  Name A-Z
                </SelectItem>
                <SelectItem value="title-desc">
                  <ArrowUpAZ />
                  Name Z-A
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">{rangeLabel}</p>
          <div className="flex items-center gap-2">
            <Button disabled={isLoading} onClick={() => mutate()}>
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Loading...
                </>
              ) : (
                <>Refresh</>
              )}
            </Button>
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
            {error.message || "Failed to load coins"}
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
                  <CardTitle className="flex items-center">
                    {coin.category === "coin" && (
                      <Coins className="inline mr-2" />
                    )}
                    {coin.category === "banknote" && (
                      <Banknote className="inline mr-2" />
                    )}
                    {coin.category === "exonumia" && (
                      <SquareStar className="inline mr-2" />
                    )}
                    {coin.title || "Untitled coin"}
                    <Button
                      variant={favorites.includes(key) ? "default" : "outline"}
                      className="ml-auto"
                      onClick={() => {
                        setFavorites((prev) => {
                          if (prev.includes(key)) {
                            return prev.filter((fav) => fav !== key);
                          } else {
                            return [...prev, key];
                          }
                        });
                      }}
                    >
                      {favorites.includes(key) ? (
                        <Heart aria-label="Remove from favorites" />
                      ) : (
                        <HeartPlus aria-label="Add to favorites" />
                      )}
                    </Button>
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
                <Link href={`/currencyDetail?id=${coin.id}`}>
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

      <div className="mb-4 space-y-3">
        <div className="flex flex-row gap-2 items-center justify-center pt-8">
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
            {error.message || "Failed to load coins"}
          </div>
        )}
      </div>
    </div>
  );
}
