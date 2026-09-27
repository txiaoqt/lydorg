/**
 * Inquiry Reply Gmail / Google Account Chooser URL Builder
 *
 * Implements Option A with Google Account Chooser:
 * 1. Takes the authoritative inquiry recipient email, inquiry subject, and optional drafted body.
 * 2. Prepares the destination Gmail Compose URL (to, su, body).
 * 3. Wraps the destination in Google's AccountChooser endpoint (https://accounts.google.com/AccountChooser?service=mail&continue=...).
 * 4. This guarantees the administrator is presented with Google's Account Chooser BEFORE Gmail Compose loads,
 *    allowing them to choose the appropriate Google/Workspace account rather than defaulting to /u/0.
 * 5. Does NOT include fake or unsupported query parameters like from= or sender=.
 */

export interface BuildInquiryGmailUrlParams {
  recipientEmail: string;
  subject: string;
  body?: string;
}

/**
 * Builds the inner Gmail web compose URL.
 */
export function buildGmailComposeUrl({
  recipientEmail,
  subject,
  body,
}: BuildInquiryGmailUrlParams): string {
  const cleanRecipient = recipientEmail.trim();
  const cleanSubject = subject?.trim() || "Inquiry";
  const replySubject = cleanSubject.toLowerCase().startsWith("re:")
    ? cleanSubject
    : `Re: ${cleanSubject}`;

  let composeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(cleanRecipient)}&su=${encodeURIComponent(replySubject)}`;
  if (body && body.trim()) {
    composeUrl += `&body=${encodeURIComponent(body.trim())}`;
  }

  return composeUrl;
}

/**
 * Builds the Google Account Chooser URL with the continue parameter set to the Gmail Compose URL.
 */
export function buildInquiryGmailAccountChooserUrl(params: BuildInquiryGmailUrlParams): string {
  const composeUrl = buildGmailComposeUrl(params);
  return `https://accounts.google.com/AccountChooser?service=mail&continue=${encodeURIComponent(composeUrl)}`;
}
