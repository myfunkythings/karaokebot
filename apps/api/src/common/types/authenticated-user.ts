import type { StaffRole } from "@karaoke/contracts";

export type AuthenticatedUser = {
  id: string;
  login: string;
  displayName: string;
  role: StaffRole;
};
