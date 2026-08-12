-- Add the isolated request channel used by the Petya Telegram bot and admin page.
INSERT INTO "RequestChannel" ("id", "slug", "name", "color", "isActive", "sortOrder", "updatedAt")
VALUES ('channel_petya', 'petya', 'Петя', '#6D5BD0', true, 30, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
