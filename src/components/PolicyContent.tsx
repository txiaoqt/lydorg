type PolicyContentProps = {
  content: string;
};

const normalizeHeading = (line: string) => line.replace(/^#+\s*/, "").trim();

export const PolicyContent = ({ content }: PolicyContentProps) => {
  const lines = content.split("\n");

  return (
    <div className="space-y-3 text-sm leading-6 text-foreground">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();
        if (!line) return <div key={`sp-${index}`} className="h-2" />;

        if (line.startsWith("## ")) {
          return (
            <h3 key={`h3-${index}`} className="pt-2 text-base font-semibold text-foreground">
              {normalizeHeading(line)}
            </h3>
          );
        }

        if (line.startsWith("# ")) {
          return (
            <h2 key={`h2-${index}`} className="text-lg font-bold text-foreground">
              {normalizeHeading(line)}
            </h2>
          );
        }

        return (
          <p key={`p-${index}`} className="text-sm text-foreground">
            {line}
          </p>
        );
      })}
    </div>
  );
};

