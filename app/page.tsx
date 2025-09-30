"use client";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import usCoins from "./unitedStatesCoins.json";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

export default function Home() {
  const [isRawDataOpen, setIsRawDataOpen] = useState(false);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">United States Coins</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {usCoins
          .sort((a, b) => (b.maxYear || 0) - (a.maxYear || 0))
          .map((coin) => (
            <Card key={coin.id}>
              <CardHeader>
                <CardTitle>{coin.title}</CardTitle>
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
                    <a
                      href={coin.frontThumbUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Image
                        src={coin.frontThumbUrl}
                        alt={`${coin.title} front`}
                        width={100}
                        height={100}
                        className="mt-2"
                      />
                    </a>
                  ) : (
                    <div className="w-24 h-24 bg-gray-200 flex items-center justify-center">
                      <span className="text-black text-center">
                        No Front Image
                      </span>
                    </div>
                  )}
                  {coin.backThumbUrl !== undefined ? (
                    <a
                      href={coin.backThumbUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Image
                        src={coin.backThumbUrl}
                        alt={`${coin.title} back`}
                        width={100}
                        height={100}
                        className="mt-2"
                      />
                    </a>
                  ) : (
                    <div className="w-24 h-24 bg-gray-200 flex items-center justify-center">
                      <span className="text-black text-center">
                        No Back Image
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>
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
