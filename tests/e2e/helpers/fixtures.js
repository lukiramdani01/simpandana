/**
 * Standard Test Fixtures for TataDana E2E Test Suite
 */

const FIXTURE_USERS = {
  starterUser: {
    id: "u-starter-001-uuid",
    full_name: "Budi Santoso",
    phone: "+6281234567890",
    email: "budi@tatadana.id",
    plan: "starter",
    role: "user",
    telegram_user_id: 11223344,
    telegram_chat_id: 11223344,
    default_currency: "IDR",
    timezone: "Asia/Jakarta",
  },
  proUser: {
    id: "u-pro-002-uuid",
    full_name: "Siti Rahmawati",
    phone: "+6281987654321",
    email: "siti@tatadana.id",
    plan: "pro",
    role: "user",
    telegram_user_id: 55667788,
    telegram_chat_id: 55667788,
    default_currency: "IDR",
    timezone: "Asia/Jakarta",
  },
  adminUser: {
    id: "u-admin-003-uuid",
    full_name: "Super Administrator",
    phone: "+628111222333",
    email: "admin@tatadana.id",
    plan: "pro",
    role: "superadmin",
    telegram_user_id: 99998888,
    telegram_chat_id: 99998888,
    default_currency: "IDR",
    timezone: "Asia/Jakarta",
  },
};

const FIXTURE_WALLETS = [
  {
    id: "w-cash-001",
    user_id: "u-starter-001-uuid",
    name: "Tunai (Cash)",
    type: "cash",
    balance: 500000,
    is_default: true,
    icon: "banknote",
    color: "#10B981",
  },
  {
    id: "w-bca-002",
    user_id: "u-starter-001-uuid",
    name: "BCA",
    type: "bank",
    balance: 5000000,
    is_default: false,
    icon: "landmark",
    color: "#00529B",
  },
  {
    id: "w-gopay-003",
    user_id: "u-starter-001-uuid",
    name: "GoPay",
    type: "ewallet",
    balance: 350000,
    is_default: false,
    icon: "wallet",
    color: "#00AED6",
  },
];

const FIXTURE_CATEGORIES = [
  { id: "c-food-01", name: "Makanan & Minuman", type: "expense", icon: "utensils", color: "#F97316" },
  { id: "c-trans-02", name: "Transportasi", type: "expense", icon: "car", color: "#3B82F6" },
  { id: "c-bills-03", name: "Tagihan & Utilitas", type: "expense", icon: "receipt", color: "#EF4444" },
  { id: "c-ent-04", name: "Hiburan", type: "expense", icon: "film", color: "#8B5CF6" },
  { id: "c-salary-05", name: "Gaji & Pendapatan", type: "income", icon: "briefcase", color: "#10B981" },
];

function createMockTelegramTextUpdate(updateId, text, userId = 11223344) {
  return {
    update_id: updateId,
    message: {
      message_id: 1000 + updateId,
      from: {
        id: userId,
        is_bot: false,
        first_name: "Budi",
        username: "budisantoso",
      },
      chat: {
        id: userId,
        type: "private",
      },
      date: Math.floor(Date.now() / 1000),
      text: text,
    },
  };
}

function createMockTelegramPhotoUpdate(updateId, fileId = "photo_file_123", userId = 55667788) {
  return {
    update_id: updateId,
    message: {
      message_id: 2000 + updateId,
      from: {
        id: userId,
        is_bot: false,
        first_name: "Siti",
        username: "sitirahma",
      },
      chat: {
        id: userId,
        type: "private",
      },
      date: Math.floor(Date.now() / 1000),
      photo: [
        { file_id: "thumb_" + fileId, width: 90, height: 90 },
        { file_id: fileId, width: 800, height: 1200 },
      ],
      caption: "Struk belanja bulanan",
    },
  };
}

function createMockTelegramVoiceUpdate(updateId, durationSeconds = 15, userId = 11223344) {
  return {
    update_id: updateId,
    message: {
      message_id: 3000 + updateId,
      from: {
        id: userId,
        is_bot: false,
        first_name: "Budi",
      },
      chat: {
        id: userId,
        type: "private",
      },
      date: Math.floor(Date.now() / 1000),
      voice: {
        file_id: "voice_file_" + updateId,
        duration: durationSeconds,
        mime_type: "audio/ogg",
      },
    },
  };
}

module.exports = {
  FIXTURE_USERS,
  FIXTURE_WALLETS,
  FIXTURE_CATEGORIES,
  createMockTelegramTextUpdate,
  createMockTelegramPhotoUpdate,
  createMockTelegramVoiceUpdate,
};
