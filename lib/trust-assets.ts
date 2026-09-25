export interface TrustAssetProfile {
  slug: "sut" | "msq";
  name: string;
  ticker: string;
  project: string;
  description: string;
  suggestedChainId: number | null;
  suggestedAddress: string | null;
  referenceState: "audit-reference" | "address-unconfirmed";
  sources: { label: string; url: string }[];
  useCases: string[];
}

// Candidate details are leads for staff review, not pre-verified production facts.
// An approval in the staff workflow records a human's confirmation of chain/address.
export const TRUST_ASSETS: TrustAssetProfile[] = [
  {
    slug: "sut",
    name: "SUPER TRUST",
    ticker: "SUT",
    project: "SuperTrust",
    description: "Candidate profile for the SUT Polygon token and related SuperTrust services.",
    suggestedChainId: 137,
    suggestedAddress: "0x98965474ecbec2f532f1f780ee37b0b05f77ca55",
    referenceState: "audit-reference",
    sources: [
      { label: "2024 smart-contract audit (reference only)", url: "https://supertrust.club/wp-content/uploads/2024/12/SUT_%EC%8A%A4%EB%A7%88%ED%8A%B8%EC%BB%A8%ED%8A%B8%EB%9E%99%ED%8A%B8-%EA%B0%90%EC%82%AC%EB%B3%B4%EA%B3%A0%EC%84%9C.pdf" },
      { label: "SuperTrust product", url: "https://app.supertrust.club/" },
    ],
    useCases: ["SUT token contract", "DeCT and SuperSave integrations", "Treasury and operational wallets"],
  },
  {
    slug: "msq",
    name: "MSQUARE GLOBAL",
    ticker: "MSQ",
    project: "MSQUARE",
    description: "MSQ contract address and network require confirmation from an authorized company source before review.",
    suggestedChainId: null,
    suggestedAddress: null,
    referenceState: "address-unconfirmed",
    sources: [
      { label: "CoinMarketCap project profile (discovery reference)", url: "https://coinmarketcap.com/currencies/msquare-global/" },
    ],
    useCases: ["MSQ token contracts", "Connected real-economy services", "Treasury and operational wallets"],
  },
];

export function getTrustAsset(slug: string) {
  return TRUST_ASSETS.find((asset) => asset.slug === slug);
}
