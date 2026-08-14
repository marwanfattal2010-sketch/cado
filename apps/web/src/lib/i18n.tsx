import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Arabic, and the machinery to add any other language later.
 *
 * THE ONE RULE THAT MAKES THIS SAFE TO SHIP HALF-DONE
 *
 * A missing translation falls back to English. Not to a blank, not to the
 * key name. So the site is never broken by a string nobody has got to yet —
 * it is just a screen with some English left on it. That means Arabic can be
 * filled in a page at a time, deployed at any point, and never leave a
 * customer staring at `checkout.pay_button`.
 *
 * WHAT IS DELIBERATELY NOT TRANSLATED
 *
 * Product titles, store names and category names come from the database and
 * are written by real shops. Machine-translating a shop's own name or a
 * product it named itself would be putting words in its mouth, and would be
 * wrong more often than it was right. Those stay exactly as the store wrote
 * them, in whatever language it wrote them.
 */

export type Lang = "en" | "ar";

const STORAGE_KEY = "cado-language";

/**
 * Every translated string. English is the source of truth: a key that is
 * missing from `ar` renders the English, by design.
 *
 * Keys are grouped by where they appear, not by meaning, because the next
 * person translating will be working through one screen at a time.
 */
const AR: Record<string, string> = {
  // Bottom navigation
  "nav.home": "الرئيسية",
  "nav.giftCards": "بطاقات الهدايا",
  "nav.favorites": "المفضلة",
  "nav.orders": "طلباتي",
  "nav.account": "حسابي",

  // Header
  "header.deliverTo": "التوصيل إلى",
  "header.cart": "السلة",
  "header.yourCarts": "سلاتك",
  "header.search": "ابحث عن هدية",

  // Home
  "home.heroTitle": "اختَر الآن، يصل الليلة",
  "home.heroSubtitle": "هدايا من متاجر لبنانية حقيقية.",
  "home.shopNow": "تسوّق الآن",
  "home.helpMeChoose": "ساعدني أختار",
  "home.stores": "المتاجر",
  "home.newOnCado": "جديد على كادو",
  "home.sameDay": "توصيل بنفس اليوم",
  "home.occasions": "المناسبات",
  "home.shopByCategory": "تسوّق حسب الفئة",
  "home.seeAll": "شاهد الكل",

  // Cart and carts
  "cart.yourCarts": "سلاتك",
  "cart.yourCart": "سلتك",
  "cart.empty": "لا يوجد شيء في السلة بعد.",
  "cart.onePerStore": "سلة لكل متجر — كل واحدة تُوصَّل برحلة خاصة، لذلك تُدفع كل واحدة على حدة.",
  "cart.addMore": "أضف المزيد",
  "cart.viewCart": "افتح السلة",
  "cart.deleteCart": "احذف السلة",
  "cart.changeAddress": "غيّر العنوان",
  "cart.subtotal": "المجموع",
  "cart.delivery": "التوصيل",
  "cart.total": "الإجمالي",
  "cart.checkout": "إتمام الطلب",
  "cart.remove": "إزالة",
  "cart.browseGifts": "تصفّح الهدايا",

  // Checkout
  "checkout.title": "إتمام الطلب",
  "checkout.deliveryAddress": "عنوان التوصيل",
  "checkout.whereShouldItGo": "إلى أين نوصله؟",
  "checkout.toMe": "إليّ",
  "checkout.toMeDesc": "نوصله إلى عنوانك وتسلّمه أنت بنفسك.",
  "checkout.straightToThem": "مباشرة إليه",
  "checkout.straightToThemDesc": "نوصله إلى الشخص الذي سيستلم الهدية.",
  "checkout.when": "الوقت",
  "checkout.now": "الآن",
  "checkout.payment": "الدفع",
  "checkout.cod": "الدفع عند الاستلام",
  "checkout.codNote": "ادفع للسائق عند وصول الطلب",
  "checkout.placeOrder": "أرسل الطلب",
  "checkout.fullName": "الاسم الكامل",
  "checkout.phone": "رقم الهاتف",
  "checkout.city": "المدينة",
  "checkout.area": "المنطقة",
  "checkout.street": "الشارع",
  "checkout.building": "البناية",

  // Account
  "account.title": "حسابي",
  "account.logIn": "تسجيل الدخول",
  "account.logOut": "تسجيل الخروج",
  "account.createAccount": "إنشاء حساب",
  "account.settings": "الإعدادات",
  "account.favorites": "المفضلة",
  "account.language": "اللغة",
  "account.helpCenter": "المساعدة",
  "account.myOrders": "طلباتي",
  "account.giftCards": "بطاقات الهدايا",

  // Language screen
  "language.title": "اللغة",
  "language.note": "اختيار اللغة يغيّر لغة الموقع. أسماء المتاجر والمنتجات تبقى كما كتبها أصحابها.",

  // Common
  "common.back": "رجوع",
  "common.close": "إغلاق",
  "common.cancel": "إلغاء",
  "common.save": "حفظ",
  "common.clearAll": "مسح الكل",
  "common.filter": "تصفية",
  "common.loading": "جارٍ التحميل…",
};

const DICTIONARIES: Record<Lang, Record<string, string>> = { en: {}, ar: AR };

/** Arabic runs right to left; everything else here does not. */
export function isRtl(lang: Lang) {
  return lang === "ar";
}

function readStored(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** `t("nav.home", "Home")` — the second argument IS the English. */
  t: (key: string, english: string) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStored);

  /**
   * The direction and the lang attribute go on <html>, not on a wrapper.
   * Putting `dir` on a div leaves the scrollbar, the text selection and any
   * portalled sheet on the wrong side.
   */
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("lang", lang);
    el.setAttribute("dir", isRtl(lang) ? "rtl" : "ltr");
    // The Arabic face is already configured in tailwind; this switches the
    // whole page onto it rather than tagging individual elements.
    el.classList.toggle("font-arabic", isRtl(lang));
  }, [lang]);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang: (l) => {
        try {
          localStorage.setItem(STORAGE_KEY, l);
        } catch {
          // A blocked localStorage should not stop the language changing.
        }
        setLangState(l);
      },
      t: (key, english) => DICTIONARIES[lang][key] ?? english,
    }),
    [lang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Used as `const { t } = useT()` then `t("nav.home", "Home")`.
 *
 * Passing the English in at the call site is deliberate: it keeps the
 * sentence readable in the component, and it means deleting a key from the
 * dictionary degrades to English instead of to nothing.
 */
export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Never throw for a missing provider — a translation helper must not be
    // the thing that takes the shop down.
    return { lang: "en" as Lang, setLang: () => {}, t: (_k: string, english: string) => english };
  }
  return ctx;
}
