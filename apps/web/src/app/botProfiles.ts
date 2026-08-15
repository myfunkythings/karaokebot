export type BotSlug = "mishka" | "zapoi" | "petya";

export type BotProfile = {
  slug: BotSlug;
  channelSlug: "main" | "secondary" | "petya";
  title: string;
  adminTitle: string;
  hostnames: string[];
  pathPrefixes: string[];
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
    pathPrefixes: [],
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
    pathPrefixes: [],
    publicPath: "/",
    adminPath: "/admin",
    queuePath: "/admin",
    themeClassName: "bot-theme--zapoi"
  },
  petya: {
    slug: "petya",
    channelSlug: "petya",
    title: "Петя",
    adminTitle: "PETYA KARAOKE",
    hostnames: [],
    pathPrefixes: ["/karaoke-petya"],
    publicPath: "/queue",
    adminPath: "/",
    queuePath: "/",
    themeClassName: "bot-theme--petya"
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

export function getActiveBotProfile(
  hostname = window.location.hostname,
  pathname = window.location.pathname
): BotProfile {
  return findProfileByHostname(hostname) ?? findProfileByPathname(pathname) ?? botProfiles.mishka;
}

export function getBotProfileBySlug(slug: string | undefined): BotProfile | null {
  if (!slug) {
    return null;
  }

  return botProfiles[slug as BotSlug] ?? null;
}

export function getRuntimeRouterBase(
  hostname = window.location.hostname,
  pathname = window.location.pathname
) {
  const profileForHost = findProfileByHostname(hostname);
  if (profileForHost) {
    return "";
  }

  const pathPrefix = findProfileByPathname(pathname)?.pathPrefixes.find((prefix) =>
    pathMatchesPrefix(pathname, prefix)
  );
  if (pathPrefix) {
    return pathPrefix;
  }

  const buildBase = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return buildBase === "/" ? "" : buildBase;
}

export function getLoginPath(
  hostname = window.location.hostname,
  pathname = window.location.pathname
) {
  return `${getRuntimeRouterBase(hostname, pathname)}/login`;
}

function findProfileByHostname(hostname: string) {
  return Object.values(botProfiles).find((profile) => profile.hostnames.includes(hostname));
}

function findProfileByPathname(pathname: string) {
  return Object.values(botProfiles).find((profile) =>
    profile.pathPrefixes.some((prefix) => pathMatchesPrefix(pathname, prefix))
  );
}

function pathMatchesPrefix(pathname: string, prefix: string) {
  const normalizedPathname = (pathname.split(/[?#]/, 1).at(0) ?? "/").replace(/\/+$/, "") || "/";
  const normalizedPrefix = prefix.replace(/\/+$/, "") || "/";

  return normalizedPathname === normalizedPrefix || normalizedPathname.startsWith(`${normalizedPrefix}/`);
}
