/**
 * UI copy in both app languages.
 *
 * `fil` is the product default — PadaLock speaks Taglish the way an OFW family
 * actually does. `en` exists so a non-Tagalog speaker (a judge, a partner bank,
 * a recipient in a mixed household) can read the same screens.
 *
 * Keys are flat and dotted so a missing translation is a compile error rather
 * than a silent fallback.
 */

export type Lang = "fil" | "en";

export const LANGS: ReadonlyArray<{ id: Lang; label: string; native: string }> = [
  { id: "fil", label: "Filipino", native: "Filipino / Taglish" },
  { id: "en", label: "English", native: "English" },
];

const fil = {
  /* intro carousel */
  "intro.skip": "Laktawan",
  "intro.next": "Susunod",
  "intro.getStarted": "Simulan",
  "intro.1.title": "Padalang may pakay",
  "intro.1.body":
    "Hatiin ang padala mo sa mga bucket — matrikula, kuryente, gamot, grocery, free cash. Ang restricted na bucket ay sa whitelisted merchant lang napupunta.",
  "intro.2.title": "Isang tap para sa pamilya",
  "intro.2.body":
    "I-save ang family group minsan lang. Awtomatikong hinahati ang padala sa bucket ng bawat miyembro — hindi na kailangang i-type ulit ang mga address.",
  "intro.3.title": "Mabilis, malinaw, nasa Stellar",
  "intro.3.body":
    "Ilang segundo lang ang paglipat ng pera sa Stellar network, at nakikita on-chain ang bawat padala.",

  /* nav */
  "nav.home": "Home",
  "nav.padala": "Padala",
  "nav.family": "Pamilya",
  "nav.settings": "Settings",

  /* greetings */
  "greet.morning": "Magandang umaga",
  "greet.afternoon": "Magandang hapon",
  "greet.evening": "Magandang gabi",

  /* dashboard */
  "dash.title": "Padala",
  "dash.availableBalance": "Available Balance",
  "dash.walletAddress": "Wallet address",
  "dash.copy": "Copy",
  "dash.copied": "Nakopya",
  "dash.sendPadala": "Magpadala",
  "dash.fundTestnet": "Fund testnet",
  "dash.funding": "Nagpo-pondo…",
  "dash.receive": "Tumanggap",
  "dash.nativeAsset": "Native asset",
  "dash.lockWallet": "I-lock ang wallet",
  "dash.settings": "Settings",
  "dash.sendUsdc": "Magpadala ng USDC",
  "dash.sendXlm": "Magpadala ng XLM",
  "dash.familyCircle": "Pamilya",
  "dash.padalaHistory": "Kasaysayan",
  "dash.networkFees": "Pambayad sa network",
  "dash.manageRecipients": "Mga tatanggap",
  "dash.trackClaim": "Subaybayan at i-claim",
  "dash.thisMonth": "Ngayong buwan",
  "dash.bucketsClaimed": "Na-claim",
  "dash.pendingClaims": "Naghihintay",

  /* settings — sections */
  "set.title": "Settings",
  "set.profile": "Profile",
  "set.displayName": "Pangalan",
  "set.namePlaceholder": "Ano ang pangalan mo?",
  "set.save": "I-save",
  "set.saved": "Na-save",
  "set.appearance": "Itsura",
  "set.theme": "Tema",
  "set.themeLight": "Maliwanag",
  "set.themeDark": "Madilim",
  "set.themeSystem": "Sistema",
  "set.language": "Wika",

  /* settings — wallet */
  "set.walletMode": "Wallet mode",
  "set.builtIn": "Built-in wallet",
  "set.external": "External wallet",
  "set.selfCustodial": "Sarili mong susi",
  "set.connected": "Nakakonekta",
  "set.localKeysNote":
    "Naka-encrypt ang susi sa device na ito. Dito mismo ang pirma.",
  "set.externalKeysNote":
    "Papunta sa naka-connect mong wallet ang pirma (Freighter, xBull, …).",

  /* settings — network */
  "set.network": "Network — Stellar",
  "set.yourAddress": "Iyong address",
  "set.padalockContract": "PadaLock contract",
  "set.usdcContract": "USDC contract",
  "set.rpc": "RPC",

  /* settings — portfolio */
  "set.portfolio": "Portfolio",
  "set.portfolioSub": "Lahat ng galaw sa wallet na ito",
  "set.txLoading": "Kinukuha ang transactions…",
  "set.txEmpty": "Wala pang transaction sa wallet na ito.",
  "set.txError": "Hindi makuha ang transactions.",
  "set.txSent": "Padala",
  "set.txReceived": "Natanggap",
  "set.txCreated": "Binuksan ang account",
  "set.refresh": "I-refresh",
  "set.totalIn": "Pumasok",
  "set.totalOut": "Lumabas",
  "set.txCount": "Transactions",

  /* settings — danger */
  "set.lockWallet": "I-lock ang wallet",
  "set.disconnectWallet": "I-disconnect ang wallet",
  "set.forgetWallet": "Kalimutan ang wallet sa device na ito",
  "set.forgetConfirm":
    "Kalimutan ang wallet sa device na ito? Kailangan ng recovery phrase para maibalik ang built-in wallet. Hindi na ito maibabalik.",
} as const;

export type MsgKey = keyof typeof fil;

const en: Record<MsgKey, string> = {
  "intro.skip": "Skip",
  "intro.next": "Next",
  "intro.getStarted": "Get Started",
  "intro.1.title": "Purpose-locked padala",
  "intro.1.body":
    "Split money you send into buckets — tuition, utilities, medical, groceries, free cash. Restricted buckets only pay whitelisted merchants.",
  "intro.2.title": "One tap for the family",
  "intro.2.body":
    "Save a family group once. Sending splits automatically across each member's bucket — no repeat typing addresses.",
  "intro.3.title": "Fast, transparent, on Stellar",
  "intro.3.body":
    "Funds move on the Stellar network in seconds, with every transfer visible on-chain.",

  "nav.home": "Home",
  "nav.padala": "Transfers",
  "nav.family": "Family",
  "nav.settings": "Settings",

  "greet.morning": "Good morning",
  "greet.afternoon": "Good afternoon",
  "greet.evening": "Good evening",

  "dash.title": "Transfers",
  "dash.availableBalance": "Available Balance",
  "dash.walletAddress": "Wallet address",
  "dash.copy": "Copy",
  "dash.copied": "Copied",
  "dash.sendPadala": "Send money",
  "dash.fundTestnet": "Fund testnet",
  "dash.funding": "Funding…",
  "dash.receive": "Receive",
  "dash.nativeAsset": "Native asset",
  "dash.lockWallet": "Lock wallet",
  "dash.settings": "Settings",
  "dash.sendUsdc": "Send USDC",
  "dash.sendXlm": "Send XLM",
  "dash.familyCircle": "Family circle",
  "dash.padalaHistory": "History",
  "dash.networkFees": "Network fees",
  "dash.manageRecipients": "Manage recipients",
  "dash.trackClaim": "Track & claim",
  "dash.thisMonth": "This month",
  "dash.bucketsClaimed": "Buckets claimed",
  "dash.pendingClaims": "Pending claims",

  "set.title": "Settings",
  "set.profile": "Profile",
  "set.displayName": "Display name",
  "set.namePlaceholder": "What should we call you?",
  "set.save": "Save",
  "set.saved": "Saved",
  "set.appearance": "Appearance",
  "set.theme": "Theme",
  "set.themeLight": "Light",
  "set.themeDark": "Dark",
  "set.themeSystem": "System",
  "set.language": "Language",

  "set.walletMode": "Wallet mode",
  "set.builtIn": "Built-in wallet",
  "set.external": "External wallet",
  "set.selfCustodial": "Self-custodial",
  "set.connected": "Connected",
  "set.localKeysNote": "Keys encrypted on this device. Signing happens locally.",
  "set.externalKeysNote":
    "Signing requests go to your connected wallet (Freighter, xBull, …).",

  "set.network": "Network — Stellar",
  "set.yourAddress": "Your address",
  "set.padalockContract": "PadaLock contract",
  "set.usdcContract": "USDC contract",
  "set.rpc": "RPC",

  "set.portfolio": "Portfolio",
  "set.portfolioSub": "Every movement on this wallet",
  "set.txLoading": "Loading transactions…",
  "set.txEmpty": "No transactions on this wallet yet.",
  "set.txError": "Could not load transactions.",
  "set.txSent": "Sent",
  "set.txReceived": "Received",
  "set.txCreated": "Account created",
  "set.refresh": "Refresh",
  "set.totalIn": "In",
  "set.totalOut": "Out",
  "set.txCount": "Transactions",

  "set.lockWallet": "Lock wallet",
  "set.disconnectWallet": "Disconnect wallet",
  "set.forgetWallet": "Forget wallet on this device",
  "set.forgetConfirm":
    "Forget wallet on this device? Built-in wallet requires your recovery phrase to restore. This cannot be undone.",
};

export const DICT: Record<Lang, Record<MsgKey, string>> = { fil, en };
