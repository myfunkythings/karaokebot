import { Body, Controller, Get, Put, Query } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.js";
import { SettingsService } from "./settings.service.js";
import { UpdateSettingsDto } from "./settings.dto.js";
import { RequestChannelsService } from "../request-channels/request-channels.service.js";

@Controller("settings")
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly requestChannelsService: RequestChannelsService
  ) {}

  @Roles("viewer", "host", "owner")
  @Get("global")
  async getGlobalSettings(@Query("channel") channelSlug?: string) {
    const channel = await this.requestChannelsService.getRequiredChannelBySlug(
      channelSlug
    );
    return this.settingsService.getGlobalSettings(channel.slug);
  }

  @Roles("owner")
  @Put("global")
  async updateGlobalSettings(
    @Body() body: UpdateSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Query("channel") channelSlug?: string
  ) {
    const channel = await this.requestChannelsService.getRequiredChannelBySlug(
      channelSlug
    );
    return this.settingsService.updateGlobalSettings(body, user.id, channel.slug);
  }
}
