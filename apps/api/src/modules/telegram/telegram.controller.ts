import {
  Body,
  Controller,
  Get,
  Headers,
  Post
} from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator.js";
import { TelegramService } from "./telegram.service.js";

@Controller("telegram")
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Public()
  @Post("webhook")
  async handleWebhook(
    @Body() body: Record<string, unknown>,
    @Headers("x-telegram-bot-api-secret-token") secret?: string
  ) {
    return this.telegramService.handleWebhook(body, secret);
  }

  @Public()
  @Post("status")
  async getGuestStatus(
    @Body() body: { telegramUserId?: string },
    @Headers("x-telegram-bot-api-secret-token") secret?: string
  ) {
    return this.telegramService.getGuestStatus(body.telegramUserId ?? "", secret);
  }

  @Public()
  @Get("settings")
  async getBotReplyTemplates(
    @Headers("x-telegram-bot-api-secret-token") secret?: string
  ) {
    return this.telegramService.getBotReplyTemplates(secret);
  }
}
