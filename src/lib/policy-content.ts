export const normalizePolicyHeading = (line: string) => line.replace(/^#+\s*/, "").trim();

export const getPolicySectionId = (heading: string) => `policy-${heading.toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")}`;

export const getPolicySections = (content: string) =>
  content.split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("## "))
    .map((line) => {
      const title = normalizePolicyHeading(line);
      return { id: getPolicySectionId(title), title };
    });
