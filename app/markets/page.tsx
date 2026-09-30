import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { MarketDashboard } from "@/components/market-dashboard";

export default function MarketsPage() {
  return <><SiteHeader /><main className="container markets-wrap"><MarketDashboard /></main><SiteFooter /></>;
}
