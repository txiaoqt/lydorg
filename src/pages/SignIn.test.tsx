import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SignIn from "./SignIn";
import AuthImageSlideshow, { getInitialSlideIndex, resetLastInitialIndex } from "@/components/auth/AuthImageSlideshow";
import { ADMIN_DESKTOP_MIN_WIDTH } from "@/hooks/use-admin-desktop-viewport";

// Mock useAuth
const mockSignIn = vi.fn();
let mockAuthValue = {
  signIn: mockSignIn,
  isAuthenticated: false,
  isInitialized: true,
  isPasswordRecoverySession: false,
  role: "guest" as const,
  user: null,
  signUp: vi.fn(),
  signOut: vi.fn(),
};

vi.mock("@/lib/deployment-surface", () => ({
  DEPLOY_SURFACE: "combined",
  IS_USER_SURFACE: false,
  IS_ADMIN_SURFACE: false,
  IS_COMBINED_SURFACE: true,
  ADMIN_SIGNIN_PATH: "/admin/signin",
  USER_SIGNIN_PATH: "/signin",
  EFFECTIVE_ADMIN_SIGNIN_PATH: "/signin",
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockAuthValue,
}));

// Mock useToast
const mockToastDismiss = vi.fn();
const mockToast = vi.fn(() => ({ dismiss: mockToastDismiss }));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock supabase
const mockSignInWithOAuth = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
    },
  },
  isSupabaseConfigured: () => true,
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("SignIn Component", () => {
  const originalInnerWidth = window.innerWidth;
  const originalMatchMedia = window.matchMedia;

  const setViewportWidth = (width: number) => {
    window.innerWidth = width;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: width >= ADMIN_DESKTOP_MIN_WIDTH,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetLastInitialIndex();
    setViewportWidth(1280);
    mockSignIn.mockResolvedValue({});
    mockAuthValue = {
      signIn: mockSignIn,
      isAuthenticated: false,
      isInitialized: true,
      isPasswordRecoverySession: false,
      role: "guest",
      user: null,
      signUp: vi.fn(),
      signOut: vi.fn(),
    };
  });

  afterEach(() => {
    window.innerWidth = originalInnerWidth;
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  describe("Organization Sign In (Modern SaaS UI)", () => {
    it("renders organization sign-in form elements, Google button, and slideshow", () => {
      render(
        <MemoryRouter>
          <SignIn />
        </MemoryRouter>,
      );

      expect(screen.getByText("Welcome back")).toBeInTheDocument();
      expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Sign In$/i })).toBeInTheDocument();
      expect(screen.getByText(/Forgot password\?/i)).toBeInTheDocument();
      expect(screen.getByText(/Don't have an account\?/i)).toBeInTheDocument();
      expect(screen.getByText(/Continue with Google/i)).toBeInTheDocument();
      expect(screen.getByText(/Back to home/i)).toBeInTheDocument();

      // Slideshow carousel presence
      expect(screen.getByRole("region", { name: /Y-TRACE photo gallery/i })).toBeInTheDocument();
    });

    it("handles organization sign-in submission with valid credentials", async () => {
      render(
        <MemoryRouter>
          <SignIn />
        </MemoryRouter>,
      );

      const emailInput = screen.getByLabelText(/Email address/i);
      const passwordInput = screen.getByLabelText(/^Password$/i);
      const submitButton = screen.getByRole("button", { name: /^Sign In$/i });

      fireEvent.change(emailInput, { target: { value: "org@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Secret123!" } });
      expect(submitButton).not.toBeDisabled();

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          mode: "user",
          email: "org@example.com",
          password: "Secret123!",
        });
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
      });
    });

    it("renders active Google OAuth button and clicking it initiates Google sign-in", async () => {
      render(
        <MemoryRouter>
          <SignIn />
        </MemoryRouter>,
      );

      const googleBtn = screen.getByRole("button", { name: /Continue with Google/i });
      expect(googleBtn).not.toBeDisabled();
      expect(googleBtn).toHaveAttribute("type", "button");

      fireEvent.click(googleBtn);
      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith({
          provider: "google",
          options: expect.objectContaining({
            queryParams: { prompt: "select_account" },
          }),
        });
      });
    });

    it("renders slideshow with all 4 images, allows previous/next navigation and indicator selection", () => {
      render(
        <MemoryRouter>
          <AuthImageSlideshow initialIndex={0} />
        </MemoryRouter>,
      );

      const carousel = screen.getByRole("region", { name: /Y-TRACE photo gallery/i });
      expect(carousel).toBeInTheDocument();

      expect(screen.getByText(/Showing photo 1 of 4/i)).toBeInTheDocument();
      expect(screen.getByText("YORP Advocacy Blueprint: Seminar-Workshop on Advocacy Building 2025")).toBeInTheDocument();

      const nextBtn = screen.getByRole("button", { name: "Next photo" });
      const prevBtn = screen.getByRole("button", { name: "Previous photo" });

      fireEvent.click(nextBtn);
      expect(screen.getByText(/Showing photo 2 of 4/i)).toBeInTheDocument();
      expect(screen.getByText("Youth Organizations (YOs) and Youth-Serving Organizations (YSOs) General Assembly 2026")).toBeInTheDocument();

      fireEvent.click(prevBtn);
      expect(screen.getByText(/Showing photo 1 of 4/i)).toBeInTheDocument();

      fireEvent.click(prevBtn);
      expect(screen.getByText(/Showing photo 4 of 4/i)).toBeInTheDocument();
      expect(screen.getByText("YOUTHnified: Youth for Inclusive and Gender-Fair Community 2025")).toBeInTheDocument();

      const dot3 = screen.getByRole("button", { name: "Go to photo 3" });
      fireEvent.click(dot3);
      expect(screen.getByText(/Showing photo 3 of 4/i)).toBeInTheDocument();

      fireEvent.keyDown(carousel, { key: "ArrowRight" });
      expect(screen.getByText(/Showing photo 4 of 4/i)).toBeInTheDocument();

      fireEvent.keyDown(carousel, { key: "ArrowLeft" });
      expect(screen.getByText(/Showing photo 3 of 4/i)).toBeInTheDocument();
    });

    it("supports horizontal touch swipe gestures to navigate slides", () => {
      render(
        <MemoryRouter>
          <AuthImageSlideshow initialIndex={0} />
        </MemoryRouter>,
      );

      const carousel = screen.getByRole("region", { name: /Y-TRACE photo gallery/i });

      // Swipe Left (drag from 200px to 100px = delta 100px > 40px -> Next)
      fireEvent.touchStart(carousel, { touches: [{ clientX: 200 }] });
      fireEvent.touchMove(carousel, { touches: [{ clientX: 100 }] });
      fireEvent.touchEnd(carousel);
      expect(screen.getByText(/Showing photo 2 of 4/i)).toBeInTheDocument();

      // Swipe Right (drag from 100px to 200px = delta -100px < -40px -> Prev)
      fireEvent.touchStart(carousel, { touches: [{ clientX: 100 }] });
      fireEvent.touchMove(carousel, { touches: [{ clientX: 200 }] });
      fireEvent.touchEnd(carousel);
      expect(screen.getByText(/Showing photo 1 of 4/i)).toBeInTheDocument();
    });

    it("renders true two-column sibling sections with mobile slideshow hiding", () => {
      render(
        <MemoryRouter>
          <SignIn />
        </MemoryRouter>,
      );

      const slideshowSection = screen.getByRole("region", { name: /Photo gallery showcase/i });
      const loginSection = screen.getByRole("region", { name: /Sign in form/i });

      expect(slideshowSection).toBeInTheDocument();
      expect(loginSection).toBeInTheDocument();
      // Ensure they are sibling elements within the same parent
      expect(slideshowSection.parentElement).toBe(loginSection.parentElement);

      // Verify mobile-hiding class and desktop/tablet visibility
      expect(slideshowSection.className).toContain("hidden");
      expect(slideshowSection.className).toContain("md:block");

      // Verify login section is full-width with min-h-screen on mobile
      expect(loginSection.className).toContain("min-h-screen");
      expect(loginSection.className).toContain("w-full");
    });

    it("randomizes initial slide index across mounts and avoids consecutive duplicates", () => {
      resetLastInitialIndex();
      const first = getInitialSlideIndex(4);
      const second = getInitialSlideIndex(4);
      const third = getInitialSlideIndex(4);

      expect(first).toBeGreaterThanOrEqual(0);
      expect(first).toBeLessThan(4);
      expect(second).toBeGreaterThanOrEqual(0);
      expect(second).toBeLessThan(4);
      expect(third).toBeGreaterThanOrEqual(0);
      expect(third).toBeLessThan(4);

      // Verify consecutive non-repetition
      expect(second).not.toBe(first);
      expect(third).not.toBe(second);
    });

    it("displays verification code link when email is not confirmed", async () => {
      mockSignIn.mockResolvedValueOnce({
        error: "Email not confirmed. Please check your inbox.",
      });

      render(
        <MemoryRouter>
          <SignIn />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: "unverified@test.com" } });
      fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: "password123" } });
      fireEvent.click(screen.getByRole("button", { name: /^Sign In$/i }));

      await waitFor(() => {
        expect(screen.getByText(/Your email address is not verified yet/i)).toBeInTheDocument();
        const verifyLink = screen.getByRole("link", { name: /Enter verification code →/i });
        expect(verifyLink).toBeInTheDocument();
      });
    });
  });

  describe("Admin Sign In (Existing Classic UI Preserved)", () => {
    it("renders existing classic Admin UI without slideshow or Google button when forcedMode='admin'", async () => {
      render(
        <MemoryRouter>
          <SignIn forcedMode="admin" />
        </MemoryRouter>,
      );

      expect(screen.getByText("Admin sign in")).toBeInTheDocument();
      expect(screen.getByText("Sign in to access the Y-TRACE administration portal and manage youth organization records.")).toBeInTheDocument();
      expect(screen.getByLabelText(/Admin Username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Sign In$/i })).toBeInTheDocument();

      // Ensure Organization-only and Redesign-only elements are NOT present on Admin Sign In
      expect(screen.queryByRole("region", { name: /Y-TRACE photo gallery/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/Forgot password\?/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Continue with Google/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Don't have an account\?/i)).not.toBeInTheDocument();

      const usernameInput = screen.getByLabelText(/Admin Username/i);
      const passwordInput = screen.getByLabelText(/^Password$/i);
      const submitButton = screen.getByRole("button", { name: /^Sign In$/i });

      fireEvent.change(usernameInput, { target: { value: "lydoadmin" } });
      fireEvent.change(passwordInput, { target: { value: "adminpass" } });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          mode: "admin",
          username: "lydoadmin",
          password: "adminpass",
        });
        expect(mockNavigate).toHaveBeenCalledWith("/admin", { replace: true });
      });
    });
  });

  describe("Admin Sign-In Desktop/Laptop Viewport Gating (forcedMode='admin')", () => {
    it("renders Admin sign-in form at supported desktop viewport (1280px)", () => {
      setViewportWidth(1280);

      render(
        <MemoryRouter>
          <SignIn forcedMode="admin" />
        </MemoryRouter>,
      );

      expect(screen.getByText("Admin sign in")).toBeInTheDocument();
      expect(screen.getByLabelText(/Admin Username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Sign In$/i })).toBeInTheDocument();
      expect(screen.queryByText("Desktop Display Required")).not.toBeInTheDocument();
    });

    it("renders Admin sign-in form on exact threshold boundary (1024px)", () => {
      setViewportWidth(1024);

      render(
        <MemoryRouter>
          <SignIn forcedMode="admin" />
        </MemoryRouter>,
      );

      expect(screen.getByText("Admin sign in")).toBeInTheDocument();
      expect(screen.getByLabelText(/Admin Username/i)).toBeInTheDocument();
      expect(screen.queryByText("Desktop Display Required")).not.toBeInTheDocument();
    });

    it("blocks Admin sign-in form and renders warning screen at 1023px viewport", () => {
      setViewportWidth(1023);

      render(
        <MemoryRouter>
          <SignIn forcedMode="admin" />
        </MemoryRouter>,
      );

      expect(screen.queryByText("Admin sign in")).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Admin Username/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/^Password$/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Sign In$/i })).not.toBeInTheDocument();

      expect(screen.getByText("Desktop Display Required")).toBeInTheDocument();
      expect(screen.getByText(/Current Viewport:/i)).toHaveTextContent("1023px");
      expect(
        screen.getByText(
          /The Y-TRACE Admin Portal is designed for desktop and laptop computers to support detailed data tables/i,
        ),
      ).toBeInTheDocument();
    });

    it("blocks Admin sign-in form and renders warning screen at tablet viewport (768px)", () => {
      setViewportWidth(768);

      render(
        <MemoryRouter>
          <SignIn forcedMode="admin" />
        </MemoryRouter>,
      );

      expect(screen.queryByText("Admin sign in")).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Admin Username/i)).not.toBeInTheDocument();
      expect(screen.getByText("Desktop Display Required")).toBeInTheDocument();
      expect(screen.getByText(/Current Viewport:/i)).toHaveTextContent("768px");
    });

    it("blocks Admin sign-in form and renders warning screen at mobile viewport (375px)", () => {
      setViewportWidth(375);

      render(
        <MemoryRouter>
          <SignIn forcedMode="admin" />
        </MemoryRouter>,
      );

      expect(screen.queryByText("Admin sign in")).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Admin Username/i)).not.toBeInTheDocument();
      expect(screen.getByText("Desktop Display Required")).toBeInTheDocument();
      expect(screen.getByText(/Current Viewport:/i)).toHaveTextContent("375px");
    });
  });

  describe("Combined /signin Route Access Type Switching and Live Viewport Adaptation", () => {
    it("renders Organization sign-in at 768px without warning", () => {
      setViewportWidth(768);

      render(
        <MemoryRouter>
          <SignIn />
        </MemoryRouter>,
      );

      expect(screen.getByText("Welcome back")).toBeInTheDocument();
      expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
      expect(screen.queryByText("Desktop Display Required")).not.toBeInTheDocument();
    });

    it("switching User → Admin at 768px immediately blocks Admin form and displays warning", () => {
      setViewportWidth(768);

      render(
        <MemoryRouter>
          <SignIn />
        </MemoryRouter>,
      );

      // Initially in User/Organization mode
      expect(screen.getByText("Welcome back")).toBeInTheDocument();

      // Switch to Admin mode
      const adminButton = screen.getByRole("button", { name: /^Admin$/i });
      fireEvent.click(adminButton);

      // Warning screen is shown, Admin form inputs are NOT rendered
      expect(screen.getByText("Desktop Display Required")).toBeInTheDocument();
      expect(screen.queryByText("Admin sign in")).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Admin Username/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Sign In$/i })).not.toBeInTheDocument();
    });

    it("displays warning screen in Admin mode below 1024px with no interactive action buttons or links", () => {
      setViewportWidth(768);

      render(
        <MemoryRouter>
          <SignIn />
        </MemoryRouter>,
      );

      // Switch to Admin mode below 1024px
      fireEvent.click(screen.getByRole("button", { name: /^Admin$/i }));
      expect(screen.getByText("Desktop Display Required")).toBeInTheDocument();
      expect(screen.queryByText("Admin sign in")).not.toBeInTheDocument();

      // Assert warning screen is strictly informational with NO buttons or links
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.queryByText(/back to home/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/sign out/i)).not.toBeInTheDocument();
    });

    it("renders Admin sign-in when switching to Administrator mode at 1280px", () => {
      setViewportWidth(1280);

      render(
        <MemoryRouter>
          <SignIn />
        </MemoryRouter>,
      );

      // Initially in Organization mode
      expect(screen.getByText("Welcome back")).toBeInTheDocument();

      // Switch to Admin mode
      fireEvent.click(screen.getByRole("button", { name: /^Admin$/i }));

      // Admin form is rendered normally at 1280px
      expect(screen.getByText("Admin sign in")).toBeInTheDocument();
      expect(screen.getByLabelText(/Admin Username/i)).toBeInTheDocument();
      expect(screen.queryByText("Desktop Display Required")).not.toBeInTheDocument();
    });

    it("live window resize in Admin mode adapts seamlessly between warning and Admin sign-in form", () => {
      setViewportWidth(768);

      render(
        <MemoryRouter>
          <SignIn />
        </MemoryRouter>,
      );

      // Switch to Admin at 768px
      fireEvent.click(screen.getByRole("button", { name: /^Admin$/i }));
      expect(screen.getByText("Desktop Display Required")).toBeInTheDocument();
      expect(screen.queryByText("Admin sign in")).not.toBeInTheDocument();

      // Live resize to 1280px
      act(() => {
        setViewportWidth(1280);
        window.dispatchEvent(new Event("resize"));
      });

      // Admin form automatically appears without navigation or reload
      expect(screen.getByText("Admin sign in")).toBeInTheDocument();
      expect(screen.getByLabelText(/Admin Username/i)).toBeInTheDocument();
      expect(screen.queryByText("Desktop Display Required")).not.toBeInTheDocument();

      // Live resize back down to 800px
      act(() => {
        setViewportWidth(800);
        window.dispatchEvent(new Event("resize"));
      });

      // Warning screen immediately reappears
      expect(screen.getByText("Desktop Display Required")).toBeInTheDocument();
      expect(screen.queryByText("Admin sign in")).not.toBeInTheDocument();
    });

    it("Organization mode at mobile (375px) is completely unrestricted and unaffected", () => {
      setViewportWidth(375);

      render(
        <MemoryRouter>
          <SignIn />
        </MemoryRouter>,
      );

      expect(screen.getByText("Welcome back")).toBeInTheDocument();
      expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Sign In$/i })).toBeInTheDocument();
      expect(screen.queryByText("Desktop Display Required")).not.toBeInTheDocument();
    });
  });

  describe("Common Behaviors & Auth Guards", () => {
    it("toggles password visibility with accessible label", () => {
      render(
        <MemoryRouter>
          <SignIn />
        </MemoryRouter>,
      );

      const passwordInput = screen.getByLabelText(/^Password$/i);
      const toggleButton = screen.getByLabelText("Show password");

      expect(passwordInput).toHaveAttribute("type", "password");

      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute("type", "text");
      expect(screen.getByLabelText("Hide password")).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText("Hide password"));
      expect(passwordInput).toHaveAttribute("type", "password");
    });

    it("handles PWA flow marker and routes correctly", () => {
      render(
        <MemoryRouter initialEntries={["/signin?pwa=1"]}>
          <SignIn />
        </MemoryRouter>,
      );

      expect(screen.getByText(/← Back to welcome/i)).toBeInTheDocument();
    });

    it("redirects active password recovery sessions immediately", () => {
      mockAuthValue.isAuthenticated = true;
      mockAuthValue.isPasswordRecoverySession = true;

      render(
        <MemoryRouter>
          <SignIn />
        </MemoryRouter>,
      );

      expect(mockNavigate).toHaveBeenCalledWith("/reset-password", { replace: true });
    });
  });
});
