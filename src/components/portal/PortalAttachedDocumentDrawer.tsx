import React from "react";
import {
  PortalDocumentDrawer,
  type PortalDocumentDrawerProps,
} from "./PortalDocumentDrawer";

export type PortalAttachedDocumentDrawerProps = Omit<
  PortalDocumentDrawerProps,
  "mode"
>;

export const PortalAttachedDocumentDrawer: React.FC<PortalAttachedDocumentDrawerProps> = (
  props
) => {
  return <PortalDocumentDrawer mode="attached" {...props} />;
};
