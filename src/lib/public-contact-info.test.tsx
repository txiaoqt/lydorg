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
import Contacts from "@/pages/Contacts";
import Footer from "@/components/Footer";
import Index from "@/pages/Index";
import { PwaContactPage } from "@/user/pwa/PwaInformationPages";
import { supabase } from "@/lib/supabase";

// Mock leaflet map and leaflet css to prevent canvas/DOM errors in jsdom
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

  it("defaults to official contact number '(02) 8643-1111' and reply-to email 'lydo@pasigcity.gov.ph'", () => {
    expect(getEffectiveSystemSetting("general.contact_number")).toBe("(02) 8643-1111");
    expect(getEffectiveSystemSetting("email.reply_to_email")).toBe("lydo@pasigcity.gov.ph");
  });

  it("renders 'Contact Number' label and dynamic values on Contacts page without 'Telephone'", () => {
    render(
      <BrowserRouter>
        <Contacts />
      </BrowserRouter>,
    );

    // Verify label changed from Telephone to Contact Number
    expect(screen.getByText("Contact Number")).toBeInTheDocument();
    expect(screen.queryByText("Telephone")).toBeNull();

    // Verify dynamic default contact number and email (appears on both page card and footer)
    const phoneMatches = screen.getAllByText("(02) 8643-1111");
    expect(phoneMatches.length).toBeGreaterThanOrEqual(1);

    const emailMatches = screen.getAllByText("lydo@pasigcity.gov.ph");
    expect(emailMatches.length).toBeGreaterThanOrEqual(1);

    // Verify mailto links
    const mailLinks = screen.getAllByRole("link", { name: "lydo@pasigcity.gov.ph" });
    expect(mailLinks.length).toBeGreaterThanOrEqual(1);
    mailLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "mailto:lydo@pasigcity.gov.ph");
    });
  });

  it("renders dynamic contact number, label, and email on Homepage (Index)", () => {
    render(
      <BrowserRouter>
        <Index />
      </BrowserRouter>,
    );

    expect(screen.getByText("Contact Number")).toBeInTheDocument();
    expect(screen.queryByText("Contact Numbers")).toBeNull();
    expect(screen.queryByText("Telephone")).toBeNull();

    const phoneMatches = screen.getAllByText("(02) 8643-1111");
    expect(phoneMatches.length).toBeGreaterThanOrEqual(1);

    const emailLinks = screen.getAllByRole("link", { name: "lydo@pasigcity.gov.ph" });
    expect(emailLinks.length).toBeGreaterThanOrEqual(1);
    emailLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "mailto:lydo@pasigcity.gov.ph");
    });
  });

  it("renders dynamic contact number and email in Footer with dynamic mailto link", () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>,
    );

    const contactNumbers = screen.getAllByText("(02) 8643-1111");
    expect(contactNumbers.length).toBeGreaterThanOrEqual(1);

    const emailLinks = screen.getAllByRole("link", { name: "lydo@pasigcity.gov.ph" });
    expect(emailLinks.length).toBeGreaterThanOrEqual(1);
    emailLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "mailto:lydo@pasigcity.gov.ph");
    });
  });

  it("dynamically updates contact number and email when system settings are modified", () => {
    const TestComponent = () => {
      const { contactNumber, email } = usePublicContactInfo();
      return (
        <div>
          <span data-testid="contact-number">{contactNumber}</span>
          <a data-testid="email-link" href={`mailto:${email}`}>
            {email}
          </a>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByTestId("contact-number")).toHaveTextContent("(02) 8643-1111");
    expect(screen.getByTestId("email-link")).toHaveTextContent("lydo@pasigcity.gov.ph");
    expect(screen.getByTestId("email-link")).toHaveAttribute("href", "mailto:lydo@pasigcity.gov.ph");

    // Simulate Admin changing settings to 09984801602
    act(() => {
      writeCachedSystemSettings({
        "general.contact_number": "09984801602",
        "email.reply_to_email": "custom-reply@pasigcity.gov.ph",
      });
    });

    expect(screen.getByTestId("contact-number")).toHaveTextContent("09984801602");
    expect(screen.getByTestId("email-link")).toHaveTextContent("custom-reply@pasigcity.gov.ph");
    expect(screen.getByTestId("email-link")).toHaveAttribute("href", "mailto:custom-reply@pasigcity.gov.ph");

    // Simulate Admin changing settings again to 123456789
    act(() => {
      writeCachedSystemSettings({
        "general.contact_number": "123456789",
      });
    });

    expect(screen.getByTestId("contact-number")).toHaveTextContent("123456789");

    // Restore
    act(() => {
      writeCachedSystemSettings({
        "general.contact_number": "(02) 8643-1111",
        "email.reply_to_email": "lydo@pasigcity.gov.ph",
      });
    });

    expect(screen.getByTestId("contact-number")).toHaveTextContent("(02) 8643-1111");
    expect(screen.getByTestId("email-link")).toHaveTextContent("lydo@pasigcity.gov.ph");
  });

  it("renders authoritative default office address on both Home and Contacts pages", () => {
    const defaultAddress = "3/F, Temporary Pasig City Hall, Eulogio Amang Rodriguez Ave., Brgy. Rosario, Pasig City";
    expect(getEffectiveSystemSetting("general.office_address")).toBe(defaultAddress);

    // Check Contacts page
    const { unmount: unmountContacts } = render(
      <BrowserRouter>
        <Contacts />
      </BrowserRouter>,
    );
    expect(screen.getAllByText(defaultAddress).length).toBeGreaterThanOrEqual(1);
    unmountContacts();

    // Check Home page
    render(
      <BrowserRouter>
        <Index />
      </BrowserRouter>,
    );
    expect(screen.getAllByText(defaultAddress).length).toBeGreaterThanOrEqual(1);
  });

  it("dynamically synchronizes modified office address ending in 'Pasig Cit' to Home, Contacts, and PWA pages", () => {
    const customAddress = "3/F, Temporary Pasig City Hall, Eulogio Amang Rodriguez Ave., Brgy. Rosario, Pasig Cit";

    act(() => {
      writeCachedSystemSettings({
        "general.office_address": customAddress,
        "general.contact_number": "09984801602",
      });
    });

    // Check Contacts Page
    const { unmount: unmountContacts } = render(
      <BrowserRouter>
        <Contacts />
      </BrowserRouter>,
    );
    expect(screen.getAllByText(customAddress).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("09984801602").length).toBeGreaterThanOrEqual(1);
    unmountContacts();

    // Check Home Page
    const { unmount: unmountHome } = render(
      <BrowserRouter>
        <Index />
      </BrowserRouter>,
    );
    expect(screen.getAllByText(customAddress).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("09984801602").length).toBeGreaterThanOrEqual(1);
    unmountHome();

    // Check PWA Contact Page
    render(<PwaContactPage />);
    expect(screen.getByText(customAddress)).toBeInTheDocument();
    expect(screen.getByText("09984801602")).toBeInTheDocument();
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
});
