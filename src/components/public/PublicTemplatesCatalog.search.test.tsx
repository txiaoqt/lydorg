import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import PublicTemplatesCatalog from "./PublicTemplatesCatalog";
import { UserPortalTemplatesWorkspaceView } from "@/components/portal/UserPortalTemplatesWorkspaceView";

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [], isFetching: false, refetch: async () => ({ data: [] }) }),
}));
vi.mock("@/lib/lydo-connect-store", () => ({
  useLydoConnect: () => ({ state: { templates: [] } }),
}));
vi.mock("@/lib/lydo-connect-supabase", () => ({
  loadOrganizationRequiredDocumentTypesState: async () => ({ templates: [] }),
  resolveSupabaseFileUrl: async (url: string) => url,
}));
vi.mock("@/components/portal/PortalDocumentDrawer", () => ({
  PortalDocumentDrawer: () => null,
}));
vi.mock("@/hooks/use-toast", () => ({ toast: () => undefined }));

afterEach(cleanup);

describe("Forms & Templates search placeholders", () => {
  it("uses the public catalog prompt in both responsive search fields", () => {
    render(<PublicTemplatesCatalog compactHeader />);
    expect(screen.getAllByPlaceholderText("Search by title, description, or keyword...")).toHaveLength(2);
  });

  it("keeps the existing Organization Portal prompts when no override is passed", () => {
    render(<UserPortalTemplatesWorkspaceView publicTemplates={[]} openFile={() => undefined} />);
    expect(screen.getByPlaceholderText("Search templates...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search templates by title, description, category...")).toBeInTheDocument();
  });
});
