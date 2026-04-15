import { Body, Controller, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.js";
import { CreateManualSongRequestDto, UpdateSongRequestRawTextDto } from "./song-requests.dto.js";
import { SongRequestsService } from "./song-requests.service.js";

@Controller("song-requests")
export class SongRequestsController {
  constructor(private readonly songRequestsService: SongRequestsService) {}

  @Roles("host", "owner")
  @Post("manual")
  async createManualRequest(
    @Body() body: CreateManualSongRequestDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.songRequestsService.createManualRequest({
      displayName: body.displayName,
      rawText: body.rawText,
      artist: body.artist,
      title: body.title,
      actorStaffId: user.id
    });
  }

  @Roles("host", "owner")
  @Patch(":requestId/raw-text")
  async updateRequestRawText(
    @Param("requestId") requestId: string,
    @Body() body: UpdateSongRequestRawTextDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.songRequestsService.updateRequestRawText({
      requestId,
      rawText: body.rawText,
      actorStaffId: user.id
    });
  }
}
