import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SignUp from "@/pages/SignUp";
import SignIn from "@/pages/SignIn";
import { loadSignupPrefill, SIGNUP_PREFILL_STORAGE_KEY } from "@/pages/GoogleOnboarding";

// Mock ResizeObserver for jsdom
window.ResizeObserver =
  window.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

window.scrollTo = vi.fn();

// Mocks
const { mockSignInWithOAuth, mockSignUp } = vi.hoisted(() => ({
  mockSignInWithOAuth: vi.fn(),
  mockSignUp: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
    },
    rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: null }),
              }),
            }),
          }),
        }),
        or: () => ({
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  },
  isSupabaseConfigured: () => true,
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isInitialized: true,
    isPasswordRecoverySession: false,
    role: "guest",
    user: null,
    signUp: (...args: unknown[]) => mockSignUp(...args),
  }),
}));

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe("Organization Sign-Up Google Authentication Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("TEST 1: Step 1 renders Continue to Account Details, divider, and Continue with Google button", () => {
    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <SignUp />
      </MemoryRouter>,
    );

    // Primary action
    expect(screen.getByRole("button", { name: /Continue to Account Details/i })).toBeInTheDocument();

    // Divider
    expect(screen.getByText(/or continue with/i)).toBeInTheDocument();

    // Google Sign-Up button
    const googleBtn = screen.getByRole("button", { name: /Continue with Google/i });
    expect(googleBtn).toBeInTheDocument();
    expect(googleBtn).not.toBeDisabled();
  });

  it("TEST 2: Visual consistency between SignIn and SignUp Google buttons", () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={["/signin"]}>
        <SignIn />
      </MemoryRouter>,
    );

    const signInGoogleBtn = screen.getByRole("button", { name: /Continue with Google/i });
    expect(signInGoogleBtn).toBeInTheDocument();
    expect(screen.getByText(/or continue with/i)).toBeInTheDocument();
    unmount();

    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <SignUp />
      </MemoryRouter>,
    );

    const signUpGoogleBtn = screen.getByRole("button", { name: /Continue with Google/i });
    expect(signUpGoogleBtn).toBeInTheDocument();
    expect(screen.getByText(/or continue with/i)).toBeInTheDocument();
  });

  it("TEST 3: Clicking Continue with Google preserves entered organization data and triggers OAuth redirect", async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });

    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <SignUp />
      </MemoryRouter>,
    );

    // Enter organization name
    const nameInput = screen.getByLabelText(/Organization Name/i);
    fireEvent.change(nameInput, { target: { value: "Youth Innovators Club" } });

    // Select existing URN checkbox
    const urnCheckbox = screen.getByLabelText(/We already have a Unique Registration Number \(URN\)/i);
    fireEvent.click(urnCheckbox);

    // Enter URN
    const urnInput = screen.getByPlaceholderText("17-26-010");
    fireEvent.change(urnInput, { target: { value: "17-26-010" } });

    // Click Continue with Google
    const googleBtn = screen.getByRole("button", { name: /Continue with Google/i });
    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: expect.objectContaining({
          redirectTo: expect.stringContaining("/auth/callback"),
          queryParams: { prompt: "select_account" },
        }),
      });
    });

    // Verify prefilled data was saved to localStorage
    const savedPrefill = loadSignupPrefill();
    expect(savedPrefill).toEqual({
      organizationName: "Youth Innovators Club",
      isExistingOrganization: true,
      organizationIdentifierNumber: "17-26-010",
    });
  });

  it("TEST 4: Clicking Continue to Account Details advances from Step 1 to Step 2", async () => {
    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <SignUp />
      </MemoryRouter>,
    );

    const nameInput = screen.getByPlaceholderText("Enter your organization's name");
    act(() => {
      fireEvent.change(nameInput, { target: { value: "Kabataan ng Pasig" } });
    });
    expect(nameInput).toHaveValue("Kabataan ng Pasig");

    const continueBtn = screen.getByRole("button", { name: /Continue to Account Details/i });
    act(() => {
      fireEvent.click(continueBtn);
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Continue to Account Details/i })).not.toBeInTheDocument();
    });
  });

  it("TEST 5: Google OAuth initiation error displays inline error message", async () => {
    mockSignInWithOAuth.mockResolvedValueOnce({
      error: { message: "OAuth provider configuration error" },
    });

    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <SignUp />
      </MemoryRouter>,
    );

    const googleBtn = screen.getByRole("button", { name: /Continue with Google/i });
    fireEvent.click(googleBtn);

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("OAuth provider configuration error");
    });
  });

  it("keeps headquarters location out of account signup so it is completed in Section 5", async () => {
    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <SignUp />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByPlaceholderText("Enter your organization's name"), {
      target: { value: "Pasig Youth Alliance" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Continue to Account Details/i }));

    await waitFor(() => expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument());
    expect(screen.queryByLabelText(/^District/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Barangay/i)).not.toBeInTheDocument();
  });
});
