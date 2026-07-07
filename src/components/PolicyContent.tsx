import {
  getPolicySectionId,
  normalizePolicyHeading,
} from "@/lib/policy-content";

type PolicyContentProps = {
  content: string;
  hideDocumentTitle?: boolean;
  hideMetadata?: boolean;
};

export const PolicyContent = ({
  content,
  hideDocumentTitle = false,
  hideMetadata = false,
}: PolicyContentProps) => {
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
      blocks.push(
        <h2
          id={getPolicySectionId(heading)}
          key={`h2-${index}`}
          className="scroll-mt-24 border-t border-border pt-6 text-[1.08rem] font-semibold leading-snug text-foreground sm:text-xl"
        >
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
        <ul key={`ul-${index}`} className="space-y-2 pl-5 text-[15px] leading-[1.65] text-foreground marker:text-primary sm:text-base sm:leading-7">
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
          : "text-[15px] leading-[1.7] text-foreground sm:text-base sm:leading-7"}
      >
        {line}
      </p>,
    );
  }

  return <div className="space-y-4 break-words">{blocks}</div>;
};

