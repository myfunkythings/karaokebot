import { Body, Controller, Get, Put } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.js";
import { SettingsService } from "./settings.service.js";
import { UpdateSettingsDto } from "./settings.dto.js";

@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Roles("viewer", "host", "owner")
  @Get("global")
  async getGlobalSettings() {
    return this.settingsService.getGlobalSettings();
  }

  @Roles("owner")
  @Put("global")
  async updateGlobalSettings(
    @Body() body: UpdateSettingsDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.settingsService.updateGlobalSettings(body, user.id);
  }
}
