(() => {
  "use strict";

  const STORAGE_KEY = "tf-language";
  const translations = {
    "取り扱いカード": "Cards We Carry",
    "買取": "Buying",
    "在庫確認": "Inventory",
    "アクセス": "Access",
    "お問い合わせ": "Contact",
    "公式X（旧Twitter）": "Official X",
    "メニュー": "Menu",
    "家族とプレイヤーの、トレカの拠点。": "A home for families and card players.",
    "トレカfamily 店前入口": "Toreca family storefront",
    "ショーケースに並ぶカード": "Cards in display cases",
    "店頭での買取カウンター": "In-store buying counter",
    "ご家族でカード選び": "A family choosing cards",
    "スライド1へ": "Go to slide 1",
    "スライド2へ": "Go to slide 2",
    "スライド3へ": "Go to slide 3",
    "スライド4へ": "Go to slide 4",
    "トレカfamilyが選ばれる3つの理由": "Three reasons customers choose Toreca family",
    "はじめての方も、買取をご希望の方も、安心してご来店いただけます。": "Whether you are new to trading cards or looking to sell, you can visit us with confidence.",
    "初心者・家族歓迎": "Beginners and families welcome",
    "高価買取": "Competitive buying prices",
    "安心・安全取引": "Safe and transparent service",
    "トレカfamily カード裏面": "Toreca family card back",
    "はじめての方も、ご家族でも。スタッフが親切にご案内します。": "Our friendly staff are happy to help beginners and families.",
    "ボックスもシングルも高価買取。査定はその場でスピーディに。": "We buy both boxes and singles at competitive prices with fast in-store appraisals.",
    "明朗な価格と丁寧な対応。英語での接客にも対応しています。": "Clear pricing, attentive service, and support in English.",
    "はじめての方も、カード探しや買取のご相談も、お気軽にお声がけください。": "Please feel free to ask us about finding cards, selling your collection, or getting started.",
    "ポケモンカード": "Pokémon Card Game",
    "遊戯王": "Yu-Gi-Oh!",
    "ワンピースカード": "ONE PIECE Card Game",
    "ポケモン・遊戯王・ワンピースなど主要タイトルを幅広く。シングルからボックス、グレーディング済みカードまで取り揃えています。": "We carry major titles including Pokémon, Yu-Gi-Oh!, and ONE PIECE, from singles and booster boxes to graded cards.",
    "取り扱いカードのラインナップ": "Our trading card selection",
    "買取表": "Buying Price List",
    "最新の買取価格を画像で掲示しています。店頭ではその場でスピード査定。お手持ちのカードを高価買取いたします。": "See our latest buying prices. We provide fast in-store appraisals and competitive offers for your cards.",
    "買取のご相談はこちら": "Ask us about selling cards",
    "ポケモンカード BOX 買取表（更新日 2026/06/28）": "Pokémon booster box buying price list (updated June 28, 2026)",
    "※ 状態減額なし ・ シュリンク付きの価格です ・ 更新日 2026/06/28": "Prices shown assume sealed products with shrink wrap. Updated June 28, 2026.",
    "在庫確認・カード検索": "Inventory & Card Search",
    "店内のシングルカード壁面ディスプレイ": "In-store single-card wall display",
    "お探しのカードの在庫を確認できます。シングルカードを豊富に取り揃え、店頭でもスタッフがすぐにお調べします。気になる一枚は、お気軽にお問い合わせください。": "Check availability for the cards you are looking for. We carry a wide selection of singles, and our staff can help you in store.",
    "在庫を問い合わせる": "Ask about availability",
    "アクセス・店舗案内": "Access & Store Information",
    "各線「三宮」駅からすぐ。はじめての方も迷わずお越しいただけます。": "Conveniently located near Sannomiya Station, with clear directions for first-time visitors.",
    "トレカ family 三宮店 周辺地図": "Map around Toreca family Sannomiya",
    "トレカfamily 三宮店": "Toreca family Sannomiya",
    "店名": "Store",
    "住所": "Address",
    "最寄駅": "Nearest stations",
    "営業時間": "Hours",
    "定休日": "Closed",
    "〒650-0021\n兵庫県神戸市中央区三宮町1-9-1\nセンタープラザ 2階": "Center Plaza 2F, 1-9-1 Sannomiya-cho, Chuo-ku, Kobe, Hyogo 650-0021",
    "JR三宮駅から徒歩6分\nJR元町駅から徒歩7分\nどちらからも近いです": "6 minutes on foot from JR Sannomiya Station\n7 minutes on foot from JR Motomachi Station",
    "平日 14:00 – 20:00\n土日 12:00 – 20:00": "Weekdays 2:00 PM – 8:00 PM\nWeekends 12:00 PM – 8:00 PM",
    "不定休\n※営業時間・休業日は当店Xにて随時発信中です": "Irregular holidays\nCheck our official X account for current hours and closures.",
    "行き方を問い合わせる": "Ask for directions",
    "店長": "Store manager",
    "店長の一言": "A Message from the Manager",
    "神戸・三ノ宮のトレーディングカード専門店。安く買えて、買取も高い。スタッフは親切で、英語での接客にも対応しています。はじめての方も、ご家族でも、安心して通えるお店です。": "We are a trading card shop in Kobe Sannomiya, offering great value, competitive buying prices, friendly service, and assistance in English. Beginners and families are always welcome.",
    "店長 ・ トレカfamily": "Store Manager · Toreca family",
    "公式Xでお気軽にお問い合わせ": "Contact Us on X",
    "在庫・買取・ご来店のご相談など、お気軽にどうぞ。英語でのお問い合わせにも対応しています。": "Feel free to contact us about inventory, selling cards, or visiting the store. English inquiries are welcome.",
    "公式Xで問い合わせる": "Contact us on X",
    "アクセスを見る": "View access information",
    "神戸・三ノ宮のトレーディングカード専門店。家族とプレイヤーが安心して通えるお店です。": "A trusted trading card shop in Kobe Sannomiya for families and players.",
    "サービス": "Services",
    "店舗情報": "Store Information",
    "店舗案内・アクセス": "Store Information & Access",
    "お手持ちのカードを高価買取。最新の買取表を掲示し、店頭でスピード査定いたします。": "Sell your cards at competitive prices with our latest price list and fast in-store appraisals.",
    "お探しのカードの在庫を確認。シングルカードを豊富に取り揃えています。": "Check availability across our wide selection of single cards.",
    "神戸・三ノ宮の店舗まで、迷わず行ける道順をご案内します。": "Find clear directions to our store in Kobe Sannomiya.",
    "お探しのカードの在庫を、カテゴリ・キーワード・レアリティから確認できます。表示は店頭在庫の目安です。詳細やお取り置きはお気軽にお問い合わせください。": "Search estimated in-store availability by category, keyword, and rarity. Contact us for details or to request a hold.",
    "カテゴリ": "Category",
    "すべて": "All",
    "キーワード（カード名・型番）": "Keyword (card name or set number)",
    "例：リザードン / ブルーアイズ / ルフィ": "e.g. Charizard / Blue-Eyes / Luffy",
    "レアリティ": "Rarity",
    "在庫": "Availability",
    "カードを検索": "Search cards",
    "件のカードが見つかりました": "cards found",
    "最終更新：2026/06/28": "Last updated: June 28, 2026",
    "該当するカードが見つかりませんでした": "No matching cards were found",
    "キーワードやレアリティの条件を変えてお試しください。お探しのカードは、お問い合わせいただければ在庫をお調べします。": "Try changing the keyword or rarity. Contact us and we will check availability for the card you need.",
    "※ 在庫・価格は店頭状況により変動します。最新情報は公式Xでも随時発信中です。": "Inventory and prices may change. Follow our official X account for the latest updates.",
    "お探しのカードが見つからない時は": "Can't find the card you need?",
    "在庫にないカードや、お取り置き・入荷のご相談も承ります。公式Xからお気軽にお問い合わせください。": "Contact us on X about unavailable cards, holds, or upcoming arrivals.",
    "公式Xを見る": "View official X",
    "公式X": "Official X",
    "在庫あり": "In stock",
    "残りわずか": "Low stock",
    "在庫なし": "Out of stock",
    "リザードン ex SAR": "Charizard ex SAR",
    "ミュウツー ex SR": "Mewtwo ex SR",
    "ピカチュウ AR": "Pikachu AR",
    "ナンジャモ SAR": "Iono SAR",
    "青眼の白龍 QCSE": "Blue-Eyes White Dragon QCSE",
    "ブラック・マジシャン 25th": "Dark Magician 25th",
    "灰流うらら プリシク": "Ash Blossom & Joyous Spring Prismatic Secret Rare",
    "モンキー・D・ルフィ SEC": "Monkey D. Luffy SEC",
    "シャンクス SR パラレル": "Shanks SR Parallel",
    "ヤマト SR": "Yamato SR",
    "エース SR パラレル": "Ace SR Parallel",
    "ミモザ SAR": "Miriam SAR"
  };
  const reverseTranslations = Object.fromEntries(
    Object.entries(translations).map(([japanese, english]) => [english, japanese])
  );

  const originalTexts = new WeakMap();
  const originalAttributes = new WeakMap();
  let language = localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "ja";
  let observer;

  function translated(value) {
    return language === "en" && translations[value] ? translations[value] : value;
  }

  function translateTextNode(node) {
    if (!node.nodeValue || node.parentElement?.closest("[data-language-toggle]")) return;
    const current = node.nodeValue;
    const currentTrimmed = current.trim();
    if (!currentTrimmed) return;
    if (!originalTexts.has(node)) {
      const japanese = reverseTranslations[currentTrimmed];
      if (!translations[currentTrimmed] && !japanese) return;
      originalTexts.set(node, japanese ? current.replace(currentTrimmed, japanese) : current);
    } else {
      const saved = originalTexts.get(node);
      const expected = saved.replace(saved.trim(), translated(saved.trim()));
      if (current !== expected && translations[currentTrimmed]) originalTexts.set(node, current);
    }
    const original = originalTexts.get(node);
    const trimmed = original.trim();
    const replacement = translated(trimmed);
    const next = original.replace(trimmed, replacement);
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function translateAttributes(element) {
    if (element.closest?.("[data-language-toggle]")) return;
    const attrs = ["placeholder", "aria-label", "alt", "title"];
    let originals = originalAttributes.get(element);
    if (!originals) {
      originals = new Map();
      originalAttributes.set(element, originals);
    }
    attrs.forEach((attr) => {
      if (!element.hasAttribute(attr)) return;
      if (!originals.has(attr)) {
        const current = element.getAttribute(attr);
        originals.set(attr, reverseTranslations[current] || current);
      }
      const original = originals.get(attr);
      const next = translated(original);
      if (element.getAttribute(attr) !== next) element.setAttribute(attr, next);
    });
  }

  function translateTree(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
      else translateAttributes(node);
    }
  }

  function updateMetadata() {
    const inventory = location.pathname.endsWith("inventory.html");
    if (language === "en") {
      document.title = inventory
        ? "Inventory & Card Search | Toreca family"
        : "Toreca family | Trading Card Shop in Kobe Sannomiya";
      document.querySelector('meta[name="description"]')?.setAttribute(
        "content",
        inventory
          ? "Search estimated in-store card availability at Toreca family by keyword, category, and rarity."
          : "Toreca family is a trading card shop in Kobe Sannomiya offering card sales, buying, inventory search, and store information."
      );
    } else {
      document.title = inventory
        ? "在庫確認・カード検索｜トレカfamily"
        : "トレカfamily｜神戸・三宮のトレーディングカード専門店";
      document.querySelector('meta[name="description"]')?.setAttribute(
        "content",
        inventory
          ? "トレカfamilyの在庫確認・カード検索ページです。カード名、カテゴリ、レアリティから店頭在庫の目安を確認できます。"
          : "神戸・三宮のトレーディングカード専門店、トレカfamily。取り扱いカード、買取、在庫確認、アクセス情報をご案内します。"
      );
    }
  }

  function updateButtons() {
    document.querySelectorAll("[data-language-toggle]").forEach((button) => {
      const label = language === "ja" ? "英語に切り替え" : "Switch to Japanese";
      const buttonText = language === "ja" ? "EN" : "JP";
      const pressed = language === "en" ? "true" : "false";
      if (button.textContent !== buttonText) button.textContent = buttonText;
      if (button.getAttribute("aria-label") !== label) button.setAttribute("aria-label", label);
      if (button.getAttribute("title") !== label) button.setAttribute("title", label);
      if (button.getAttribute("aria-pressed") !== pressed) button.setAttribute("aria-pressed", pressed);
    });
  }

  function updateLocalizedImages() {
    document.querySelectorAll("[data-src-ja][data-src-en]").forEach((image) => {
      const nextSource = language === "en" ? image.dataset.srcEn : image.dataset.srcJa;
      if (image.getAttribute("src") !== nextSource) image.setAttribute("src", nextSource);
    });
  }

  function applyLanguage() {
    document.documentElement.lang = language;
    updateLocalizedImages();
    translateTree(document.body);
    updateMetadata();
    updateButtons();
  }

  function setLanguage(next) {
    language = next === "en" ? "en" : "ja";
    localStorage.setItem(STORAGE_KEY, language);
    applyLanguage();
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-language-toggle]");
    if (!button) return;
    setLanguage(language === "ja" ? "en" : "ja");
  });

  document.addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.textContent = ".tf-lang-toggle{transition:background-color .2s ease,border-color .2s ease,color .2s ease,transform .2s ease}.tf-lang-toggle:hover{background:#EAF1F8!important;border-color:#9FC4E8!important;transform:translateY(-1px)}.tf-lang-toggle:focus-visible{outline:3px solid rgba(46,117,182,.25);outline-offset:2px}";
    document.head.appendChild(style);
    applyLanguage();
    observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData") translateTextNode(mutation.target);
        if (mutation.type === "attributes") translateAttributes(mutation.target);
        mutation.addedNodes.forEach(translateTree);
      });
      updateLocalizedImages();
      updateButtons();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "aria-label", "alt", "title"]
    });
  });
})();
