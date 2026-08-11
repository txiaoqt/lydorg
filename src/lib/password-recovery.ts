export type PasswordRecoveryParams = {
  hasRecoveryCredentials: boolean;
  code: string;
  tokenHash: string;
  accessToken: string;
  refreshToken: string;
  errorMessage: string;
};

export const parsePasswordRecoveryUrl = (href: string): PasswordRecoveryParams => {
  const url = new URL(href, "https://y-trace.local");
  const query = url.searchParams;
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const type = query.get("type") || hash.get("type") || "";
  const code = query.get("code") || "";
  const tokenHash = query.get("token_hash") || "";
  const accessToken = hash.get("access_token") || query.get("access_token") || "";
  const refreshToken = hash.get("refresh_token") || query.get("refresh_token") || "";
  const errorMessage =
    query.get("error_description") ||
    hash.get("error_description") ||
    query.get("error") ||
    hash.get("error") ||
    "";

  return {
    hasRecoveryCredentials: type === "recovery" || Boolean(code || tokenHash || (accessToken && refreshToken)),
    code,
    tokenHash,
    accessToken,
    refreshToken,
    errorMessage: errorMessage.replace(/\+/g, " "),
  };
};
