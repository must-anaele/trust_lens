"use client";

import { useLanguage } from "@/components/language-provider";

export function ProductPaths() {
  const { t } = useLanguage();
  return (
    <section className="section paths-section" aria-labelledby="paths-title">
      <div className="container">
        <div className="section-kicker">{t("paths.kicker")}</div>
        <h2 className="h2" id="paths-title">{t("paths.title")}</h2>
        <p className="sec-lede">{t("paths.lede")}</p>
        <div className="path-grid">
          <a href="#analyze" className="path-card">
            <span className="path-icon">⌘</span>
            <span className="path-overline">{t("paths.contract")}</span>
            <strong>{t("paths.token")}</strong>
            <span>{t("paths.contractText")}</span>
            <span className="path-action">{t("paths.openContract")} <b>↗</b></span>
          </a>
          <a href="/wallet-review" className="path-card path-card-accent">
            <span className="path-icon">◉</span>
            <span className="path-overline">{t("paths.wallet")}</span>
            <strong>{t("paths.walletTitle")}</strong>
            <span>{t("paths.walletText")}</span>
            <span className="path-action">{t("paths.openWallet")} <b>↗</b></span>
          </a>
        </div>
      </div>
    </section>
  );
}

export function Features() {
  const { t } = useLanguage();
  const items = [
    { icon: "⌕", title: t("features.capability"), body: t("features.capabilityText"), tag: t("features.evidence") },
    { icon: "⇄", title: t("features.reconcile"), body: t("features.reconcileText"), tag: t("features.reconciliation") },
    { icon: "◉", title: t("features.approval"), body: t("features.approvalText"), tag: t("features.wallet") },
  ];
  return (
    <section className="section" id="features">
      <div className="container">
        <div className="section-kicker">{t("features.kicker")}</div>
        <h2 className="h2">{t("features.title")}</h2>
        <p className="sec-lede">{t("features.lede")}</p>
        <div className="fgrid">
          {items.map((item) => <article className="feature" key={item.title}>
            <div className="ficon" aria-hidden="true">{item.icon}</div>
            <h3>{item.title}</h3><p>{item.body}</p><span className="tag">{item.tag}</span>
          </article>)}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const { t } = useLanguage();
  const steps = [
    { n: "01", h: t("method.choose"), p: t("method.chooseText") },
    { n: "02", h: t("method.collect"), p: t("method.collectText") },
    { n: "03", h: t("method.review"), p: t("method.reviewText") },
  ];
  return (
    <section className="section method-section" id="how">
      <div className="container">
        <div className="section-kicker">{t("method.kicker")}</div>
        <h2 className="h2">{t("method.title")}</h2>
        <p className="sec-lede">{t("method.lede")}</p>
        <div className="steps">{steps.map((step) => <article className="step" key={step.n}>
          <div className="n">{step.n}</div><h3>{step.h}</h3><p>{step.p}</p>
        </article>)}</div>
      </div>
    </section>
  );
}

export function TrustPrinciples() {
  const { t } = useLanguage();
  return (
    <section className="section principles-section">
      <div className="container principles-grid">
        <div><div className="section-kicker">{t("principles.kicker")}</div><h2 className="h2">{t("principles.title")}</h2></div>
        <div className="callout">
          <p>{t("principles.body")}</p>
          <div className="principle-tags"><span>{t("principles.verified")}</span><span>{t("principles.linked")}</span><span>{t("principles.uncertainty")}</span></div>
        </div>
      </div>
    </section>
  );
}
