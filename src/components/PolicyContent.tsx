import {
  getPolicySectionId,
  normalizePolicyHeading,
} from "@/lib/policy-content";

type PolicyContentProps = {
  content: string;
  hideDocumentTitle?: boolean;
  hideMetadata?: boolean;
  variant?: "redesign";
};

export const PolicyContent = ({
  content,
  hideDocumentTitle = false,
  hideMetadata = false,
  variant,
}: PolicyContentProps) => {
  const isRedesign = variant === "redesign";
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;

    if (line.startsWith("# ")) {
      if (hideDocumentTitle) continue;
      blocks.push(
        <h1 key={`h1-${index}`} className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {normalizePolicyHeading(line)}
        </h1>,
      );
      continue;
    }

    if (line.startsWith("## ")) {
      const heading = normalizePolicyHeading(line);
      const sectionId = getPolicySectionId(heading);
      const isLegalBases = heading.includes("Legal Bases for Processing");
      blocks.push(
        <h2
          id={sectionId}
          data-alias-id={isLegalBases ? "legal-bases-for-processing" : undefined}
          key={`h2-${index}`}
          className={isRedesign
            ? "font-segoe scroll-mt-[130px] border-b border-public-border-default pb-2 sm:pb-[10px] pt-3 sm:pt-4 first:pt-0 text-base sm:text-public-fs-subtitle-sm font-bold sm:font-semibold leading-snug sm:leading-[120%] tracking-[-0.02em] text-public-text-brand"
            : "scroll-mt-24 border-t border-border pt-6 text-[1.08rem] font-semibold leading-snug text-foreground sm:text-xl"}
        >
          {isLegalBases ? (
            <span id="legal-bases-for-processing" className="scroll-mt-[130px]" />
          ) : null}
          {heading}
        </h2>,
      );
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("- ")) {
        items.push(lines[index].trim().slice(2));
        index += 1;
      }
      index -= 1;
      blocks.push(
        <ul key={`ul-${index}`} className="space-y-1.5 sm:space-y-2 pl-4 sm:pl-5 text-sm sm:text-[15px] leading-relaxed sm:leading-[1.65] text-foreground marker:text-primary">
          {items.map((item, itemIndex) => <li key={`${itemIndex}-${item.slice(0, 24)}`} className="pl-1">{item}</li>)}
        </ul>,
      );
      continue;
    }

    const isMetadata = line.startsWith("Version:");
    if (isMetadata && hideMetadata) continue;
    blocks.push(
      <p
        key={`p-${index}`}
        className={isMetadata
          ? "rounded-lg border border-border bg-muted/45 px-3 py-2 text-xs leading-5 text-muted-foreground sm:text-sm"
          : isRedesign
            ? "font-segoe text-sm sm:text-public-fs-subheading-sm font-normal leading-relaxed sm:leading-[160%] text-public-text-neutral-default text-left"
            : "text-[15px] leading-[1.7] text-foreground sm:text-base sm:leading-7"}
      >
        {line}
      </p>,
    );
  }

  return <div className="space-y-3 sm:space-y-4 break-words">{blocks}</div>;
};

