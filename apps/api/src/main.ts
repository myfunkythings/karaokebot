import cookieParser from "cookie-parser";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const frontendUrl = configService.getOrThrow<string>("FRONTEND_URL");
  const sessionSecret = configService.getOrThrow<string>("SESSION_SECRET");
  const port = configService.get<number>("PORT") ?? 3000;

  app.setGlobalPrefix("api");
  app.use(cookieParser(sessionSecret));
  app.enableCors({
    origin: frontendUrl,
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true
    })
  );

  await app.listen(port);
}

bootstrap();
