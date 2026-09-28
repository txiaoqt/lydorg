import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import {
  getEffectiveSystemSetting,
  usePublicContactInfo,
  writeCachedSystemSettings,
  fetchPublicSystemSettings,
  ADMIN_SETTINGS_STORAGE_KEY,
} from "@/lib/admin-system-settings";
import Footer from "@/components/Footer";
import Index from "@/pages/Index";
import Contacts from "@/pages/Contacts";
import { PwaContactPage } from "@/user/pwa/PwaInformationPages";
import { supabase } from "@/lib/supabase";

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: any) => <div data-testid="map-marker">{children}</div>,
  Popup: ({ children }: any) => <div data-testid="map-popup">{children}</div>,
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    role: null,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/lib/lydo-connect-store", () => ({
  useLydoConnect: () => ({
    state: {
      organizations: [],
      activities: [],
      templates: [],
    },
  }),
}));

vi.mock("@/lib/supabase", () => {
  const createChain = () => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
    };
    return chain;
  };

  return {
    supabase: {
      from: () => createChain(),
      rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
    isSupabaseConfigured: () => true,
  };
});

describe("Public Contact Information & Dynamic System Settings", () => {
  beforeEach(() => {
    window.localStorage.removeItem(ADMIN_SETTINGS_STORAGE_KEY);
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.localStorage.removeItem(ADMIN_SETTINGS_STORAGE_KEY);
  });

  it("preserves default settings values for compatibility", () => {
    expect(getEffectiveSystemSetting("general.support_email")).toBe("lydo@pasigcity.gov.ph");
    expect(getEffectiveSystemSetting("email.reply_to_email")).toBe("lydo@pasigcity.gov.ph");
    expect(getEffectiveSystemSetting("general.office_address")).toBe("3/F, Temporary Pasig City Hall, Eulogio Amang Rodriguez Ave., Brgy. Rosario, Pasig City");
  });

  it("renders dynamic email, address, and office hours on Homepage (Index) without phone number", () => {
    render(
      <BrowserRouter>
        <Index />
      </BrowserRouter>,
    );

    // Verify phone labels and contact number are absent
    expect(screen.queryByText("Contact Number")).toBeNull();
    expect(screen.queryByText("Contact Numbers")).toBeNull();
    expect(screen.queryByText("Telephone")).toBeNull();
    expect(screen.queryByText("(02) 8643-1111")).toBeNull();

    // Verify official email and office address
    const emailLinks = screen.getAllByRole("link", { name: "lydo@pasigcity.gov.ph" });
    expect(emailLinks.length).toBeGreaterThanOrEqual(1);
    emailLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "mailto:lydo@pasigcity.gov.ph");
    });

    expect(screen.getByText("Office Hours")).toBeInTheDocument();
    expect(screen.getByText("Mon – Thu: 7:00 AM – 6:00 PM")).toBeInTheDocument();
    expect(screen.getByText("Fri – Sun: Closed")).toBeInTheDocument();
  });

  it("renders dynamic email in Footer with mailto link without contact number", () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>,
    );

    expect(screen.queryByText("(02) 8643-1111")).toBeNull();
    expect(screen.queryByText("Contact Number")).toBeNull();

    const emailLinks = screen.getAllByRole("link", { name: "lydo@pasigcity.gov.ph" });
    expect(emailLinks.length).toBeGreaterThanOrEqual(1);
    emailLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "mailto:lydo@pasigcity.gov.ph");
    });
  });

  it("dynamically updates email when system settings are modified", () => {
    const TestComponent = () => {
      const { email } = usePublicContactInfo();
      return (
        <div>
          <a data-testid="email-link" href={`mailto:${email}`}>
            {email}
          </a>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByTestId("email-link")).toHaveTextContent("lydo@pasigcity.gov.ph");
    expect(screen.getByTestId("email-link")).toHaveAttribute("href", "mailto:lydo@pasigcity.gov.ph");

    // Simulate Admin changing reply-to email setting
    act(() => {
      writeCachedSystemSettings({
        "email.reply_to_email": "custom-reply@pasigcity.gov.ph",
      });
    });

    expect(screen.getByTestId("email-link")).toHaveTextContent("custom-reply@pasigcity.gov.ph");
    expect(screen.getByTestId("email-link")).toHaveAttribute("href", "mailto:custom-reply@pasigcity.gov.ph");

    // Restore
    act(() => {
      writeCachedSystemSettings({
        "email.reply_to_email": "lydo@pasigcity.gov.ph",
      });
    });

    expect(screen.getByTestId("email-link")).toHaveTextContent("lydo@pasigcity.gov.ph");
  });

  it("renders authoritative default office address on Home page", () => {
    const defaultAddress = "3/F, Temporary Pasig City Hall, Eulogio Amang Rodriguez Ave., Brgy. Rosario, Pasig City";
    expect(getEffectiveSystemSetting("general.office_address")).toBe(defaultAddress);

    render(
      <BrowserRouter>
        <Index />
      </BrowserRouter>,
    );
    expect(screen.getAllByText(defaultAddress).length).toBeGreaterThanOrEqual(1);
  });

  it("dynamically synchronizes modified office address to Home and PWA pages", () => {
    const customAddress = "3/F, Temporary Pasig City Hall, Eulogio Amang Rodriguez Ave., Brgy. Rosario, Pasig Cit";

    act(() => {
      writeCachedSystemSettings({
        "general.office_address": customAddress,
      });
    });

    // Check Home Page
    const { unmount: unmountHome } = render(
      <BrowserRouter>
        <Index />
      </BrowserRouter>,
    );
    expect(screen.getAllByText(customAddress).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("(02) 8643-1111")).toBeNull();
    unmountHome();

    // Check PWA Contact Page
    render(<PwaContactPage />);
    expect(screen.getByText(customAddress)).toBeInTheDocument();
    expect(screen.queryByText("(02) 8643-1111")).toBeNull();
  });

  it("fetches live public system settings from Supabase RPC get_public_system_settings", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: [
        {
          setting_key: "general.contact_number",
          category: "general",
          value_json: "09984801602",
          data_type: "string",
          updated_at: new Date().toISOString(),
        },
        {
          setting_key: "general.office_address",
          category: "general",
          value_json: "3/F, Temporary Pasig City Hall, Eulogio Amang Rodriguez Ave., Brgy. Rosario, Pasig Cit",
          data_type: "string",
          updated_at: new Date().toISOString(),
        },
      ],
      error: null,
    } as any);

    const loaded = await fetchPublicSystemSettings();
    expect(loaded["general.contact_number"]).toBe("09984801602");
    expect(loaded["general.office_address"]).toBe("3/F, Temporary Pasig City Hall, Eulogio Amang Rodriguez Ave., Brgy. Rosario, Pasig Cit");
  });

  it("renders restored Contacts page with Office Address, Official Email, and Office Hours, and without phone number", () => {
    render(
      <BrowserRouter>
        <Contacts />
      </BrowserRouter>,
    );

    // Verify page header
    expect(screen.getByRole("heading", { level: 1, name: "Contact Us" })).toBeInTheDocument();

    // Verify phone labels and numbers are absent
    expect(screen.queryByText("Contact Number")).toBeNull();
    expect(screen.queryByText("Official Contact Number")).toBeNull();
    expect(screen.queryByText("(02) 8643-1111")).toBeNull();

    // Verify office address
    expect(screen.getByText("Office Address")).toBeInTheDocument();
    expect(screen.getAllByText("3/F, Temporary Pasig City Hall, Eulogio Amang Rodriguez Ave., Brgy. Rosario, Pasig City").length).toBeGreaterThanOrEqual(1);

    // Verify official email
    expect(screen.getByText("Official Email")).toBeInTheDocument();
    const emailLinks = screen.getAllByRole("link", { name: "lydo@pasigcity.gov.ph" });
    expect(emailLinks.length).toBeGreaterThanOrEqual(1);

    // Verify office hours
    expect(screen.getByText("Office Hours")).toBeInTheDocument();
    expect(screen.getByText("Monday - Thursday")).toBeInTheDocument();
    expect(screen.getByText("7:00 AM – 6:00 PM")).toBeInTheDocument();
  });
});
