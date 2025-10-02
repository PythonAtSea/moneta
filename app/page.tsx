"use client";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import usCoins from "./unitedStatesCoins.json";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
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

export default function Home() {
  const [isRawDataOpen, setIsRawDataOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedIssuer, setSelectedIssuer] = useState("ALL");
  const [issuedBefore, setIssuedBefore] = useState("");
  const [issuedAfter, setIssuedAfter] = useState("");
  const parseYear = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const issuers = Array.from(
    (() => {
      const m = new Map<string, string>();
      usCoins.forEach((c: { issuerCode?: string; issuerName?: string }) => {
        if (c && c.issuerCode) {
          m.set(c.issuerCode, c.issuerName ?? String(c.issuerCode));
        }
      });
      return m;
    })()
  ).map(([code, name]) => ({ code, name }));

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
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {usCoins
          .map((coin) => ({
            ...coin,
            title: coin.title ?? "",
          }))
          .sort((a, b) => (b.maxYear || 0) - (a.maxYear || 0))
          .filter((coin) => {
            const issuedAfterValue = parseYear(issuedAfter);
            const issuedBeforeValue = parseYear(issuedBefore);
            const matchesSearch = coin.title
              .toLowerCase()
              .includes(searchText.toLowerCase());
            const matchesIssuer =
              selectedIssuer && selectedIssuer !== "ALL"
                ? coin.issuerCode === selectedIssuer
                : true;
            const matchesIssuedAfter =
              issuedAfterValue !== undefined
                ? (coin.maxYear ?? 9999) >= issuedAfterValue
                : true;
            const matchesIssuedBefore =
              issuedBeforeValue !== undefined
                ? (coin.minYear ?? 0) <= issuedBeforeValue
                : true;
            return (
              matchesSearch &&
              matchesIssuer &&
              matchesIssuedAfter &&
              matchesIssuedBefore
            );
          })
          .map((coin) => (
            <Card key={coin.id} className="flex flex-col h-full">
              <CardHeader>
                <CardTitle>{coin.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p>
                  Issued by {coin.issuerName}
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
                  {coin.frontThumbUrl !== undefined ? (
                    <Image
                      src={coin.frontThumbUrl}
                      alt={`${coin.title} front`}
                      width={100}
                      height={100}
                      className="mt-2"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-200 flex items-center justify-center">
                      <span className="text-black text-center">
                        No Front Image
                      </span>
                    </div>
                  )}
                  {coin.backThumbUrl !== undefined ? (
                    <Image
                      src={coin.backThumbUrl}
                      alt={`${coin.title} back`}
                      width={100}
                      height={100}
                      className="mt-2"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-200 flex items-center justify-center">
                      <span className="text-black text-center">
                        No Back Image
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
              <Link href={`/coinDetail?id=${coin.id}`}>
                <CardFooter className="mt-auto border-t">
                  View Details
                  <ChevronRight className="ml-2" />
                </CardFooter>
              </Link>
            </Card>
          ))}
      </div>
      <Collapsible open={isRawDataOpen} onOpenChange={setIsRawDataOpen}>
        <CollapsibleTrigger asChild>
          <Button className="w-full mt-4" variant="ghost">
            Raw Data
            <ChevronDown
              className={`transition-transform ${
                isRawDataOpen ? "rotate-180" : ""
              }`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <p>Total items: {usCoins && usCoins.length}</p>
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(usCoins, null, 2)}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
