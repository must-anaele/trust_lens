import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { AccountPanel } from "@/components/account-panel";

export default function AccountPage() {
  return <><SiteHeader /><main className="container account-wrap"><AccountPanel /></main><SiteFooter /></>;
}
