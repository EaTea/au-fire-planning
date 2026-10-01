import type { ReactNode } from "react";

/** What Banner needs: how serious the notice is, and its content. */
interface BannerProps {
  /** "info" is background information; "warning" is something the user should act on. */
  readonly tone: "info" | "warning";
  readonly children?: ReactNode;
}

/**
 * A short notice in a dashed box (the mockups' `.banner`), e.g. "Enter your
 * living expenses to see results" or the list of what isn't modelled yet.
 * Warnings use role="alert" so assistive technology announces them; info
 * banners are plain content.
 */
export function Banner({ tone, children }: BannerProps) {
  return (
    <div className={`banner banner-${tone}`} role={tone === "warning" ? "alert" : undefined}>
      {children}
    </div>
  );
}
