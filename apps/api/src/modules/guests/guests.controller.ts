import { Controller, Get, Query } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { GuestsService } from "./guests.service.js";

@Controller("guests")
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Roles("viewer", "host", "owner")
  @Get()
  async searchGuests(@Query("query") query = "") {
    if (!query.trim()) {
      return [];
    }
    return this.guestsService.searchGuests(query.trim());
  }
}
