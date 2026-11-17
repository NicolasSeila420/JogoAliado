/* Market Masters — content and simulation definitions */
window.MM_DATA = {
  ventures: [
    {
      id: "lemonade", name: "Lemonade Cart", icon: "🍋", color: "#f4c66e",
      tagline: "Your first taste of cash flow.", concept: "Cash flow", lesson: "cashflow",
      cost: 15, income: 2, growth: 1.135,
      description: "A tiny stand with a simple promise: sell something people want at a price above your costs."
    },
    {
      id: "coffee", name: "Coffee Kiosk", icon: "☕", color: "#d7a56f",
      tagline: "Recurring customers, recurring revenue.", concept: "Recurring revenue", lesson: "supply",
      cost: 180, income: 18, growth: 1.142,
      description: "Morning routines create repeat customers. Predictable demand makes a business easier to plan."
    },
    {
      id: "delivery", name: "Delivery App", icon: "🛵", color: "#7cb8ff",
      tagline: "Connecting buyers and sellers at scale.", concept: "Network effects", lesson: "supply",
      cost: 1600, income: 120, growth: 1.148,
      description: "A marketplace becomes more useful as more people join. That is a network effect."
    },
    {
      id: "solar", name: "Solar Microgrid", icon: "☀️", color: "#f3d36a",
      tagline: "Clean power, long-term contracts.", concept: "Capital intensity", lesson: "risk",
      cost: 12000, income: 760, growth: 1.151,
      description: "Large upfront costs can create durable assets. Investors must weigh the wait against the reward."
    },
    {
      id: "robotics", name: "Robotics Factory", icon: "🤖", color: "#a6c8ff",
      tagline: "Automate the boring, scale the useful.", concept: "Economies of scale", lesson: "compound",
      cost: 95000, income: 5200, growth: 1.155,
      description: "As output grows, the cost per unit can fall. Scale is powerful when demand is strong."
    },
    {
      id: "space", name: "Space Logistics", icon: "🚀", color: "#b6a0ff",
      tagline: "High risk. Very high ceiling.", concept: "Risk vs. return", lesson: "risk",
      cost: 800000, income: 38000, growth: 1.16,
      description: "Big, uncertain projects can produce extraordinary outcomes — or nothing. That uncertainty is risk."
    },
    {
      id: "ai", name: "AI Cloud", icon: "🧠", color: "#81e6d9",
      tagline: "The compute layer of the future.", concept: "Innovation premium", lesson: "valuation",
      cost: 6500000, income: 280000, growth: 1.17,
      description: "Investors pay for future potential. The premium is real, but so is the risk of disappointment."
    }
  ],

  stocks: [
    { id: "NOVA", name: "NovaCloud", sector: "Technology", price: 64, fair: 68, vol: 0.012, drift: 0.0007, pe: 34, beta: 1.6, dividend: 0, risk: "High", color: "#7cb8ff", blurb: "Cloud software with fast growth and a premium valuation. Sensitive to interest-rate news." },
    { id: "SUN", name: "SunGrid", sector: "Energy", price: 28, fair: 27, vol: 0.009, drift: 0.0006, pe: 19, beta: 1.1, dividend: 0.02, risk: "Medium", color: "#f3d36a", blurb: "Solar developer with long-term contracts. Policy headlines can move it quickly." },
    { id: "GRN", name: "GreenCart", sector: "Consumer", price: 14, fair: 15, vol: 0.005, drift: 0.0005, pe: 16, beta: 0.8, dividend: 0.025, risk: "Low–med", color: "#69e6a8", blurb: "Everyday consumer goods. Steady demand and a small dividend make it a defensive holding." },
    { id: "BNK", name: "Union Bank", sector: "Financials", price: 48, fair: 50, vol: 0.006, drift: 0.0005, pe: 11, beta: 1.2, dividend: 0.045, risk: "Medium", color: "#d7a56f", blurb: "A traditional bank. Profits depend on lending spreads, credit quality and interest rates." },
    { id: "HLX", name: "Helix Bio", sector: "Healthcare", price: 82, fair: 76, vol: 0.01, drift: 0.0006, pe: 41, beta: 1.3, dividend: 0, risk: "High", color: "#b6a0ff", blurb: "Biotech research is binary: trial results can send the shares sharply up or down." },
    { id: "LUX", name: "Lumen", sector: "Luxury", price: 110, fair: 108, vol: 0.007, drift: 0.00055, pe: 24, beta: 1.1, dividend: 0.015, risk: "Medium", color: "#ffb1c1", blurb: "A premium brand with pricing power. Demand is sensitive to confidence among wealthy consumers." },
    { id: "AERO", name: "AeroX", sector: "Industrials", price: 36, fair: 35, vol: 0.008, drift: 0.0006, pe: 22, beta: 1.35, dividend: 0.01, risk: "Med–high", color: "#a6c8ff", blurb: "Aerospace and industrial equipment. Cyclical: orders rise and fall with the wider economy." },
    { id: "INDEX", name: "Market 100 ETF", sector: "Diversified", price: 100, fair: 102, vol: 0.0035, drift: 0.00065, pe: 18, beta: 1, dividend: 0.018, risk: "Diversified", color: "#c8ffe3", blurb: "One fund, many companies. An ETF spreads company-specific risk across the whole market." }
  ],

  countries: [
    { id: "USA", name: "United States", flag: "🇺🇸", region: "North America", currency: "USD", fx: "USD", lat: 39.8, lon: -98.6, bonus: 0, cost: 0, reqLevel: 1, reqNet: 0, risk: "Low", market: "Large", labelDx: 9, labelDy: -7, insight: "Deep capital markets, strong consumer spending and your home base. This is where the story begins." },
    { id: "CAN", name: "Canada", flag: "🇨🇦", region: "North America", currency: "CAD", fx: "CAD", lat: 56.1, lon: -106.3, bonus: 0.06, cost: 6000, reqLevel: 2, reqNet: 4000, risk: "Low", market: "Mid", labelDx: -25, labelDy: -7, insight: "A stable, resource-rich market with close trade links to the United States. A natural first step abroad." },
    { id: "MEX", name: "Mexico", flag: "🇲🇽", region: "North America", currency: "MXN", fx: "MXN", lat: 23.6, lon: -102.5, bonus: 0.08, cost: 14000, reqLevel: 2, reqNet: 9000, risk: "Medium", market: "Mid", labelDx: -24, labelDy: 11, insight: "A large emerging consumer market with manufacturing strengths and a currency that can move quickly." },
    { id: "BRA", name: "Brazil", flag: "🇧🇷", region: "South America", currency: "BRL", fx: "BRL", lat: -10.8, lon: -52.9, bonus: 0.12, cost: 120000, reqLevel: 4, reqNet: 90000, risk: "High", market: "Large", labelDx: 9, labelDy: 8, insight: "A huge emerging economy. Growth potential comes with higher volatility and currency risk." },
    { id: "GBR", name: "United Kingdom", flag: "🇬🇧", region: "Europe", currency: "GBP", fx: "GBP", lat: 54.0, lon: -2.9, bonus: 0.09, cost: 30000, reqLevel: 3, reqNet: 20000, risk: "Low", market: "Large", labelDx: -26, labelDy: -10, insight: "A global financial centre and an English-speaking consumer market. A gateway to Europe." },
    { id: "DEU", name: "Germany", flag: "🇩🇪", region: "Europe", currency: "EUR", fx: "EUR", lat: 51.1, lon: 10.4, bonus: 0.1, cost: 55000, reqLevel: 3, reqNet: 35000, risk: "Low", market: "Large", labelDx: 8, labelDy: -5, insight: "Europe's largest economy, known for engineering and exports. Strong demand for quality and reliability." },
    { id: "NGA", name: "Nigeria", flag: "🇳🇬", region: "Africa", currency: "NGN", fx: "NGN", lat: 9.1, lon: 8.7, bonus: 0.16, cost: 950000, reqLevel: 7, reqNet: 800000, risk: "High", market: "Emerging", labelDx: 9, labelDy: 8, insight: "A young, fast-growing population and a large informal economy. High upside alongside real infrastructure and FX risk." },
    { id: "ZAF", name: "South Africa", flag: "🇿🇦", region: "Africa", currency: "ZAR", fx: "ZAR", lat: -30.6, lon: 22.9, bonus: 0.1, cost: 700000, reqLevel: 7, reqNet: 600000, risk: "High", market: "Mid", labelDx: 9, labelDy: 9, insight: "A diversified African economy and a major gateway to the continent. Local conditions matter enormously." },
    { id: "ARE", name: "United Arab Emirates", flag: "🇦🇪", region: "Middle East", currency: "AED", fx: "AED", lat: 23.4, lon: 53.8, bonus: 0.1, cost: 380000, reqLevel: 6, reqNet: 320000, risk: "Medium", market: "Mid", labelDx: 9, labelDy: 6, insight: "A trade and logistics hub with low taxes and global connections. A base for reaching nearby markets." },
    { id: "IND", name: "India", flag: "🇮🇳", region: "Asia", currency: "INR", fx: "INR", lat: 20.6, lon: 79.0, bonus: 0.15, cost: 180000, reqLevel: 5, reqNet: 150000, risk: "Medium", market: "Large", labelDx: 9, labelDy: -7, insight: "One of the world's fastest-growing major economies, with a vast and young consumer market." },
    { id: "SGP", name: "Singapore", flag: "🇸🇬", region: "Asia", currency: "SGD", fx: "SGD", lat: 1.35, lon: 103.8, bonus: 0.13, cost: 520000, reqLevel: 6, reqNet: 450000, risk: "Low", market: "Mid", labelDx: 9, labelDy: 9, insight: "A compact, high-income city-state with world-class infrastructure and a business-friendly legal system." },
    { id: "JPN", name: "Japan", flag: "🇯🇵", region: "Asia", currency: "JPY", fx: "JPY", lat: 36.2, lon: 138.3, bonus: 0.11, cost: 260000, reqLevel: 5, reqNet: 220000, risk: "Low", market: "Large", labelDx: 9, labelDy: -7, insight: "A wealthy, mature market with sophisticated consumers and deep capital markets." },
    { id: "AUS", name: "Australia", flag: "🇦🇺", region: "Oceania", currency: "AUD", fx: "AUD", lat: -25.3, lon: 133.8, bonus: 0.08, cost: 90000, reqLevel: 4, reqNet: 70000, risk: "Low", market: "Mid", labelDx: 9, labelDy: 7, insight: "A high-income, resource-rich market with strong institutions and close links to Asia." }
  ],

  goals: [
    { id: "first_venture", title: "Make your first investment", desc: "Buy any venture and start earning passive income.", reward: 150, xp: 15, view: "ventures", target: 1 },
    { id: "first_stock", title: "Own a piece of a company", desc: "Buy at least one share in the stock market.", reward: 200, xp: 20, view: "stocks", target: 1 },
    { id: "coffee_chain", title: "Build a coffee chain", desc: "Own 5 Coffee Kiosks. Repeat demand compounds.", reward: 400, xp: 30, view: "ventures", target: 5 },
    { id: "first_lesson", title: "Finish a lesson", desc: "Complete any Academy lesson and answer its quiz.", reward: 300, xp: 25, view: "academy", target: 1 },
    { id: "thousand", title: "Keep $1,000 in cash", desc: "Build a cash buffer before you invest it again.", reward: 250, xp: 20, view: "ventures", target: 1000 },
    { id: "diversified", title: "Diversify your portfolio", desc: "Own shares in 3 different companies at once.", reward: 500, xp: 40, view: "stocks", target: 3 },
    { id: "global", title: "Go global", desc: "Expand your company into a second country.", reward: 800, xp: 60, view: "world", target: 2 },
    { id: "level_five", title: "Reach founder level 5", desc: "Earn XP by investing, learning and expanding.", reward: 1000, xp: 0, view: "ventures", target: 5 },
    { id: "millionaire", title: "Build a $1M company", desc: "Reach $1,000,000 in estimated net worth.", reward: 5000, xp: 100, view: "ventures", target: 1000000 }
  ],

  tutorialTasks: [
    { id: "venture", text: "Buy your first venture", message: "Start with one Lemonade Cart. It turns cash into cash flow.", view: "ventures" },
    { id: "stock", text: "Buy one share of a company", message: "A stock is a small piece of a business. Buy a share and watch it move.", view: "stocks" },
    { id: "lesson", text: "Complete an Academy lesson", message: "Knowledge is an asset too. Finish a short lesson and claim your reward.", view: "academy" },
    { id: "world", text: "Scout a market on the world map", message: "Click a country on the map. Global markets bring growth and new risks.", view: "world" }
  ],

  glossary: [
    { id: "cashflow", term: "Cash flow", short: "Money moving in and out of a business.", long: "Cash flow is the actual movement of money into and out of a business. Profit is an accounting measure over a period; cash flow tells you whether the bills can be paid today. A profitable company can still fail if customers pay late while rent and salaries are due.", example: "A bakery sells $1,000 of bread on 30-day credit. It has a $200 accounting profit, but $0 cash until the invoice is paid." },
    { id: "supplydemand", term: "Supply & demand", short: "Scarcity and desire set prices.", long: "Demand is how much buyers want at each price. Supply is how much sellers offer. When demand rises faster than supply, prices tend to rise. When supply outpaces demand, prices tend to fall. Prices are signals that coordinate millions of decisions.", example: "A hit sneaker sells out. Resale prices jump. The higher price encourages more production — and eventually supply catches up." },
    { id: "compound", term: "Compound interest", short: "Returns that earn their own returns.", long: "Compound interest is growth on top of growth. Each period, your interest is added to the balance, so the next period's return is calculated on a larger amount. Time matters more than most people expect. The Rule of 72 estimates doubling time: 72 ÷ annual return.", example: "$1,000 growing at 8% a year becomes about $2,159 in 10 years — without adding a cent." },
    { id: "diversification", term: "Diversification", short: "Don't rely on one bet.", long: "Diversification spreads money across different assets, industries and regions. It reduces company-specific risk, but it cannot remove market-wide risk. A broad index fund is a simple way to own many companies at once.", example: "If one stock is 100% of your portfolio and falls 50%, you lose half. If it is 10% and falls 50%, the portfolio loses 5% from that position." },
    { id: "risk", term: "Risk & return", short: "Higher expected returns usually require more uncertainty.", long: "Investors demand compensation for taking risk. Volatile assets can offer higher expected returns, but they can also lose value quickly. Your time horizon, need for liquidity and ability to stay calm matter as much as the expected return.", example: "Cash in a savings account is stable but may lose purchasing power to inflation. Shares can grow more but may fall 20% in a bad year." },
    { id: "stock", term: "Stock", short: "A share of ownership in a company.", long: "A stock (or share) is a claim on part of a company's future profits and assets. Shareholders may receive dividends and voting rights. The share price changes as expectations about the business change — not only as current profits change.", example: "If a company has 1 million shares and you own 1,000, you own 0.1% of the business." },
    { id: "valuation", term: "P/E ratio", short: "Price divided by earnings per share.", long: "The price-to-earnings ratio compares a company's share price with its annual earnings per share. A P/E of 20 means investors pay $20 for each $1 of current annual earnings. High P/Es can reflect strong growth expectations — or overoptimism. Compare within industries and alongside growth, debt and risk.", example: "Company A trades at $50 with $5 earnings per share: P/E 10. Company B trades at $50 with $1 earnings: P/E 50." },
    { id: "inflation", term: "Inflation", short: "The slow rise in the price of goods and services.", long: "Inflation reduces the purchasing power of money. If prices rise 3% a year, the same basket of goods costs about 34% more after 10 years. Central banks often raise interest rates to cool inflation — which can pressure share prices, especially for expensive growth companies.", example: "At 3% inflation, $100 buys about $74 worth of goods after 10 years." },
    { id: "interest", term: "Interest rate", short: "The price of borrowing money.", long: "Interest rates are the cost of borrowing and the reward for saving. Higher rates make borrowing more expensive, slow the economy and reduce the present value of future profits. That is why rate-sensitive stocks often move when central banks speak.", example: "A $200,000 mortgage at 4% costs less each month than the same mortgage at 7%." },
    { id: "dividend", term: "Dividend", short: "A cash payment to shareholders.", long: "A dividend is part of a company's profit paid to shareholders, usually quarterly. A dividend yield is the annual dividend divided by the share price. A very high yield can be a warning that the market expects the payout to be cut.", example: "A $50 share paying $2 a year has a 4% dividend yield." },
    { id: "etf", term: "ETF", short: "A basket of investments that trades like a stock.", long: "An exchange-traded fund pools money to buy a portfolio of assets. It trades on an exchange like a share. Broad-market ETFs offer instant diversification, usually at a low fee.", example: "One Market 100 ETF share can give you exposure to 100 companies instead of buying 100 separate shares." },
    { id: "volatility", term: "Volatility", short: "How much a price swings around.", long: "Volatility measures the size and speed of price movements. High volatility means a wider range of possible outcomes. It is not the same as risk of permanent loss, but it makes staying invested harder.", example: "A stock that moves 3% a day is more volatile than a bond fund that moves 0.2% a day." },
    { id: "liquidity", term: "Liquidity", short: "How easily an asset turns into cash.", long: "Liquidity is the ability to sell an asset quickly at a fair price. Public shares are usually liquid; a private company or a house can take months to sell. Businesses also need liquid cash to handle surprises.", example: "Cash is perfectly liquid. A rental property is not — selling it may take months and transaction costs." },
    { id: "marketcap", term: "Market cap", short: "Share price × shares outstanding.", long: "Market capitalisation is the market's value of all a company's shares. It is not the same as the amount of cash the company has, or the price a buyer would pay for the whole business.", example: "A $20 share price with 10 million shares gives a market cap of $200 million." },
    { id: "yield", term: "Yield", short: "Income from an investment, as a percentage.", long: "Yield expresses annual income as a percentage of the investment's price. Dividend yield is annual dividend ÷ share price. Bond yield reflects the interest payments and price paid. Yields and prices usually move in opposite directions.", example: "A $100 bond paying $5 a year has a 5% yield. If its price falls to $80, the yield rises to 6.25%." },
    { id: "fx", term: "Exchange rate", short: "The price of one currency in another.", long: "An exchange rate is the price of one currency in terms of another. When the dollar strengthens, foreign revenue converts into fewer dollars. Currency movements can help or hurt a global company even when local sales are steady.", example: "If 1 USD buys 5 Brazilian reais today and 6 tomorrow, the dollar has strengthened — and Brazilian revenue is worth fewer dollars." },
    { id: "diminishing", term: "Diminishing returns", short: "Each extra unit can add less than the last.", long: "Diminishing returns occur when adding more of one input produces smaller and smaller increases in output. The best locations, customers and ideas are often taken first. This is why upgrade prices rise in the game — and why growth gets harder at scale.", example: "The first coffee cart in a town may be busy. The tenth may compete for the same morning commuters." }
  ],

  lessons: [
    {
      id: "cashflow", num: 1, icon: "💧", tag: "Foundations", time: "3 min", reward: 150,
      title: "Cash flow vs. profit",
      summary: "Why a profitable company can still run out of money.",
      paragraphs: [
        "Profit and cash are related, but they are not the same thing. <strong>Profit</strong> is revenue minus expenses over a period. <strong>Cash flow</strong> is when money actually lands in — or leaves — the bank account.",
        "A business can be profitable on paper and still fail if it runs out of cash. Customers might pay in 60 days while rent, wages and suppliers need paying now. Timing is everything.",
        "In the game, buying a venture uses cash today and adds passive income over time. Watch both your <button class=\"inline-term\" data-term=\"cashflow\">cash balance</button> and your income rate: growth without a cash buffer is fragile."
      ],
      example: "A bakery sells $1,000 of bread on 30-day credit. Its accounting profit is $200, but its cash balance is $0 until the invoice is paid.",
      key: "Cash keeps you alive; profit tells you whether the business model works over time.",
      quiz: { q: "A company is profitable but has almost no cash. What is the most urgent thing to examine?", options: ["Its logo", "The timing of cash inflows and outflows", "The CEO's salary only", "Whether the share price is high"], answer: 1, explain: "Profit is an accounting measure. If cash arrives later than bills are due, a profitable company can still become insolvent." }
    },
    {
      id: "supply", num: 2, icon: "⚖️", tag: "Markets", time: "3 min", reward: 220,
      title: "Supply, demand & price",
      summary: "Why prices rise, fall, and eventually settle.",
      paragraphs: [
        "Prices are not arbitrary. They emerge from the interaction of <strong>supply</strong> and <strong>demand</strong>. Buyers want more when prices are low; sellers offer more when prices are high.",
        "When demand increases faster than supply, buyers compete and prices rise. The higher price attracts more suppliers. As supply catches up, the price can settle. This is the market's feedback loop.",
        "Your ventures experience something similar. The first locations are cheap; as you scale, the next opportunity costs more because the easiest customers are already served. That is <button class=\"inline-term\" data-term=\"diminishing\">diminishing returns</button>."
      ],
      example: "A hit pair of sneakers sells out. Resale prices jump. That high price encourages more production, and eventually supply catches up.",
      key: "Price is a signal: it tells buyers what to conserve and sellers what to produce.",
      quiz: { q: "A product becomes suddenly popular and supply cannot keep up. What usually happens to its price?", options: ["It falls immediately", "It tends to rise", "It stays fixed by law", "Nothing changes"], answer: 1, explain: "When more buyers compete for limited supply, sellers can charge more. Higher prices also encourage new supply over time." }
    },
    {
      id: "compound", num: 3, icon: "⏳", tag: "Wealth", time: "3 min", reward: 280,
      title: "The power of compounding",
      summary: "How small, repeated returns become a big number.",
      paragraphs: [
        "<strong>Compounding</strong> means earning returns on your returns. Ten percent on $1,000 is $100. Next year, 10% is calculated on $1,100, not $1,000.",
        "The effect looks tiny in a spreadsheet at first. Then it accelerates. A useful shortcut is the <strong>Rule of 72</strong>: divide 72 by the annual return to estimate how many years it takes to double your money.",
        "In the game, reinvesting profit into more ventures is compounding. Each new business adds permanent income, which buys the next business faster."
      ],
      example: "$1,000 at 8% a year becomes about $2,159 after 10 years. Add $100 a month and it becomes over $19,000.",
      key: "Time is the ingredient most investors underestimate. Start early, reinvest, and be patient.",
      quiz: { q: "You invest $1,000 at 10% compound interest for two years. How much do you have at the end?", options: ["$1,100", "$1,200", "$1,210", "$2,000"], answer: 2, explain: "After one year: $1,100. After two: 10% of $1,100 is $110, for a total of $1,210." }
    },
    {
      id: "diversify", num: 4, icon: "🧺", tag: "Portfolio", time: "3 min", reward: 320,
      title: "Diversification",
      summary: "Why eggs belong in more than one basket.",
      paragraphs: [
        "If all your money is in one company and that company stumbles, your portfolio suffers with it. <strong>Diversification</strong> spreads money across companies, industries, countries and asset types.",
        "It cannot stop the whole market falling, but it reduces the impact of any single mistake. Different assets do not always move together — that is the point.",
        "A broad <button class=\"inline-term\" data-term=\"etf\">ETF</button> is a practical way to own hundreds of companies at once with one purchase. In the game, try owning several sectors instead of only the fastest mover."
      ],
      example: "If one stock is 100% of your portfolio and drops 50%, you lose half. If it is 10% of your portfolio, a 50% drop costs you 5%.",
      key: "Diversification reduces company-specific risk, not the risk of markets falling as a whole.",
      quiz: { q: "Which action best reduces company-specific risk in a portfolio?", options: ["Buying more shares of the same company", "Spreading money across different industries and companies", "Checking the price every minute", "Using all your cash on one high-growth stock"], answer: 1, explain: "Owning a variety of businesses means one company's bad news matters less to the total portfolio." }
    },
    {
      id: "risk", num: 5, icon: "🎢", tag: "Investing", time: "4 min", reward: 360,
      title: "Risk, return & volatility",
      summary: "The trade-off behind every investment.",
      paragraphs: [
        "Higher expected returns usually come with higher uncertainty. If an investment promised a big return with no risk, everyone would pile in and the price would change until the advantage disappeared.",
        "<strong>Volatility</strong> is how much a price swings. It is not the same as losing money permanently, but it is uncomfortable. Your time horizon matters: a short-term goal should not depend on a volatile asset.",
        "Know yourself, too. If a 20% fall would make you panic-sell, a concentrated high-volatility portfolio may be wrong for you even if its expected return is higher."
      ],
      example: "Cash is stable but may lose purchasing power to inflation. Shares have historically grown more over long periods, but can fall sharply in any given year.",
      key: "Risk is not just price swings. It is the chance of not meeting your goal — and the chance you panic at the wrong moment.",
      quiz: { q: "Which investment generally has the highest expected return over the long run?", options: ["Cash under a mattress", "A savings account", "A diversified portfolio of shares", "A single lottery ticket"], answer: 2, explain: "Shares are riskier than cash, so investors have historically demanded a higher expected return. Diversification spreads that risk." }
    },
    {
      id: "stocks", num: 6, icon: "📜", tag: "Stocks", time: "3 min", reward: 400,
      title: "What is a stock?",
      summary: "Buying a share means buying a slice of a business.",
      paragraphs: [
        "A <strong>stock</strong> is a share of ownership in a company. If the company has 1 million shares and you own 1,000, you own 0.1% of the business - its profits, its assets and its problems.",
        "You can make money in two main ways: the share price rises, or the company pays you a <button class=\"inline-term\" data-term=\"dividend\">dividend</button>. Prices move because expectations about the future change.",
        "Owning shares is not the same as lending money. Lenders get paid first; shareholders get what is left. That extra risk is why shares can offer higher long-term returns."
      ],
      example: "A company earns $2 million and has 1 million shares. Earnings per share are $2. At a $40 share price, the P/E ratio is 20.",
      key: "A share is a claim on a real business. The ticker moving is just the market's changing opinion.",
      quiz: { q: "What does owning one share of a company give you?", options: ["A guaranteed monthly payment", "A loan to the company", "Part ownership of the company", "Control over all decisions"], answer: 2, explain: "A share is a unit of ownership. It may come with dividends and voting rights, but there are no guaranteed returns." }
    },
    {
      id: "valuation", num: 7, icon: "🔍", tag: "Analysis", time: "3 min", reward: 450,
      title: "Valuation & the P/E ratio",
      summary: "How to read the price tag on a business.",
      paragraphs: [
        "A low share price does not automatically mean cheap. What matters is what you get for the price. The <strong>price-to-earnings ratio</strong> compares the share price with annual earnings per share.",
        "A P/E of 20 means you are paying $20 for each $1 of current annual earnings. A high P/E can be justified by fast growth, but it leaves less room for disappointment.",
        "<button class=\"inline-term\" data-term=\"valuation\">Valuation</button> is always relative: compare a company with its industry peers and its own history. Also check debt, cash flow and whether the growth is actually profitable."
      ],
      example: "Company A earns $5 per share and trades at $50 (P/E 10). Company B earns $1 per share and trades at $50 (P/E 50). B must grow much faster to justify its price.",
      key: "P/E is a starting point, not a verdict. A cheap-looking company can be a value trap; an expensive one can be worth it.",
      quiz: { q: "A share trades at $60 and earnings per share are $3. What is the P/E ratio?", options: ["3", "20", "60", "180"], answer: 1, explain: "P/E = price ÷ earnings per share = $60 ÷ $3 = 20." }
    },
    {
      id: "macro", num: 8, icon: "🌍", tag: "Macro", time: "4 min", reward: 500,
      title: "Inflation, rates & currencies",
      summary: "The global forces that move every market.",
      paragraphs: [
        "Inflation is a broad rise in prices. It quietly reduces what your money can buy. Central banks often respond by raising <button class=\"inline-term\" data-term=\"interest\">interest rates</button> to cool demand.",
        "Higher rates make borrowing more expensive and make future profits less valuable today. That can hit fast-growing companies hardest. Lower rates can do the opposite.",
        "When you earn money abroad, <button class=\"inline-term\" data-term=\"fx\">exchange rates</button> matter. A stronger dollar turns foreign revenue into fewer dollars, even if local sales are unchanged."
      ],
      example: "At 3% inflation, prices roughly double in about 24 years (72 ÷ 3). Meanwhile, $1,000 in a 1% savings account grows far more slowly in purchasing power.",
      key: "Inflation, interest rates and currencies connect the whole global economy. No market is an island.",
      quiz: { q: "If inflation stays high, what do central banks typically do?", options: ["Raise interest rates", "Lower all taxes", "Print unlimited money", "Ban imports"], answer: 0, explain: "Higher interest rates make borrowing more expensive and can slow demand, helping to bring inflation down over time." }
    }
  ],

  news: [
    { tag: "Technology", sectors: ["Technology"], impact: 0.052, headline: "AI demand beats forecasts: cloud shares surge", detail: "NovaCloud raised its revenue outlook as enterprise customers spent more on AI infrastructure.", explain: "When future growth expectations rise, investors are often willing to pay a higher price for the same current earnings." },
    { tag: "Technology", sectors: ["Technology"], impact: -0.047, headline: "Regulators open probe into big-tech pricing", detail: "A new competition inquiry could lead to fines and changes in how cloud services are bundled.", explain: "Regulation can raise costs or limit pricing power. Markets reprice the risk immediately, even before any fine is final." },
    { tag: "Rates", sectors: ["Technology", "Diversified"], impact: -0.034, headline: "Central bank signals higher-for-longer rates", detail: "Bond yields rose after policymakers warned that inflation is still too sticky.", explain: "Higher rates reduce the present value of future profits. Long-duration growth stocks usually feel it first." },
    { tag: "Energy", sectors: ["Energy"], impact: 0.064, headline: "New solar subsidies pass: clean-energy shares jump", detail: "The package lowers project costs and extends tax credits for grid-scale storage.", explain: "A subsidy can improve expected profits without the company selling a single extra panel today." },
    { tag: "Energy", sectors: ["Energy"], impact: -0.046, headline: "Panel prices slide as global supply floods market", detail: "Manufacturers are producing more than installers can absorb, pressuring margins.", explain: "Too much supply can crush prices even when the long-term story is strong." },
    { tag: "Consumer", sectors: ["Consumer"], impact: 0.041, headline: "Consumer spending beats expectations", detail: "Retail sales rose as households opened their wallets despite higher borrowing costs.", explain: "Consumer demand drives revenue for many businesses. Strong data can lift shares, but it can also keep rates higher." },
    { tag: "Financials", sectors: ["Financials"], impact: -0.068, headline: "Regional bank stress returns to the headlines", detail: "Depositors moved cash after a lender reported losses on its bond portfolio.", explain: "Banks are leveraged businesses. Small changes in asset values can have a large effect on confidence." },
    { tag: "Healthcare", sectors: ["Healthcare"], impact: 0.071, headline: "Helix Bio trial beats expectations", detail: "An experimental treatment showed stronger results than the current standard of care.", explain: "Biotech shares are often priced on probabilities of trial success. Better data can reprice the whole company." },
    { tag: "Healthcare", sectors: ["Healthcare"], impact: -0.058, headline: "Drug trial misses primary endpoint", detail: "A late-stage study failed to show a statistically significant benefit.", explain: "Binary events are common in biotech. Diversification matters when one company's outcome can swing so widely." },
    { tag: "Luxury", sectors: ["Luxury"], impact: 0.045, headline: "Wealthy shoppers keep spending on premium brands", detail: "Lumen reported resilient demand in Asia and raised its full-year margin outlook.", explain: "Pricing power is valuable. A brand that can raise prices without losing customers protects its margins." },
    { tag: "Industrials", sectors: ["Industrials"], impact: 0.049, headline: "Factory orders rebound across major economies", detail: "Aerospace and machinery orders rose for a second month, suggesting stronger capital spending.", explain: "Industrial companies are cyclical. Their orders often reveal where the wider economy is heading." },
    { tag: "Industrials", sectors: ["Industrials"], impact: -0.043, headline: "Supply-chain bottlenecks slow aircraft deliveries", detail: "A shortage of specialised parts pushed back delivery schedules at several manufacturers.", explain: "Operational problems can turn a full order book into delayed revenue. Execution matters." },
    { tag: "Markets", sectors: ["Diversified"], impact: 0.031, headline: "Earnings season beats forecasts across the market", detail: "A broad set of companies reported better margins, lifting the Market 100 ETF.", explain: "Index funds rise when the aggregate earnings power of their many holdings improves." },
    { tag: "Markets", sectors: ["Diversified"], impact: -0.037, headline: "Global growth forecast cut as trade slows", detail: "Economists lowered their outlook for major economies and warned of weaker export demand.", explain: "A broad slowdown reduces expected earnings across many sectors at once. Diversification cannot remove this risk." },
    { tag: "Currency", sectors: ["Diversified", "Technology"], impact: -0.022, headline: "Dollar strengthens to a two-year high", detail: "Safe-haven demand and higher US rates pushed the dollar up against most major currencies.", explain: "A stronger dollar is a headwind for multinational earnings when foreign revenue is converted back to USD." },
    { tag: "Consumer", sectors: ["Consumer", "Luxury"], impact: -0.038, headline: "Household confidence slips as costs rise", detail: "Survey data showed shoppers planning to cut discretionary spending next quarter.", explain: "Expectations matter. If consumers say they will spend less, investors lower revenue forecasts before sales actually fall." },
    { tag: "Bonds", sectors: ["Financials", "Diversified"], impact: 0.028, headline: "Inflation cools slightly, bond yields fall", detail: "Softer price data increased hopes that the central bank can begin cutting rates.", explain: "Falling yields support valuations, especially for long-duration assets such as growth shares and bonds." },
    { tag: "Academy", sectors: [], impact: 0, headline: "Tip: a falling price is not automatically a bargain", detail: "Ask why the price fell — and whether the long-term earnings power has changed.", explain: "Price and value are different. A cheap-looking asset can be cheap for a reason." }
  ],

  fallbackFx: { USD: 1, CAD: 1.37, MXN: 18.2, BRL: 5.55, GBP: 0.78, EUR: 0.92, NGN: 1550, ZAR: 18.1, AED: 3.67, INR: 84.2, SGD: 1.34, JPY: 152.3, AUD: 1.52 }
};
