import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignIn from "./SignIn";
import AuthImageSlideshow, { getInitialSlideIndex, resetLastInitialIndex } from "@/components/auth/AuthImageSlideshow";

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

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockAuthValue,
}));

// Mock useToast
const mockToastDismiss = vi.fn();
const mockToast = vi.fn(() => ({ dismiss: mockToastDismiss }));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
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
  beforeEach(() => {
    vi.clearAllMocks();
    resetLastInitialIndex();
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
      expect(screen.getByText(/Coming soon/i)).toBeInTheDocument();
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

    it("Google button is UI-only, disabled, and cannot submit the form", () => {
      render(
        <MemoryRouter>
          <SignIn />
        </MemoryRouter>,
      );

      const googleBtn = screen.getByRole("button", { name: /Continue with Google/i });
      expect(googleBtn).toBeDisabled();
      expect(googleBtn).toHaveAttribute("type", "button");
      expect(googleBtn).toHaveAttribute("aria-disabled", "true");
      expect(screen.getByText("Coming soon")).toBeInTheDocument();

      fireEvent.click(googleBtn);
      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it("renders slideshow with all 5 images, allows previous/next navigation and indicator selection", () => {
      render(
        <MemoryRouter>
          <AuthImageSlideshow initialIndex={0} />
        </MemoryRouter>,
      );

      const carousel = screen.getByRole("region", { name: /Y-TRACE photo gallery/i });
      expect(carousel).toBeInTheDocument();

      expect(screen.getByText(/Showing photo 1 of 5/i)).toBeInTheDocument();

      const nextBtn = screen.getByRole("button", { name: "Next photo" });
      const prevBtn = screen.getByRole("button", { name: "Previous photo" });

      fireEvent.click(nextBtn);
      expect(screen.getByText(/Showing photo 2 of 5/i)).toBeInTheDocument();

      fireEvent.click(prevBtn);
      expect(screen.getByText(/Showing photo 1 of 5/i)).toBeInTheDocument();

      fireEvent.click(prevBtn);
      expect(screen.getByText(/Showing photo 5 of 5/i)).toBeInTheDocument();

      const dot3 = screen.getByRole("button", { name: "Go to photo 3" });
      fireEvent.click(dot3);
      expect(screen.getByText(/Showing photo 3 of 5/i)).toBeInTheDocument();

      fireEvent.keyDown(carousel, { key: "ArrowRight" });
      expect(screen.getByText(/Showing photo 4 of 5/i)).toBeInTheDocument();

      fireEvent.keyDown(carousel, { key: "ArrowLeft" });
      expect(screen.getByText(/Showing photo 3 of 5/i)).toBeInTheDocument();
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
      expect(screen.getByText(/Showing photo 2 of 5/i)).toBeInTheDocument();

      // Swipe Right (drag from 100px to 200px = delta -100px < -40px -> Prev)
      fireEvent.touchStart(carousel, { touches: [{ clientX: 100 }] });
      fireEvent.touchMove(carousel, { touches: [{ clientX: 200 }] });
      fireEvent.touchEnd(carousel);
      expect(screen.getByText(/Showing photo 1 of 5/i)).toBeInTheDocument();
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
      const first = getInitialSlideIndex(5);
      const second = getInitialSlideIndex(5);
      const third = getInitialSlideIndex(5);

      expect(first).toBeGreaterThanOrEqual(0);
      expect(first).toBeLessThan(5);
      expect(second).toBeGreaterThanOrEqual(0);
      expect(second).toBeLessThan(5);
      expect(third).toBeGreaterThanOrEqual(0);
      expect(third).toBeLessThan(5);

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
      expect(screen.getByText("Sign in with your LYDO/PCYDO admin credentials.")).toBeInTheDocument();
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
