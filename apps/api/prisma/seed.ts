import bcrypt from "bcryptjs";
import { PrismaClient, StaffRole } from "@prisma/client";

const prisma = new PrismaClient();

const defaultSettings = {
  antiSpamSeconds: 300,
  skipDownPositions: 3,
  queuePolicyFlags: {
    prioritizeFirstTimeSinger: true,
    prioritizeLowerSungCount: true,
    prioritizeRequestTime: true
  },
  botReplyTemplates: {
    startMessage:
      "Привет! Отправь сообщение в формате исполнитель + песня, и заявка попадёт ведущему.",
    unknownCommand:
      "Не понял команду. Просто отправь сообщение с исполнителем и песней, например: Кино - Пачка сигарет.",
    emptyMessage: "Пришлите, пожалуйста, исполнителя и название песни.",
    requestAccepted:
      "Заявка принята. Если ведущий не успеет распознать песню, он уточнит её в админ-панели.",
    requestRejectedRateLimit:
      "Слишком часто. Подожди немного и отправь заявку ещё раз.",
    requestRejectedNoSession:
      "Сейчас приём заявок закрыт. Попробуй чуть позже, когда ведущий откроет смену.",
    statusCurrentPerformer: "Ты сейчас поёшь или уже на подходе к сцене.",
    statusNoGuestProfile: "У тебя пока нет активных заявок.",
    statusNoActiveRequests: "У тебя сейчас нет заявок в активной смене.",
    statusQueuedSummary:
      "Ты в очереди. Следи за сценой и подходи, когда тебя позовут.\n\nТекущая заявка: {{title}}\nПозиция в очереди: {{position}}.",
    fallbackPositionUnavailable:
      "Не удалось получить позицию: сейчас недоступны и новая программа, и Google Sheets.",
    fallbackRequestSaveFailed:
      "Не удалось сохранить заявку: недоступны и новая программа, и Google Sheets.",
    fallbackStatusNoRequests: "Сейчас заявок нет.",
    fallbackStatusNoActiveRequests: "Сейчас ваших активных заявок нет.",
    fallbackStatusQueuedSummary:
      "🎶 Ваша заявка принята!\n\n👉 В очереди приоритет у тех, кто ещё не пел, потом у тех, кто спел меньше песен, и только потом учитывается время заявки. Так что система старается, чтобы все успели спеть.\n\n⏳ {{queue_tail}}",
    fallbackStatusQueuedNoAhead: "Прямо сейчас активных заявок перед вами нет.",
    fallbackStatusQueuedAheadTemplate: "Перед вами сейчас примерно {{before}} заявок.",
    telegramStatusButtonText: "Узнать мою позицию",
    telegramViewQueueButtonText: "Посмотреть очередь",
    telegramCancelButtonText: "Удалить все мои заявки из очереди",
    telegramCancelConfirmButtonText: "Да, удалить мои заявки",
    telegramCancelAbortButtonText: "Не удалять",
    telegramViewQueueReplyTemplate: "Публичная очередь: {{url}}",
    telegramCancelConfirmationMessage:
      "Точно удалить все твои заявки из очереди? Это действие нельзя отменить из Telegram.\n\nЕсли нажал случайно, выбери «Не удалять».",
    telegramCancelAbortMessage: "Ок, заявки оставил в очереди.",
    telegramNextSongNotification:
      "🎤 Скоро ваш выход!\n\nПеред вами осталась одна песня. Пожалуйста, подготовьтесь и будьте рядом со сценой."
  },
  uiLabels: {
    next: "Следующий исполнитель",
    defer: "Пропустить",
    leftVenue: "Человек ушёл",
    undo: "Отменить исполнение"
  }
};

const defaultChannels = [
  {
    slug: "main",
    name: "Основной бот",
    color: "#203B47",
    sortOrder: 10
  },
  {
    slug: "secondary",
    name: "Второй бот",
    color: "#DE7440",
    sortOrder: 20
  },
  {
    slug: "petya",
    name: "Петя",
    color: "#6D5BD0",
    sortOrder: 30
  }
];

async function upsertOwner() {
  const login = process.env.OWNER_LOGIN ?? "owner";
  const password = process.env.OWNER_PASSWORD ?? "change-me-now";
  const displayName = process.env.OWNER_DISPLAY_NAME ?? "Owner";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.staffUser.upsert({
    where: { login },
    update: {
      displayName,
      role: StaffRole.owner,
      passwordHash,
      isActive: true
    },
    create: {
      login,
      displayName,
      role: StaffRole.owner,
      passwordHash
    }
  });
}

async function upsertChannels() {
  await Promise.all(
    defaultChannels.map((channel) =>
      prisma.requestChannel.upsert({
        where: { slug: channel.slug },
        update: {
          name: channel.name,
          color: channel.color,
          sortOrder: channel.sortOrder,
          isActive: true
        },
        create: {
          slug: channel.slug,
          name: channel.name,
          color: channel.color,
          sortOrder: channel.sortOrder,
          isActive: true
        }
      })
    )
  );
}

async function upsertSettings() {
  await Promise.all(
    Object.entries(defaultSettings).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { valueJson: value },
        create: { key, valueJson: value }
      })
    )
  );
}

async function main() {
  await upsertOwner();
  await upsertChannels();
  await upsertSettings();
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
