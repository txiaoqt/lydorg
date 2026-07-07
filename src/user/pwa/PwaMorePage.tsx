import {
  BookOpen, ChevronRight, FileText, HelpCircle, Info, LogOut, Medal, Megaphone,
  Phone, ScrollText, Settings, ShieldCheck, UserRound, UsersRound,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePwaNavigation } from "./hooks/usePwaNavigation";
import { PWA_ROUTES } from "./pwaRoutes";
import { PWA_ENTRY_ROUTE } from "./pwaAuthFlow";

const groups = [
  {
    label: "Account",
    links: [
      { label: "Organization Profile", detail: "Identity, classification and contacts", path: PWA_ROUTES.profile, icon: UserRound },
      { label: "Settings", detail: "App preferences, storage and accessibility", path: PWA_ROUTES.settings, icon: Settings },
    ],
  },
  {
    label: "Programs",
    links: [
      { label: "YPOP Incentive", detail: "Semesters, scores and proof records", path: PWA_ROUTES.ypop, icon: Medal },
    ],
  },
  {
    label: "Resources",
    links: [
      { label: "Organization Directory", detail: "Discover verified youth organizations", path: PWA_ROUTES.organizations, icon: UsersRound },
      { label: "Templates", detail: "View and download official files", path: PWA_ROUTES.templates, icon: FileText },
      { label: "News Releases", detail: "Official LYDO updates", path: PWA_ROUTES.news, icon: Megaphone },
    ],
  },
  {
    label: "Help & Support",
    links: [
      { label: "Inquiries", detail: "Send and review inquiries", path: PWA_ROUTES.inquiries, icon: HelpCircle },
      { label: "FAQs", detail: "Answers about using Y-TRACE", path: PWA_ROUTES.faqs, icon: BookOpen },
      { label: "Contact LYDO / PCYDO", detail: "Office and support contact details", path: PWA_ROUTES.contact, icon: Phone },
    ],
  },
  {
    label: "About",
    links: [
      { label: "About Y-TRACE", detail: "Purpose, workflow and app information", path: PWA_ROUTES.about, icon: Info },
      { label: "Privacy Policy", detail: "How information is handled", path: PWA_ROUTES.privacy, icon: ShieldCheck },
      { label: "Terms of Service", detail: "Terms for using the platform", path: PWA_ROUTES.terms, icon: ScrollText },
    ],
  },
];

export function PwaMorePage({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const { go } = usePwaNavigation();
  const navigate = useNavigate();
  const [signOutConfirmationOpen, setSignOutConfirmationOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const confirmSignOut = async () => {
    setSigningOut(true);
    try {
      await onSignOut();
      setSignOutConfirmationOpen(false);
      navigate(PWA_ENTRY_ROUTE, { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="pwa-stack pwa-more-page">
      {groups.map((group) => (
        <section className="pwa-menu-group" key={group.label}>
          <h2 className="pwa-section-title">{group.label}</h2>
          <div className="pwa-card pwa-menu-card">
            {group.links.map(({ label, detail, path, icon: Icon }) => (
              <button key={path} type="button" onClick={() => go(path)}>
                <span className="pwa-menu-icon"><Icon aria-hidden="true" /></span>
                <span className="pwa-menu-copy"><strong>{label}</strong><small>{detail}</small></span>
                <ChevronRight aria-hidden="true" className="pwa-chevron" />
              </button>
            ))}
          </div>
        </section>
      ))}
      <button type="button" className="pwa-signout-button" onClick={() => setSignOutConfirmationOpen(true)}>
        <LogOut aria-hidden="true" /> Sign Out
      </button>

      <AlertDialog open={signOutConfirmationOpen} onOpenChange={setSignOutConfirmationOpen}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your Y-TRACE account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={signingOut}
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={(event) => {
                event.preventDefault();
                void confirmSignOut();
              }}
            >
              {signingOut ? "Signing out..." : "Sign Out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
