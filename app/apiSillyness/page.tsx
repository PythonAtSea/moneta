"use client";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";

export default function Page() {
  const [apiKey, setApiKey] = useState("");
  const [response, setResponse] = useState("");
  const [types, setTypes] = useState<
    Array<{
      id: string;
      title: string;
      issuerCode: string;
      issuerName: string;
      minYear: string;
      maxYear: string;
      frontThumbUrl: string;
      backThumbUrl: string;
      category: string;
    }>
  >([]);
  const [jsonData, setJsonData] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isRawResponseOpen, setIsRawResponseOpen] = useState(false);
  const [isJsonExportOpen, setIsJsonExportOpen] = useState(false);
  const MAX_PAGES = 35;
  const handleSubmit = async (page = "1", isPartOfScrape = false) => {
    if (!isPartOfScrape) {
      setIsLoading(true);
    }

    const params = new URLSearchParams({
      lang: "en",
      page: page,
      issuer: "united-states",
      category: "coin",
    });

    try {
      const res = await fetch(`https://api.numista.com/v3/types?${params}`, {
        method: "GET",
        headers: {
          "Numista-API-Key": apiKey,
        },
      });

      console.log(res);
      const data = await res.json();

      if (!isPartOfScrape) {
        setResponse(JSON.stringify(data, null, 2));
      }
      console.log(data);

      for (const item of data.types) {
        const exportItem = {
          id: item.id,
          title: item.title,
          issuerCode: item.issuer.code,
          issuerName: item.issuer.name,
          minYear: item.min_year,
          maxYear: item.max_year,
          frontThumbUrl: item.obverse_thumbnail,
          backThumbUrl: item.reverse_thumbnail,
          category: item.category,
        };
        setTypes((prev) => [...prev, exportItem]);
      }
    } catch (err) {
      console.error(err);
      setResponse("Error: " + (err as Error).message);
    } finally {
      if (!isPartOfScrape) {
        setIsLoading(false);
      }
    }
  };

  const handleSave = () => {
    setJsonData(JSON.stringify(types, null, 2));
  };

  const handleScrape = async () => {
    setIsScraping(true);
    setTypes([]);
    setJsonData("");
    setCurrentPage(0);

    try {
      for (let page = 1; page <= MAX_PAGES; page++) {
        setCurrentPage(page);
        await handleSubmit(page.toString(), true);
      }
    } catch (err) {
      console.error("Scraping error:", err);
    } finally {
      setIsScraping(false);
      setCurrentPage(0);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-[600px] justify-self-center">
      <Input
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="Enter API Key"
      />
      <Button onClick={() => handleSubmit()} disabled={isLoading || isScraping}>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        Send Request!
      </Button>
      <Button onClick={handleSave} disabled={isScraping}>
        Save to JSON
      </Button>
      <Button onClick={handleScrape} disabled={isLoading || isScraping}>
        {isScraping && <Loader2 className="h-4 w-4 animate-spin" />}
        {isScraping
          ? `Scraping... (Page ${currentPage}/${MAX_PAGES})`
          : "Scrape!"}
      </Button>
      <Collapsible open={isRawResponseOpen} onOpenChange={setIsRawResponseOpen}>
        <CollapsibleTrigger asChild>
          <Button className="w-full mt-4" variant="ghost">
            Raw response
            <ChevronDown
              className={`transition-transform ${
                isRawResponseOpen ? "rotate-180" : ""
              }`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="whitespace-pre-wrap">{response}</pre>
        </CollapsibleContent>
      </Collapsible>
      <Collapsible open={isJsonExportOpen} onOpenChange={setIsJsonExportOpen}>
        <CollapsibleTrigger asChild>
          <Button className="w-full mt-4" variant="ghost">
            JSON Export
            <ChevronDown
              className={`transition-transform ${
                isJsonExportOpen ? "rotate-180" : ""
              }`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <p>Total items: {jsonData && JSON.parse(jsonData).length}</p>
          <pre className="whitespace-pre-wrap">{jsonData}</pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
