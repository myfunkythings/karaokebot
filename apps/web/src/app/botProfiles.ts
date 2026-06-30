export type BotSlug = "mishka" | "zapoi";

export type BotProfile = {
  slug: BotSlug;
  channelSlug: "main" | "secondary";
  title: string;
  adminTitle: string;
  hostnames: string[];
  publicPath: string;
  adminPath: string;
  queuePath: string;
  themeClassName: string;
};

export const botProfiles: Record<BotSlug, BotProfile> = {
  mishka: {
    slug: "mishka",
    channelSlug: "main",
    title: "Мишка",
    adminTitle: "MISHKA KARAOKE",
    hostnames: [],
    publicPath: "/queue/mishka",
    adminPath: "/bot/mishka",
    queuePath: "/bot/mishka",
    themeClassName: "bot-theme--mishka"
  },
  zapoi: {
    slug: "zapoi",
    channelSlug: "secondary",
    title: "Запой",
    adminTitle: "ZAPOI KARAOKE",
    hostnames: ["zapoi.john-doe.ru"],
    publicPath: "/",
    adminPath: "/admin",
    queuePath: "/admin",
    themeClassName: "bot-theme--zapoi"
  }
};

export const adminBotRoutes = Object.fromEntries(
  Object.values(botProfiles).map((profile) => [profile.slug, profile.channelSlug])
) as Record<BotSlug, BotProfile["channelSlug"]>;

export const publicBotRoutes = adminBotRoutes;

export const legacyAdminBotRoutes: Record<string, BotSlug> = {
  main: "mishka",
  secondary: "zapoi"
};

export function getActiveBotProfile(hostname = window.location.hostname): BotProfile {
  return (
    Object.values(botProfiles).find((profile) => profile.hostnames.includes(hostname)) ??
    botProfiles.mishka
  );
}

export function getBotProfileBySlug(slug: string | undefined): BotProfile | null {
  if (!slug) {
    return null;
  }

  return botProfiles[slug as BotSlug] ?? null;
}

export function getRuntimeRouterBase(hostname = window.location.hostname) {
  const profileForHost = Object.values(botProfiles).find((profile) => profile.hostnames.includes(hostname));
  if (profileForHost) {
    return "";
  }

  const buildBase = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return buildBase === "/" ? "" : buildBase;
}

export function getLoginPath() {
  return "/login";
}
