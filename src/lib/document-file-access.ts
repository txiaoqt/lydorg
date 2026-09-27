import type { SubmissionFile } from "./lydo-connect-data";

const approvedStatuses = new Set(["approved", "approved_green"]);
const correctionStatuses = new Set(["needs_revision"]);

export const isApprovedRegistrationDocument = (
  file?: Pick<SubmissionFile, "adminStatus"> | null,
) => Boolean(file && approvedStatuses.has(file.adminStatus));

export const resolveRegistrationDocumentAccess = ({
  file,
  submissionApproved = false,
  isSuspended = false,
}: {
  file?: Pick<SubmissionFile, "adminStatus" | "fileUrl"> | null;
  submissionApproved?: boolean;
  isSuspended?: boolean;
}) => {
  const approved = isApprovedRegistrationDocument(file);
  const hasAttachedFile = Boolean(file?.fileUrl?.trim());
  return {
    approved,
    hasAttachedFile,
    canViewAttachedFile: hasAttachedFile,
    canReplaceOrRemove: Boolean(
      !isSuspended &&
      file &&
      !approved &&
      !submissionApproved &&
      correctionStatuses.has(file.adminStatus),
    ),
  };
};

