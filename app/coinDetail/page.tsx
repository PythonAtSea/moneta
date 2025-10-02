"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Loader2, SquareArrowOutUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type CoinSide = {
  engravers?: [string];
  designers?: [string];
  description?: string;
  lettering?: string;
  lettering_scripts?: { name: string }[];
  unabridged_legend?: string;
  lettering_translation?: string;
  picture?: string;
  thumbnail?: string;
  picture_copyright?: string;
  picture_copyright_url?: string;
  picture_license_name?: string;
  picture_license_url?: string;
};

type Issuer = {
  name: string;
  code: string;
};

type Entity = {
  id: string;
  name: string;
  wikidata_id?: string;
};

type Currency = {
  id: string;
  name: string;
  full_name: string;
};

type CoinValue = {
  text?: string;
  numeric_value?: number;
  numerator?: number;
  denominator?: number;
  currency?: Currency;
};

type RulerGroup = {
  id: string;
  name: string;
};

type Ruler = {
  id: string;
  name: string;
  wikidata_id?: string;
  nomisna_id?: string;
  group?: RulerGroup;
};

type Demonetization = {
  is_demonetized: boolean;
  demonetization_date?: string;
};

type Composition = {
  text?: string;
};

type Technique = {
  text?: string;
};

type Mint = {
  id: string;
  name: string;
};

type Printer = {
  id: string;
  name: string;
};

type RelatedType = {
  id: string;
  title: string;
  category?: string;
  issuer?: { id: string; name: string };
  min_year?: number;
  max_year?: number;
};

type CatalogueReference = {
  catalogue: { id: string; code: string };
  number: number;
};

type CoinData = {
  title: string;
  url?: string;
  id: string;
  category: string;
  issuer?: Issuer;
  issuing_entity?: Entity;
  secondary_issuing_entity?: Entity;
  min_year?: number;
  max_year?: number;
  type?: string;
  value?: CoinValue;
  ruler?: Ruler[];
  demonetization?: Demonetization;
  shape?: string;
  composition?: Composition;
  technique?: Technique;
  weight?: number;
  size?: number;
  size2?: number;
  thickness?: number;
  orientation?: string;
  obverse?: CoinSide;
  reverse?: CoinSide;
  edge?: CoinSide;
  watermark?: CoinSide;
  mints?: [Mint];
  printers?: [Printer];
  series?: string;
  commemorated_topic?: string;
  comments?: string;
  related_types?: [RelatedType];
  tags: [string];
  references?: [CatalogueReference];
};

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CoinData | null>(null);
  const [apiKey, setApiKey] = useState("");
  const searchParams = useSearchParams();
  const [shareIcon, setShareIcon] = useState(<Copy />);

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) return;

    setLoading(true);
    fetch("https://api.numista.com/v3/types/" + id, {
      method: "GET",
      headers: {
        "Numista-API-Key": process.env.NEXT_PUBLIC_NUMISTA_API_KEY || apiKey,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        setData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setLoading(false);
      });
  }, [searchParams, apiKey]);

  return (
    <div
      className={`mx-auto w-full max-w-[600px] ${
        !loading && "border-l-6 border-border"
      } pl-8`}
    >
      <div className="flex">
        {!process.env.NEXT_PUBLIC_NUMISTA_API_KEY && !loading && (
          <Input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter API Key"
          />
        )}
        {loading ? (
          <div className="flex-1 flex justify-center items-center">
            <Loader2 className="animate-spin h-6 w-6" />
          </div>
        ) : (
          data && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                {data.title && (
                  <h1 className="text-5xl font-extrabold text-white">
                    {data.title}
                  </h1>
                )}
                {data.url && (
                  <a
                    href={data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline flex flex-row items-center gap-1"
                  >
                    View on Numista
                    <SquareArrowOutUpRight size={16} />
                  </a>
                )}
              </div>
              {data.issuer && (
                <div className="flex flex-col gap-1 mb-8">
                  <h2 className="text-3xl font-semibold text-white mb-4 mt-8">
                    Basic information
                  </h2>
                  <p>
                    <span className="font-semibold text-gray-400">
                      ISSUED BY:
                    </span>{" "}
                    {data.issuer.name}
                  </p>
                  {data.issuing_entity && (
                    <p>
                      <span className="font-semibold text-gray-400">
                        ISSUING ENTITY:
                      </span>{" "}
                      {data.issuing_entity.name}
                      {data.issuing_entity.wikidata_id && (
                        <>
                          {" "}
                          <a
                            href={`https://www.wikidata.org/wiki/${data.issuing_entity.wikidata_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            ({data.issuing_entity.wikidata_id})
                          </a>
                        </>
                      )}
                    </p>
                  )}
                  {data.secondary_issuing_entity && (
                    <p>
                      <span className="font-semibold text-gray-400">
                        SECONDARY ISSUING ENTITY:
                      </span>{" "}
                      {data.secondary_issuing_entity.name}
                      {data.secondary_issuing_entity.wikidata_id && (
                        <>
                          {" "}
                          <a
                            href={`https://www.wikidata.org/wiki/${data.secondary_issuing_entity.wikidata_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            ({data.secondary_issuing_entity.wikidata_id})
                          </a>
                        </>
                      )}
                    </p>
                  )}
                  {data.min_year &&
                    data.max_year &&
                    data.min_year === data.max_year && (
                      <p>
                        <span className="font-semibold text-gray-400">
                          YEAR:
                        </span>{" "}
                        {data.min_year}
                      </p>
                    )}
                  {data.min_year &&
                    data.max_year &&
                    data.min_year !== data.max_year && (
                      <p>
                        <span className="font-semibold text-gray-400">
                          YEARS:
                        </span>{" "}
                        {data.min_year} - {data.max_year}
                      </p>
                    )}
                  {data.value?.text && (
                    <p>
                      <span className="font-semibold text-gray-400">
                        VALUE:
                      </span>{" "}
                      {data.value.text} (
                      {data.value.numeric_value !== undefined
                        ? data.value.numeric_value
                        : data.value.numerator !== undefined && (
                            <>
                              {data.value.numerator}
                              {data.value.denominator !== undefined && (
                                <> / {data.value.denominator}</>
                              )}
                            </>
                          )}{" "}
                      {data.value.currency?.full_name && (
                        <> {data.value.currency.full_name}</>
                      )}
                      )
                    </p>
                  )}
                  {data.demonetization?.is_demonetized && (
                    <p>
                      <span className="font-semibold text-gray-400">
                        DEMONETIZED:
                      </span>{" "}
                      {data.demonetization.demonetization_date
                        ? data.demonetization.demonetization_date
                        : "Unknown date"}
                    </p>
                  )}
                  {data?.ruler && (
                    <p>
                      <span className="font-semibold text-gray-400">
                        {data.ruler.length > 1
                          ? "ISSUING RULERS:"
                          : "ISSUING RULER:"}
                      </span>{" "}
                      {data.ruler?.map((r, i) => (
                        <span key={r.id ?? i}>
                          {r.name}
                          {r.wikidata_id && (
                            <>
                              {" "}
                              <a
                                href={`https://www.wikidata.org/wiki/${r.wikidata_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                              >
                                ({r.wikidata_id})
                              </a>
                            </>
                          )}
                          {i < data.ruler!.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </p>
                  )}
                  {data?.mints && (
                    <p>
                      <span className="font-semibold text-gray-400">
                        {data.mints.length > 1 ? "MINTS:" : "MINT:"}{" "}
                      </span>
                      {data.mints?.map((m) => m.name).join(", ")}
                    </p>
                  )}
                  {data?.printers && (
                    <p>
                      <span className="font-semibold text-gray-400">
                        {data.printers.length > 1 ? "PRINTERS:" : "PRINTER:"}{" "}
                      </span>
                      {data.printers?.map((p) => p.name).join(", ")}
                    </p>
                  )}
                  {data.series && (
                    <p>
                      <span className="font-semibold text-gray-400">
                        SERIES:
                      </span>{" "}
                      {data.series}
                    </p>
                  )}
                  {data.commemorated_topic && (
                    <p>
                      <span className="font-semibold text-gray-400">
                        COMMEMORATED TOPIC:
                      </span>{" "}
                      {data.commemorated_topic}
                    </p>
                  )}
                  {data.tags && data.tags.length > 0 && (
                    <p>
                      <span className="font-semibold text-gray-400">
                        {data.tags.length > 1 ? "TAGS:" : "TAG:"}
                      </span>{" "}
                      {data.tags.join(", ")}
                    </p>
                  )}
                </div>
              )}
              {data.size || data.size2 || data.weight || data.thickness ? (
                <div className="flex flex-col gap-1 mb-8">
                  <h2 className="text-3xl font-semibold text-white mb-4">
                    Physical specifications
                  </h2>
                  {data.size && !data.size2 && (
                    <p>
                      <span className="font-semibold text-gray-400">
                        DIAMETER:
                      </span>{" "}
                      {data.size} mm
                    </p>
                  )}
                  {data.size && data.size2 && (
                    <p>
                      <span className="font-semibold text-gray-400">SIZE:</span>{" "}
                      {data.size} mm X {data.size2} mm
                    </p>
                  )}
                  {data.thickness && (
                    <p>
                      <span className="font-semibold text-gray-400">
                        THICKNESS:
                      </span>{" "}
                      {data.thickness} mm
                    </p>
                  )}
                  {data.weight && (
                    <p>
                      <span className="font-semibold text-gray-400">
                        WEIGHT:
                      </span>{" "}
                      {data.weight} g
                    </p>
                  )}
                  {data.composition?.text && (
                    <p>
                      <span className="font-semibold text-gray-400">
                        COMPOSITION:
                      </span>{" "}
                      {data.composition.text}
                    </p>
                  )}
                  {data.technique?.text && (
                    <p>
                      <span className="font-semibold text-gray-400">
                        TECHNIQUE:
                      </span>{" "}
                      {data.technique.text}
                    </p>
                  )}
                  {data.shape && (
                    <p>
                      <span className="font-semibold text-gray-400">
                        SHAPE:
                      </span>{" "}
                      {data.shape}
                    </p>
                  )}
                </div>
              ) : null}

              {(() => {
                const photoSections = [
                  { key: "obverse", side: data.obverse, title: "Front" },
                  { key: "reverse", side: data.reverse, title: "Back" },
                  { key: "edge", side: data.edge, title: "Edge" },
                  {
                    key: "watermark",
                    side: data.watermark,
                    title: "Watermark",
                  },
                ].filter((s) => s.side && s.side.picture);

                if (photoSections.length === 0) return null;

                return (
                  <>
                    <h1 className="text-3xl font-semibold text-white">
                      Side Details
                    </h1>
                    {photoSections.map((section) => (
                      <div key={section.key} className="flex flex-col gap-2">
                        <h3 className="text-xl font-semibold text-white">
                          {section.title}
                        </h3>
                        <a
                          href={section.side!.picture}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-fit"
                        >
                          <Image
                            src={section.side!.picture!}
                            alt={
                              section.side!.description ||
                              data.title + " " + section.title.toLowerCase()
                            }
                            width={600}
                            height={600}
                          />
                        </a>
                        <a
                          href={section.side!.picture_copyright_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-fit text-gray-400 text-sm -mt-1"
                        >
                          © {section.side?.picture_copyright}
                        </a>
                        <p>
                          <span className="font-semibold text-gray-400">
                            DESCRIPTION:
                          </span>{" "}
                          {section.side!.description ||
                            data.title + " " + section.title.toLowerCase()}
                        </p>
                        {section.side?.lettering_scripts &&
                        section.side.lettering_scripts.length > 0 ? (
                          <p>
                            <span className="font-semibold text-gray-400">
                              {section.side.lettering_scripts.length > 1
                                ? "SCRIPTS:"
                                : "SCRIPT:"}
                            </span>{" "}
                            {section.side.lettering_scripts
                              .map((ls) => ls.name)
                              .join(", ")}
                          </p>
                        ) : null}
                        {section.side?.lettering && (
                          <p>
                            <span className="font-semibold text-gray-400">
                              LETTERING:
                            </span>{" "}
                            {section.side.lettering}
                          </p>
                        )}
                        {section.side?.lettering_translation && (
                          <p>
                            <span className="font-semibold text-gray-400">
                              TRANSLATION:
                            </span>{" "}
                            {section.side.lettering_translation}
                          </p>
                        )}
                        {section.side?.engravers &&
                          section.side.engravers.length > 0 && (
                            <p>
                              <span className="font-semibold text-gray-400">
                                {section.side?.engravers.length > 1
                                  ? "ENGRAVERS:"
                                  : "ENGRAVER:"}
                              </span>{" "}
                              {section.side.engravers.join(", ")}
                            </p>
                          )}
                        {section.side?.designers &&
                          section.side?.designers.length > 0 && (
                            <p>
                              <span className="font-semibold text-gray-400">
                                {section.side?.designers.length > 1
                                  ? "DESIGNERS:"
                                  : "DESIGNER:"}
                              </span>{" "}
                              {section.side.designers.join(", ")}
                            </p>
                          )}
                      </div>
                    ))}
                  </>
                );
              })()}
              {data.related_types && data.related_types.length > 0 && (
                <>
                  <h2 className="text-3xl font-semibold text-white mt-8">
                    Related Coins
                  </h2>
                  <div className="flex flex-row flex-wrap gap-2">
                    {data.related_types?.map((coin) => (
                      <Link
                        key={coin.id}
                        href={`/coinDetail?id=${coin.id}`}
                        className="text-blue-500 hover:underline font-medium mr-2"
                      >
                        {coin.title}
                      </Link>
                    ))}
                  </div>
                </>
              )}
              {data && data.comments && (
                <>
                  <h2 className="text-3xl font-semibold text-white mb-4 mt-8">
                    Comments
                  </h2>
                  <p>
                    {data.comments
                      ? data.comments.replace(/<[^>]*>/g, "")
                      : null}
                  </p>
                </>
              )}
              <h2 className="text-3xl font-semibold text-white mb-4 mt-8">
                Share Link
              </h2>
              <div className="flex flex-row gap-4">
                <Input
                  readOnly
                  value={
                    typeof window !== "undefined" ? window.location.href : ""
                  }
                />
                <Button
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      navigator.clipboard.writeText(window.location.href);
                      setShareIcon(<Check />);
                      setTimeout(() => setShareIcon(<Copy />), 2000);
                    }
                  }}
                >
                  {shareIcon}
                </Button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
