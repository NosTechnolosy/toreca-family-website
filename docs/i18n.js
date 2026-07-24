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
    "※ 状態減額なし ・ シュリンク付きの価格です ・ 更新日": "Prices shown assume sealed products with shrink wrap. Updated",
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
    "商品名またはカード番号から、現在公開中の店頭在庫を検索できます。表示される商品は、在庫数と販売価格が登録されている商品のみです。": "Search current in-store availability by product name or card number. Only products with registered stock and selling prices are shown.",
    "商品名・カード番号": "Product name or card number",
    "例：リザードン / ST21-014": "e.g. Charizard / ST21-014",
    "ジャンル": "Genre",
    "カテゴリ": "Category",
    "すべて": "All",
    "カードを検索": "Search cards",
    "件の商品が見つかりました": "products found",
    "最終更新：": "Last updated: ",
    "在庫データを読み込んでいます…": "Loading inventory data…",
    "在庫データを読み込めませんでした": "Inventory data could not be loaded",
    "時間をおいて再読み込みするか、公式Xからお問い合わせください。": "Please reload later or contact us through our official X account.",
    "未分類": "Uncategorized",
    "状態表記なし": "Condition not listed",
    "カード番号なし": "No card number",
    "さらに表示": "Show more",
    "該当するカードが見つかりませんでした": "No matching cards were found",
    "商品名・カード番号、ジャンル、カテゴリの条件を変えてお試しください。お探しの商品はお問い合わせから在庫をご確認いただけます。": "Try changing the product name, card number, genre, or category. Contact us to check other items.",
    "※ 公開中の商品は在庫ありですが、在庫・価格は店頭状況により変動します。最新状況はお問い合わせください。": "Published products are in stock, but availability and prices may change. Contact us for the latest status.",
    "お探しのカードが見つからない時は": "Can't find the card you need?",
    "在庫にないカードや、お取り置き・入荷のご相談も承ります。公式Xからお気軽にお問い合わせください。": "Contact us on X about unavailable cards, holds, or upcoming arrivals.",
    "公式X": "Official X",
    "トップページ": "Home",
    "メインナビゲーション": "Main navigation",
    "トレカfamily トップページ": "Toreca family home page",
    "プライバシーポリシー": "Privacy Policy",
    "当ショップは、お客様の個人情報保護の重要性について認識し、個人情報の保護に関する法律（以下「個人情報保護法」といいます。）を遵守すると共に、以下のプライバシーポリシー（以下「本プライバシーポリシー」といいます。）に従い、適切な取扱い及び保護に努めます。": "We recognize the importance of protecting our customers' personal information. We comply with Japan's Act on the Protection of Personal Information (the “APPI”) and handle and protect personal information appropriately in accordance with this Privacy Policy.",
    "1. 個人情報の定義": "1. Definition of Personal Information",
    "本プライバシーポリシーにおいて、個人情報とは、個人情報保護法第2条第1項により定義された個人情報、すなわち、生存する個人に関する情報であって、当該情報に含まれる氏名、生年月日その他の記述等により特定の個人を識別することができるもの（他の情報と容易に照合することができ、それにより特定の個人を識別することができることとなるものを含みます。）、もしくは個人識別符号が含まれる情報を意味するものとします。": "In this Privacy Policy, “personal information” means personal information as defined in Article 2, Paragraph 1 of the APPI: information relating to a living individual that can identify a specific individual by name, date of birth, or other descriptions contained in the information (including information that can be readily cross-referenced with other information to identify a specific individual), or information containing an individual identification code.",
    "2. 個人情報の利用目的": "2. Purposes of Use",
    "当ショップは、お客様の個人情報を、以下の目的で利用致します。": "We use customers' personal information for the following purposes:",
    "（１） 当ショップサービスの提供のため": "(1) To provide our shop's services.",
    "（２） 当ショップサービスに関するご案内、お問い合わせ等への対応のため": "(2) To provide information about our services and respond to inquiries.",
    "（３） 当ショップの商品、サービス等のご案内のため": "(3) To provide information about our products and services.",
    "（４） 当ショップサービスに関する当ショップの規約、ポリシー等（以下「規約等」といいます。）に違反する行為に対する対応のため": "(4) To respond to conduct that violates the terms, policies, or other rules governing our services.",
    "（５） 当ショップサービスに関する規約等の変更などを通知するため": "(5) To notify customers of changes to the terms and policies governing our services.",
    "（６） 当ショップサービスの改善、新サービスの開発等に役立てるため": "(6) To improve our services and develop new services.",
    "（７） 当ショップサービスに関連して、個別を識別できない形式に加工した統計データを作成するため": "(7) To create statistical data related to our services in a form that does not identify individuals.",
    "（８） その他、上記利用目的に付随する目的のため": "(8) For other purposes incidental to those listed above.",
    "3. 個人情報利用目的の変更": "3. Changes to the Purposes of Use",
    "当ショップは、個人情報の利用目的を、関連性を有すると合理的に認められる範囲内において変更することがあり、変更した場合にはお客様に通知又は公表します。": "We may change the purposes for which personal information is used within a scope reasonably considered relevant to the original purposes. Any changes will be communicated to customers or publicly announced.",
    "4. 個人情報利用の制限": "4. Restrictions on Use",
    "当ショップは、個人情報保護法その他の法令により許容される場合を除き、お客様の同意を得ず、利用目的の達成に必要な範囲を超えて個人情報を取り扱いません。但し、次の場合はこの限りではありません。": "Except where permitted by the APPI or other applicable laws, we will not handle personal information beyond the scope necessary to achieve the stated purposes without the customer's consent. This restriction does not apply in the following cases:",
    "（１） 法令に基づく場合": "(1) When required by law.",
    "（２） 人の生命、身体又は財産の保護のために必要がある場合であって、お客様の同意を得ることが困難であるとき": "(2) When necessary to protect a person's life, body, or property and obtaining the customer's consent is difficult.",
    "（３） 公衆衛生の向上又は児童の健全な育成の推進のために特に必要がある場合であって、お客様の同意を得ることが困難であるとき": "(3) When particularly necessary to improve public health or promote the sound development of children and obtaining the customer's consent is difficult.",
    "（４） 国の機関もしくは地方公共団体又はその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって、お客様の同意を得ることにより当該事務の遂行に支障を及ぼすおそれがあるとき": "(4) When cooperation is required for a national or local government body, or a party entrusted by one, to perform duties prescribed by law, and obtaining the customer's consent could interfere with those duties.",
    "5. 個人情報の適正な取得": "5. Proper Acquisition of Personal Information",
    "当ショップは、適正に個人情報を取得し、偽りその他不正の手段により取得しません。": "We acquire personal information through proper means and do not obtain it through deception or other improper methods.",
    "6. 個人情報の安全管理": "6. Security Management",
    "当ショップは、個人情報の紛失、破壊、改ざん及び漏洩などのリスクに対して、個人情報の安全管理が図られるよう、当ショップの従業員に対し、必要かつ適切な監督を行います。また、当ショップは、個人情報の取扱いの全部又は一部を委託する場合は、委託先において個人情報の安全管理が図られるよう、必要かつ適切な監督を行います。": "We provide necessary and appropriate supervision to our employees to safeguard personal information against risks such as loss, destruction, alteration, and leakage. When all or part of the handling of personal information is outsourced, we also provide necessary and appropriate supervision of the service provider.",
    "7. 第三者提供": "7. Provision to Third Parties",
    "当ショップは、個人情報保護法その他の法令に基づき開示が認められる場合を除くほか、あらかじめお客様の同意を得ないで、個人情報を第三者に提供しません。但し、次に掲げる場合は上記に定める第三者への提供には該当しません。": "We will not provide personal information to third parties without the customer's prior consent, except where disclosure is permitted under the APPI or other applicable laws. The following cases are not considered provision to a third party:",
    "（１） 当ショップが利用目的の達成に必要な範囲内において個人情報の取扱いの全部又は一部を委託することに伴って個人情報を提供する場合": "(1) When personal information is provided to a service provider entrusted with all or part of its handling within the scope necessary to achieve the purposes of use.",
    "（２） 合併その他の事由による事業の承継に伴って個人情報が提供される場合": "(2) When personal information is transferred as part of a business succession resulting from a merger or other reason.",
    "（３） 個人情報保護法の定めに基づき共同利用する場合": "(3) When personal information is jointly used in accordance with the APPI.",
    "8. 個人情報の開示": "8. Disclosure of Personal Information",
    "当ショップは、お客様から、個人情報保護法の定めに基づき個人情報の開示を求められたときは、お客様ご本人からのご請求であることを確認の上で、お客様に対し、遅滞なく開示を行います（当該個人情報が存在しないときにはその旨を通知いたします。）。但し、個人情報保護法その他の法令により、当ショップが開示の義務を負わない場合は、この限りではありません。": "When a customer requests disclosure of personal information under the APPI, we will confirm that the request is from the customer and disclose the information without delay. If no such information exists, we will notify the customer. This does not apply where we are not obligated to disclose the information under the APPI or other applicable laws.",
    "9. 個人情報の訂正等": "9. Correction of Personal Information",
    "当ショップは、お客様から、個人情報が真実でないという理由によって、個人情報保護法の定めに基づきその内容の訂正、追加又は削除（以下「訂正等」といいます。）を求められた場合には、お客様ご本人からのご請求であることを確認の上で、利用目的の達成に必要な範囲内において、遅滞なく必要な調査を行い、その結果に基づき、個人情報の内容の訂正等を行い、その旨をお客様に通知します（訂正等を行わない旨の決定をしたときは、お客様に対しその旨を通知いたします。）。但し、個人情報保護法その他の法令により、当ショップが訂正等の義務を負わない場合は、この限りではありません。": "If a customer requests correction, addition, or deletion of personal information under the APPI on the grounds that it is inaccurate, we will confirm that the request is from the customer, conduct the necessary investigation without delay within the scope required to achieve the purposes of use, and make any appropriate correction based on the results. We will notify the customer whether or not a correction is made. This does not apply where we are not obligated to make such a correction under the APPI or other applicable laws.",
    "10. 個人情報の利用停止等": "10. Suspension of Use",
    "当ショップは、お客様から、お客様の個人情報が、あらかじめ公表された利用目的の範囲を超えて取り扱われているという理由又は偽りその他不正の手段により取得されたものであるという理由により、個人情報保護法の定めに基づきその利用の停止又は消去（以下「利用停止等」といいます。）を求められた場合において、そのご請求に理由があることが判明した場合には、お客様ご本人からのご請求であることを確認の上で、遅滞なく個人情報の利用停止等を行い、その旨をお客様に通知します。但し、個人情報保護法その他の法令により、当ショップが利用停止等の義務を負わない場合は、この限りではありません。": "If a customer requests suspension of use or deletion of personal information under the APPI because it has been handled beyond the previously published purposes or acquired through deception or other improper means, and the request is found to be justified, we will confirm that the request is from the customer, suspend use or delete the information without delay, and notify the customer. This does not apply where we are not obligated to do so under the APPI or other applicable laws.",
    "11. Cookie（クッキー）その他の技術の利用": "11. Use of Cookies and Similar Technologies",
    "（１） 当ショップのサービスは、Cookie及びこれに類する技術を利用することがあります。これらの技術は、当ショップによる当ショップのサービスの利用状況等の把握に役立ち、サービス向上に資するものです。Cookieを無効化されたいユーザーは、ウェブブラウザの設定を変更することによりCookieを無効化することができます。但し、Cookieを無効化すると、当ショップのサービスの一部の機能をご利用いただけなくなる場合があります。": "(1) Our services may use cookies and similar technologies. These technologies help us understand how our services are used and improve them. Users may disable cookies by changing their web browser settings; however, doing so may prevent some features of our services from functioning.",
    "（２） 当ショップは、当ショップサービスが提供するサービスの利用状況等を調査・分析するため、本サービス上に Google LLCが提供する Google アナリティクスを利用しています。Googleアナリティクスでデータが収集、処理される仕組みその他Googleアナリティクスの詳しい情報につきましては、同社のサイトをご覧ください。": "(2) We use Google Analytics, provided by Google LLC, to investigate and analyze the use of our services. Please refer to Google's website for information about how Google Analytics collects and processes data.",
    "Google アナリティクス 利用規約：": "Google Analytics Terms of Service:",
    "お客様が Google パートナーのサイトやアプリを使用する際の Google によるデータ使用：": "How Google uses data when you use sites or apps of Google partners:",
    "Google プライバシーポリシー：": "Google Privacy Policy:",
    "なお、お客様はご自身のデータが Google アナリティクスで使用されることを望まない場合は、Google 社の提供する Google アナリティクス オプトアウト アドオンをご利用ください。": "If you do not want your data to be used by Google Analytics, you may use the Google Analytics Opt-out Browser Add-on provided by Google.",
    "Google アナリティクス オプトアウト アドオン：": "Google Analytics Opt-out Browser Add-on:",
    "（３） 本サービスでは「Google Analyticsの広告向けの機能」を有効にしており、下記の機能を利用し、広告やサイト改善のためDoubleClick CookieなどのサードパーティCookieを利用しています。": "(3) This service enables Google Analytics Advertising Features and uses third-party cookies, including DoubleClick cookies, for advertising and site improvement through the features below.",
    "Google Analyticsリマーケティング": "Google Analytics Remarketing",
    "Google Analyticsのユーザー属性レポートとユーザー属性レポートとインタレスト レポート": "Google Analytics Demographics and Interests Reports",
    "これにより、本サービスではGoogle AnalyticsのCookieを利用して、お客様の年齢・性別・閲覧履歴・本サービスに関する関心の傾向をおおよそ把握するための分析が可能となっております。": "These Google Analytics cookies allow us to analyze general trends relating to customers' age, gender, browsing history, and interests in this service.",
    "「Google Analyticsの広告向けの機能」を使用されることを望まない場合は、設定によってトラッキングを無効にすることが可能です。Google Analytics オプトアウト アドオンをブラウザにインストールされると無効にすることができます。": "If you do not want Google Analytics Advertising Features to be used, you can disable tracking through your settings or by installing the Google Analytics Opt-out Browser Add-on.",
    "12. お問い合わせ": "12. Contact",
    "開示等のお申出、ご意見、ご質問、苦情のお申出その他個人情報の取扱いに関するお問い合わせは、当ショップの「特定商取引法に基づく表記」内にある連絡先へご連絡いただくか、ショップページ内のお問い合わせフォームよりお問い合わせください。": "For requests for disclosure, comments, questions, complaints, or other inquiries concerning the handling of personal information, please use the contact information provided in our Legal Notice or the inquiry form on the shop page.",
    "13. 継続的改善": "13. Continuous Improvement",
    "当ショップは、個人情報の取扱いに関する運用状況を適宜見直し、継続的な改善に努めるものとし、必要に応じて、本プライバシーポリシーを変更することがあります。": "We periodically review our practices for handling personal information and work toward continuous improvement. We may revise this Privacy Policy when necessary.",
    "特定商取引法に基づく表記": "Legal Notice under the Act on Specified Commercial Transactions",
    "事業者の名称": "Business Name",
    "事業者の所在地": "Business Address",
    "〒6500021": "650-0021",
    "兵庫県神戸市中央区三宮町1-9-1センタープラザ2F229": "Center Plaza 2F, Room 229, 1-9-1 Sannomiya-cho, Chuo-ku, Kobe, Hyogo, Japan",
    "営業時間・ショップ情報など": "Business Hours and Shop Information",
    "古物商許可証（道具商）": "Secondhand Dealer License (Tools and Equipment)",
    "兵庫県公安委員会許可第631132400054": "Hyogo Prefectural Public Safety Commission License No. 631132400054",
    "中安 幸輝": "Koki Nakayasu",
    "お問い合わせ対応時間：14時〜20時": "Inquiry hours: 2:00 PM–8:00 PM",
    "定休日：不定休": "Closed on irregular days",
    "販売価格": "Selling Prices",
    "販売価格は、税込み表記となっております。": "All listed prices include consumption tax.",
    "また、別途配送料が掛かる場合もございます。配送料に関しては商品詳細ページをご確認ください。": "Additional shipping charges may apply. Please see the product details page for shipping costs.",
    "代金の支払方法・時期": "Payment Methods and Timing",
    "支払方法：クレジットカードによる決済がご利用いただけます。": "Payment method: Credit card payments are accepted.",
    "支払時期：商品注文確定時にお支払いが確定いたします。": "Payment timing: Payment is finalized when the order is confirmed.",
    "PAY ID あと払い:": "PAY ID Pay Later:",
    "・ コンビニ：ご請求後翌月10日のお支払い：支払い手数料：350円（税込）": "• Convenience store: Payment is due by the 10th of the month following billing. Fee: ¥350 (tax included).",
    "・ 口座振替：ご請求後指定口座より引き落とし：支払い手数料：無料": "• Direct debit: Debited from the designated bank account after billing. Fee: Free.",
    "銀行振込決済（ご請求後5営業日以内のお支払い）：": "Bank transfer (payment within five business days after billing):",
    "・ 支払い手数料：360円（税込）": "• Fee: ¥360 (tax included).",
    "商品のお届け時期": "Delivery Time",
    "代金のお支払い確定後、3営業日以内に発送いたします。": "Orders will be shipped within three business days after payment is confirmed.",
    "後払い決済の場合は注文確定後、3営業日以内に発送いたします。": "For pay-later transactions, orders will be shipped within three business days after order confirmation.",
    "返品について": "Returns",
    "商品に欠陥がある場合をのぞき、基本的には返品には応じません。": "Returns are generally not accepted unless the product is defective.",
    "在庫あり": "In stock"
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
    const pathname = location.pathname;
    const page = pathname.endsWith("inventory.html")
      ? "inventory"
      : pathname.endsWith("privacy.html")
        ? "privacy"
        : pathname.endsWith("law.html")
          ? "law"
          : "home";
    const metadata = {
      ja: {
        home: {
          title: "トレカfamily｜神戸・三宮のトレーディングカード専門店",
          description: "神戸・三宮のトレーディングカード専門店、トレカfamily。取り扱いカード、買取、在庫確認、アクセス情報をご案内します。"
        },
        inventory: {
          title: "在庫確認・カード検索｜トレカfamily",
          description: "トレカfamilyの在庫確認・カード検索ページです。商品名、カード番号、ジャンル、カテゴリから公開中の店頭在庫を確認できます。"
        },
        privacy: {
          title: "プライバシーポリシー｜トレカfamily",
          description: "トレカfamilyのプライバシーポリシーです。個人情報の取扱い、利用目的、安全管理等についてご案内します。"
        },
        law: {
          title: "特定商取引法に基づく表記｜トレカfamily",
          description: "トレカfamilyの特定商取引法に基づく表記です。事業者情報、販売価格、支払方法、発送時期、返品条件をご案内します。"
        }
      },
      en: {
        home: {
          title: "Toreca family | Trading Card Shop in Kobe Sannomiya",
          description: "Toreca family is a trading card shop in Kobe Sannomiya offering card sales, buying, inventory search, and store information."
        },
        inventory: {
          title: "Inventory & Card Search | Toreca family",
          description: "Search current in-store availability at Toreca family by product name, card number, genre, and category."
        },
        privacy: {
          title: "Privacy Policy | Toreca family",
          description: "Read Toreca family's policy on the handling, use, security, and protection of personal information."
        },
        law: {
          title: "Legal Notice | Toreca family",
          description: "Legal information for Toreca family, including business details, prices, payment methods, delivery, and returns."
        }
      }
    };
    const current = metadata[language][page];
    document.title = current.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", current.description);
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
    window.dispatchEvent(new CustomEvent("tf-languagechange", {
      detail: { language }
    }));
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
