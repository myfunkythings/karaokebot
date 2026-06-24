import { Module } from "@nestjs/common";
import { RequestChannelsService } from "./request-channels.service.js";

@Module({
  providers: [RequestChannelsService],
  exports: [RequestChannelsService]
})
export class RequestChannelsModule {}
