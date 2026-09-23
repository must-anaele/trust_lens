import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ContractAnalyzer } from "@/components/contract-analysis";
import { Features, HowItWorks, ProductPaths, TrustPrinciples } from "@/components/landing-sections";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <ContractAnalyzer />
        <ProductPaths />
        <Features />
        <HowItWorks />
        <TrustPrinciples />
      </main>
      <SiteFooter />
    </>
  );
}
