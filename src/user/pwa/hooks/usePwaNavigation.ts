import { useLocation, useNavigate } from "react-router-dom";
import { getPwaParentRoute, isPwaRoute, PWA_ROUTES } from "../pwaRoutes";

type NavigateOptions = {
  replace?: boolean;
};

export function usePwaNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const go = (to: string, options: NavigateOptions = {}) => {
    const safeTarget = isPwaRoute(to) ? to : PWA_ROUTES.home;
    navigate(safeTarget, {
      replace: options.replace,
      state: {
        pwaFrom: location.pathname,
      },
    });
  };

  const back = (fallback = getPwaParentRoute(location.pathname)) => {
    const from = (location.state as { pwaFrom?: string } | null)?.pwaFrom;
    if (from && isPwaRoute(from)) {
      navigate(-1);
      return;
    }
    navigate(fallback, { replace: true, state: { pwaFrom: location.pathname } });
  };

  return { go, back };
}

