import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { MarketDashboard } from "@/components/market-dashboard";
import { ProtectedPage } from "@/components/auth-provider";

export default function MarketsPage() {
  return <><SiteHeader /><ProtectedPage><main className="container markets-wrap"><MarketDashboard /></main></ProtectedPage><SiteFooter /></>;
}
