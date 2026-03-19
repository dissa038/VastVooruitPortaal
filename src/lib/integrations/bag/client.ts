/**
 * BAG API (Kadaster) — Basisregistratie Adressen en Gebouwen
 *
 * Postcode + huisnummer lookup → returns building data.
 * Free API with API key.
 *
 * Required environment variables:
 * - BAG_API_KEY: Kadaster API key
 *
 * Docs: https://www.kadaster.nl/zakelijk/producten/adressen-en-gebouwen/bag-api-individuele-bevragingen
 */

const BAG_BASE_URL =
  "https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2";

export interface BagAddress {
  verblijfsobjectId: string;
  pandId: string;
  oppervlakte: number;
  bouwjaar: number;
  gebruiksdoel: string;
  straat: string;
  huisnummer: string;
  huisnummertoevoeging?: string;
  postcode: string;
  woonplaats: string;
}

export async function lookupAddress(
  postcode: string,
  huisnummer: string,
  huisnummertoevoeging?: string
): Promise<BagAddress | null> {
  const apiKey = process.env.BAG_API_KEY;
  if (!apiKey) {
    throw new Error("Missing BAG_API_KEY");
  }

  // Step 1: Find adres
  const cleanPostcode = postcode.replace(/\s/g, "").toUpperCase();
  const params = new URLSearchParams({
    postcode: cleanPostcode,
    huisnummer,
  });
  if (huisnummertoevoeging) {
    params.set("huisnummertoevoeging", huisnummertoevoeging);
  }

  const adresRes = await fetch(
    `${BAG_BASE_URL}/adressen?${params.toString()}`,
    {
      headers: {
        "X-Api-Key": apiKey,
        Accept: "application/hal+json",
        "Accept-Crs": "epsg:28992",
      },
    }
  );

  if (!adresRes.ok) return null;

  const adresData = await adresRes.json();
  const adressen = adresData?._embedded?.adressen;
  if (!adressen?.length) return null;

  const adres = adressen[0];

  // Step 2: Get verblijfsobject for oppervlakte
  const nummeraanduidingId = adres.nummeraanduidingIdentificatie;
  const voRes = await fetch(
    `${BAG_BASE_URL}/verblijfsobjecten?nummeraanduidingIdentificatie=${nummeraanduidingId}`,
    {
      headers: {
        "X-Api-Key": apiKey,
        Accept: "application/hal+json",
        "Accept-Crs": "epsg:28992",
      },
    }
  );

  let oppervlakte = 0;
  let gebruiksdoel = "";
  let verblijfsobjectId = "";
  let pandId = "";

  if (voRes.ok) {
    const voData = await voRes.json();
    const vo = voData?._embedded?.verblijfsobjecten?.[0];
    if (vo) {
      oppervlakte = vo.oppervlakte ?? 0;
      gebruiksdoel = vo.gebruiksdoelen?.[0] ?? "";
      verblijfsobjectId = vo.identificatie ?? "";
      pandId = vo.pandIdentificaties?.[0] ?? "";
    }
  }

  // Step 3: Get pand for bouwjaar
  let bouwjaar = 0;
  if (pandId) {
    const pandRes = await fetch(`${BAG_BASE_URL}/panden/${pandId}`, {
      headers: {
        "X-Api-Key": apiKey,
        Accept: "application/hal+json",
        "Accept-Crs": "epsg:28992",
      },
    });
    if (pandRes.ok) {
      const pandData = await pandRes.json();
      bouwjaar = pandData?.oorspronkelijkBouwjaar ?? 0;
    }
  }

  return {
    verblijfsobjectId,
    pandId,
    oppervlakte,
    bouwjaar,
    gebruiksdoel,
    straat: adres.openbareRuimteNaam ?? "",
    huisnummer: String(adres.huisnummer ?? huisnummer),
    huisnummertoevoeging: adres.huisnummertoevoeging,
    postcode: cleanPostcode,
    woonplaats: adres.woonplaatsNaam ?? "",
  };
}
