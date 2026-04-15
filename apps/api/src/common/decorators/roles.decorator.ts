import { SetMetadata } from "@nestjs/common";
import type { StaffRole } from "@karaoke/contracts";

export const ROLES_KEY = "allowedRoles";
export const Roles = (...roles: StaffRole[]) => SetMetadata(ROLES_KEY, roles);
