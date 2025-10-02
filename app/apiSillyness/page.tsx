"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Download,
  Globe2,
} from "lucide-react";

const API_BASE_URL = "https://api.numista.com/v3/types";
const DEFAULT_PAGE_SIZE = 50;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_CONSECUTIVE_429 = 2;

const LANGUAGE_OPTIONS = [
  { label: "English", value: "en" },
  { label: "Español", value: "es" },
  { label: "Français", value: "fr" },
];

const CATEGORY_ALL_VALUE = "__any__";

const CATEGORY_OPTIONS = [
  { label: "Any category", value: CATEGORY_ALL_VALUE },
  { label: "Coin", value: "coin" },
  { label: "Banknote", value: "banknote" },
  { label: "Exonumia", value: "exonumia" },
];

type SearchFormState = {
  lang: string;
  category: string;
  q: string;
  issuer: string;
  catalogue: string;
  number: string;
  ruler: string;
  material: string;
  year: string;
  date: string;
  size: string;
  weight: string;
};

const INITIAL_FORM_STATE: SearchFormState = {
  lang: "en",
  category: "",
  q: "",
  issuer: "",
  catalogue: "",
  number: "",
  ruler: "",
  material: "",
  year: "",
  date: "",
  size: "",
  weight: "",
};

type NumistaIssuer = {
  code?: string;
  name?: string;
};

type NumistaType = {
  id: number;
  title?: string;
  category?: string;
  issuer?: NumistaIssuer;
  min_year?: number;
  max_year?: number;
  obverse_thumbnail?: string;
  reverse_thumbnail?: string;
};

type NumistaTypesResponse = {
  types?: NumistaType[];
  count?: number;
};

type NormalizedType = {
  id: number;
  title: string;
  issuerCode?: string;
  issuerName?: string;
  minYear?: number;
  maxYear?: number;
  frontThumbUrl?: string;
  backThumbUrl?: string;
  category?: string;
};

type RawResponsePage = {
  page: number;
  query: string;
  payload: NumistaTypesResponse;
  context?: {
    issuerCode?: string;
    issuerName?: string;
  };
};

class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeType = (type: NumistaType): NormalizedType => {
  const normalized: NormalizedType = {
    id: type.id,
    title: type.title ?? "",
  };

  if (type.issuer?.code) {
    normalized.issuerCode = type.issuer.code;
  }

  if (type.issuer?.name) {
    normalized.issuerName = type.issuer.name;
  }

  if (typeof type.min_year === "number") {
    normalized.minYear = type.min_year;
  }

  if (typeof type.max_year === "number") {
    normalized.maxYear = type.max_year;
  }

  if (type.obverse_thumbnail) {
    normalized.frontThumbUrl = type.obverse_thumbnail;
  }

  if (type.reverse_thumbnail) {
    normalized.backThumbUrl = type.reverse_thumbnail;
  }

  if (type.category) {
    normalized.category = type.category;
  }

  return normalized;
};

const buildQuery = (page: number, formState: SearchFormState) => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("count", String(DEFAULT_PAGE_SIZE));

  const appendIfValue = (key: keyof SearchFormState, paramName?: string) => {
    const raw = formState[key];
    const trimmed = raw.trim();
    if (trimmed) {
      params.set(paramName ?? key, trimmed);
    }
  };

  appendIfValue("lang");
  appendIfValue("category");
  appendIfValue("q");
  appendIfValue("issuer");
  appendIfValue("catalogue");
  appendIfValue("number");
  appendIfValue("ruler");
  appendIfValue("material");
  appendIfValue("year");
  appendIfValue("date");
  appendIfValue("size");
  appendIfValue("weight");

  return params;
};

export default function Page() {
  const [apiKeysInput, setApiKeysInput] = useState("");
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [activeKeyIndex, setActiveKeyIndex] = useState(0);
  const [formState, setFormState] =
    useState<SearchFormState>(INITIAL_FORM_STATE);
  const [normalizedTypes, setNormalizedTypes] = useState<NormalizedType[]>([]);
  const [rawResponses, setRawResponses] = useState<RawResponsePage[]>([]);
  const [isJsonOpen, setIsJsonOpen] = useState(false);
  const [isRawOpen, setIsRawOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    currentPage: number;
    totalPages: number;
  }>({
    currentPage: 0,
    totalPages: 0,
  });
  const [totalResults, setTotalResults] = useState<number | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const apiKeysRef = useRef<string[]>([]);
  const activeKeyIndexRef = useRef(0);
  const consecutive429CountRef = useRef(0);

  const prepareApiKeys = useCallback(() => {
    const parsedKeys = apiKeysInput
      .split(/[\n,]+/)
      .map((key) => key.trim())
      .filter(Boolean);

    if (!parsedKeys.length) {
      setErrorMessage("Please provide at least one API key before fetching.");
      setStatusMessage("");
      return null;
    }

    apiKeysRef.current = parsedKeys;
    activeKeyIndexRef.current = 0;
    consecutive429CountRef.current = 0;
    setApiKeys(parsedKeys);
    setActiveKeyIndex(0);

    return parsedKeys;
  }, [apiKeysInput]);

  const updateFormField = (field: keyof SearchFormState) => (value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const buildHeaders = useCallback(() => {
    const keys = apiKeysRef.current.length ? apiKeysRef.current : apiKeys;
    const currentKey = keys[activeKeyIndexRef.current]?.trim();

    if (!currentKey) {
      throw new ApiError(
        "At least one API key is required to call the Numista API."
      );
    }

    return {
      "Numista-API-Key": currentKey,
    } satisfies HeadersInit;
  }, [apiKeys]);

  const fetchJsonWithRetry = useCallback(
    async (url: string, contextLabel?: string) => {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const res = await fetch(url, {
          method: "GET",
          headers: buildHeaders(),
        });

        if (res.ok) {
          consecutive429CountRef.current = 0;
          return res.json();
        }

        if (true && attempt < MAX_RETRIES) {
          consecutive429CountRef.current += 1;

          const totalKeys = apiKeysRef.current.length;
          if (
            consecutive429CountRef.current >= MAX_CONSECUTIVE_429 &&
            totalKeys > 1
          ) {
            const previousIndex = activeKeyIndexRef.current;
            const nextIndex = (previousIndex + 1) % totalKeys;
            activeKeyIndexRef.current = nextIndex;
            setActiveKeyIndex(nextIndex);
            consecutive429CountRef.current = 0;
            setStatusMessage(
              `Switching to API key ${
                nextIndex + 1
              }/${totalKeys} after repeated rate limiting.`
            );
            attempt -= 1;
            continue;
          }

          const waitTime = BASE_RETRY_DELAY_MS * attempt;
          const label = contextLabel ?? "Request";
          setStatusMessage(
            `${label} rate limited. Retrying in ${
              Math.round(waitTime / 100) / 10
            }s...`
          );
          await delay(waitTime);
          continue;
        }

        const errorBody = await res.text();
        consecutive429CountRef.current = 0;
        throw new ApiError(
          `Request failed with status ${res.status}. ${errorBody || ""}`.trim(),
          res.status
        );
      }

      throw new ApiError(
        `Request failed after exhausting retries and API keys${
          contextLabel ? ` (${contextLabel})` : ""
        }.`
      );
    },
    [buildHeaders]
  );

  const fetchPage = useCallback(
    async (
      searchState: SearchFormState,
      page: number
    ): Promise<{ response: NumistaTypesResponse; query: string }> => {
      const params = buildQuery(page, searchState);
      const queryString = params.toString();
      const url = `${API_BASE_URL}?${queryString}`;
      const data = (await fetchJsonWithRetry(
        url,
        `Page ${page}`
      )) as NumistaTypesResponse;
      return { response: data, query: queryString };
    },
    [fetchJsonWithRetry]
  );

  const handleFetch = useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      setErrorMessage(null);
      setStatusMessage("Preparing request...");

      if (!prepareApiKeys()) {
        return;
      }

      try {
        buildHeaders();
      } catch (err) {
        setErrorMessage((err as Error).message);
        setStatusMessage("");
        return;
      }

      setIsLoading(true);
      setProgress({ currentPage: 0, totalPages: 0 });
      setTotalResults(null);
      setNormalizedTypes([]);
      setRawResponses([]);

      const aggregator = new Map<number, NormalizedType>();
      const rawPages: RawResponsePage[] = [];
      const searchState = { ...formState };

      try {
        const { response: firstPageData, query } = await fetchPage(
          searchState,
          1
        );

        rawPages.push({ page: 1, query, payload: firstPageData });
        const firstTypes = firstPageData.types ?? [];
        firstTypes.forEach((type) => {
          if (!aggregator.has(type.id)) {
            aggregator.set(type.id, normalizeType(type));
          }
        });

        const total = firstPageData.count ?? firstTypes.length;
        const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));
        setProgress({ currentPage: Math.min(1, totalPages), totalPages });
        setTotalResults(total);
        setStatusMessage(
          `Fetched page 1 of ${totalPages}. ${total} total results.`
        );

        for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
          setStatusMessage(`Fetching page ${currentPage} of ${totalPages}...`);
          const { response: pageData, query: pageQuery } = await fetchPage(
            searchState,
            currentPage
          );
          rawPages.push({
            page: currentPage,
            query: pageQuery,
            payload: pageData,
          });
          (pageData.types ?? []).forEach((type) => {
            if (!aggregator.has(type.id)) {
              aggregator.set(type.id, normalizeType(type));
            }
          });
          setProgress({ currentPage, totalPages });
        }

        const sorted = Array.from(aggregator.values()).sort((a, b) => {
          const issuerComparison = (a.issuerName ?? "").localeCompare(
            b.issuerName ?? ""
          );
          if (issuerComparison !== 0) {
            return issuerComparison;
          }

          const minYearA = a.minYear ?? Number.MAX_SAFE_INTEGER;
          const minYearB = b.minYear ?? Number.MAX_SAFE_INTEGER;
          if (minYearA !== minYearB) {
            return minYearA - minYearB;
          }

          return a.title.localeCompare(b.title);
        });

        setNormalizedTypes(sorted);
        setRawResponses(rawPages);
        setLastUpdatedAt(new Date());
        setStatusMessage(`Completed fetching ${sorted.length} unique types.`);
      } catch (err) {
        const error = err as Error;
        setErrorMessage(error.message || "Unknown error occurred.");
        setStatusMessage("Failed to complete the fetch.");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    },
    [buildHeaders, fetchPage, formState, prepareApiKeys]
  );

  const handleFetchIssuers = useCallback(async () => {
    setErrorMessage(null);
    setStatusMessage("Preparing issuer crawl...");

    if (!prepareApiKeys()) {
      return;
    }

    try {
      buildHeaders();
    } catch (err) {
      setErrorMessage((err as Error).message);
      setStatusMessage("");
      return;
    }

    setIsLoading(true);
    setProgress({ currentPage: 0, totalPages: 0 });
    setTotalResults(null);
    setNormalizedTypes([]);
    setRawResponses([]);

    const aggregator = new Map<number, NormalizedType>();
    const rawPages: RawResponsePage[] = [];
    const searchTemplate = { ...formState };

    try {
      const issuersParams = new URLSearchParams();
      if (searchTemplate.lang.trim()) {
        issuersParams.set("lang", searchTemplate.lang.trim());
      }
      const issuersUrl = `https://api.numista.com/v3/issuers${
        issuersParams.toString() ? `?${issuersParams.toString()}` : ""
      }`;
      const issuersResponse = (await fetchJsonWithRetry(
        issuersUrl,
        "Issuer list"
      )) as {
        issuers?: Array<{ code?: string; name?: string }>;
        count?: number;
      };

      const issuers = issuersResponse?.issuers ?? [];
      if (!issuers.length) {
        setStatusMessage("No issuers returned by the API.");
        setIsLoading(false);
        return;
      }

      let overallCount = 0;

      for (let index = 0; index < issuers.length; index++) {
        const issuer = issuers[index];
        if (!issuer?.code) {
          continue;
        }

        const issuerState: SearchFormState = {
          ...searchTemplate,
          issuer: issuer.code,
        };

        const issuerLabel = issuer.name ?? issuer.code;
        setStatusMessage(
          `Processing issuer ${index + 1}/${issuers.length}: ${issuerLabel}`
        );

        const { response: firstPageData, query } = await fetchPage(
          issuerState,
          1
        );
        rawPages.push({
          page: 1,
          query,
          payload: firstPageData,
          context: { issuerCode: issuer.code, issuerName: issuer.name },
        });
        const firstTypes = firstPageData.types ?? [];
        firstTypes.forEach((type) => {
          if (!aggregator.has(type.id)) {
            aggregator.set(type.id, normalizeType(type));
          }
        });

        const issuerCount = firstPageData.count ?? firstTypes.length;
        overallCount += issuerCount;

        const totalPages = Math.max(
          1,
          Math.ceil(issuerCount / DEFAULT_PAGE_SIZE)
        );
        setProgress({ currentPage: Math.min(1, totalPages), totalPages });

        for (let pageNumber = 2; pageNumber <= totalPages; pageNumber++) {
          setStatusMessage(
            `Processing issuer ${index + 1}/${
              issuers.length
            }: ${issuerLabel} (page ${pageNumber}/${totalPages})`
          );
          const { response: pageData, query: pageQuery } = await fetchPage(
            issuerState,
            pageNumber
          );
          rawPages.push({
            page: pageNumber,
            query: pageQuery,
            payload: pageData,
            context: { issuerCode: issuer.code, issuerName: issuer.name },
          });
          (pageData.types ?? []).forEach((type) => {
            if (!aggregator.has(type.id)) {
              aggregator.set(type.id, normalizeType(type));
            }
          });
          setProgress({ currentPage: pageNumber, totalPages });
        }
      }

      const sorted = Array.from(aggregator.values()).sort((a, b) => {
        const issuerComparison = (a.issuerName ?? "").localeCompare(
          b.issuerName ?? ""
        );
        if (issuerComparison !== 0) {
          return issuerComparison;
        }

        const minYearA = a.minYear ?? Number.MAX_SAFE_INTEGER;
        const minYearB = b.minYear ?? Number.MAX_SAFE_INTEGER;
        if (minYearA !== minYearB) {
          return minYearA - minYearB;
        }

        return a.title.localeCompare(b.title);
      });

      setNormalizedTypes(sorted);
      setRawResponses(rawPages);
      setTotalResults(overallCount);
      setLastUpdatedAt(new Date());
      setStatusMessage(
        `Completed issuer crawl across ${issuers.length} issuers. Collected ${sorted.length} unique types.`
      );
    } catch (err) {
      const error = err as Error;
      setErrorMessage(
        error.message || "Unknown error occurred during issuer crawl."
      );
      setStatusMessage("Failed to complete the issuer crawl.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [buildHeaders, fetchJsonWithRetry, fetchPage, formState, prepareApiKeys]);

  const handleReset = () => {
    setFormState(INITIAL_FORM_STATE);
    setNormalizedTypes([]);
    setRawResponses([]);
    setStatusMessage("");
    setErrorMessage(null);
    setProgress({ currentPage: 0, totalPages: 0 });
    setTotalResults(null);
    setLastUpdatedAt(null);
    activeKeyIndexRef.current = 0;
    consecutive429CountRef.current = 0;
    setActiveKeyIndex(0);
  };

  const normalizedJson = useMemo(() => {
    if (!normalizedTypes.length) {
      return "";
    }
    return JSON.stringify(normalizedTypes, null, 2);
  }, [normalizedTypes]);

  const rawJson = useMemo(() => {
    if (!rawResponses.length) {
      return "";
    }
    return JSON.stringify(rawResponses, null, 2);
  }, [rawResponses]);

  const handleCopyJson = async () => {
    if (!normalizedJson) {
      return;
    }

    try {
      await navigator.clipboard.writeText(normalizedJson);
      setStatusMessage("Normalized JSON copied to clipboard.");
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(`Failed to copy JSON: ${(err as Error).message}`);
    }
  };

  const handleDownloadJson = () => {
    if (!normalizedJson) {
      return;
    }

    const blob = new Blob([normalizedJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `numista-types-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusMessage("Downloaded normalized JSON.");
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Numista Type Exporter</h1>
        <p className="text-sm text-muted-foreground">
          Build a query against <span className="font-mono">/types</span>, fetch
          every page, and export the results in the same shape as{" "}
          <span className="font-mono">unitedStatesCoins.json</span>.
        </p>
      </section>

      <form onSubmit={handleFetch} className="space-y-6">
        <div className="grid gap-4 rounded-lg border bg-card p-4 shadow-sm">
          <div className="grid gap-2">
            <Label htmlFor="api-keys">Numista API keys</Label>
            <textarea
              id="api-keys"
              placeholder="Enter one API key per line. Keys will rotate after repeated 429 responses."
              value={apiKeysInput}
              onChange={(event) => setApiKeysInput(event.target.value)}
              className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className="text-xs text-muted-foreground">
              Provide at least one key. When Numista responds with HTTP 429
              several times in a row, the next key in the list is used
              automatically.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={formState.lang}
                onValueChange={updateFormField("lang")}
              >
                <SelectTrigger id="language" className="w-full">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formState.category || CATEGORY_ALL_VALUE}
                onValueChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    category: value === CATEGORY_ALL_VALUE ? "" : value,
                  }))
                }
              >
                <SelectTrigger id="category" className="w-full">
                  <SelectValue placeholder="Any category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="q">Search query</Label>
              <Input
                id="q"
                placeholder="e.g., dollar"
                value={formState.q}
                onChange={(event) => updateFormField("q")(event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="issuer">Issuer code</Label>
              <Input
                id="issuer"
                placeholder="e.g., united_states"
                value={formState.issuer}
                onChange={(event) =>
                  updateFormField("issuer")(event.target.value)
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="catalogue">Catalogue ID</Label>
              <Input
                id="catalogue"
                placeholder="Numeric catalogue ID"
                value={formState.catalogue}
                onChange={(event) =>
                  updateFormField("catalogue")(event.target.value)
                }
                inputMode="numeric"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="number">Catalogue number</Label>
              <Input
                id="number"
                placeholder="Catalogue number"
                value={formState.number}
                onChange={(event) =>
                  updateFormField("number")(event.target.value)
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ruler">Ruler ID</Label>
              <Input
                id="ruler"
                placeholder="Numeric ruler ID"
                value={formState.ruler}
                onChange={(event) =>
                  updateFormField("ruler")(event.target.value)
                }
                inputMode="numeric"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="material">Material ID</Label>
              <Input
                id="material"
                placeholder="Numeric material ID"
                value={formState.material}
                onChange={(event) =>
                  updateFormField("material")(event.target.value)
                }
                inputMode="numeric"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="year">Year or range</Label>
              <Input
                id="year"
                placeholder="e.g., 1900 or 1900-1910"
                value={formState.year}
                onChange={(event) =>
                  updateFormField("year")(event.target.value)
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="date">Gregorian year or range</Label>
              <Input
                id="date"
                placeholder="e.g., 1850 or 1800-1850"
                value={formState.date}
                onChange={(event) =>
                  updateFormField("date")(event.target.value)
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="size">Diameter / size (mm)</Label>
              <Input
                id="size"
                placeholder="e.g., 25 or 20-30"
                value={formState.size}
                onChange={(event) =>
                  updateFormField("size")(event.target.value)
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="weight">Weight (g)</Label>
              <Input
                id="weight"
                placeholder="e.g., 31.1 or 10-12"
                value={formState.weight}
                onChange={(event) =>
                  updateFormField("weight")(event.target.value)
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isLoading}>
              <ClipboardList className="size-4" />
              {isLoading ? "Fetching types..." : "Fetch all pages"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleFetchIssuers}
              disabled={isLoading}
            >
              <Globe2 className="size-4" />
              Fetch by issuers
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isLoading}
            >
              Reset form & results
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyJson}
              disabled={!normalizedJson || isLoading}
            >
              <ClipboardCheck className="size-4" />
              Copy JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadJson}
              disabled={!normalizedJson || isLoading}
            >
              <Download className="size-4" />
              Download JSON
            </Button>
          </div>
        </div>
      </form>

      <section className="grid gap-2 rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Status</h2>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Progress</dt>
            <dd>
              {progress.totalPages > 0
                ? `${progress.currentPage}/${progress.totalPages}`
                : "Waiting"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Total results</dt>
            <dd>{totalResults ?? "Unknown"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">API keys configured</dt>
            <dd>{apiKeys.length}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Active API key</dt>
            <dd>
              {apiKeys.length
                ? `${Math.min(activeKeyIndex + 1, apiKeys.length)}/${
                    apiKeys.length
                  }`
                : "None"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Unique types collected</dt>
            <dd>{normalizedTypes.length}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Last updated</dt>
            <dd>
              {lastUpdatedAt ? lastUpdatedAt.toLocaleString() : "No data yet"}
            </dd>
          </div>
        </dl>
        {statusMessage && (
          <p className="text-sm text-muted-foreground">{statusMessage}</p>
        )}
        {errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}
      </section>

      <Collapsible open={isJsonOpen} onOpenChange={setIsJsonOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            Normalized JSON export
            <ChevronDown
              className={`transition-transform ${
                isJsonOpen ? "rotate-180" : ""
              }`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="rounded-lg border bg-card p-4 shadow-sm">
          {normalizedJson ? (
            <>
              <p className="mb-2 text-sm text-muted-foreground">
                Ready-to-ingest JSON formatted like{" "}
                <span className="font-mono">unitedStatesCoins.json</span>.
              </p>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs">
                {normalizedJson}
              </pre>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized data yet. Fetch results to populate this section.
            </p>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={isRawOpen} onOpenChange={setIsRawOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            Raw API responses
            <ChevronDown
              className={`transition-transform ${
                isRawOpen ? "rotate-180" : ""
              }`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="rounded-lg border bg-card p-4 shadow-sm">
          {rawJson ? (
            <>
              <p className="mb-2 text-sm text-muted-foreground">
                Each entry includes the queried parameters and the response
                payload for auditing.
              </p>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs">
                {rawJson}
              </pre>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No raw responses captured yet.
            </p>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
