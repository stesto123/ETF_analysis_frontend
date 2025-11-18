export type LearningLevelId = 'beginner' | 'intermediate' | 'advanced';
export type LearningTrackId = 'foundations' | 'portfolio' | 'strategy' | 'labs';

export type LessonCTA = {
  id: string;
  label: string;
  route: string;
  description?: string;
  prompt?: string;
};

export type LearningLesson = {
  id: string;
  title: string;
  duration: string;
  content: string[];
  takeaways: string[];
  ctas: LessonCTA[];
  aiPrompts: string[];
};

export type LearningTopic = {
  id: string;
  title: string;
  track: LearningTrackId;
  summary: string;
  lessons: LearningLesson[];
  practice: string[];
};

export type LearningLevelMeta = {
  id: LearningLevelId;
  label: string;
  description: string;
  longDescription: string;
};

export const TRACK_LABELS: Record<LearningTrackId, string> = {
  foundations: 'Foundations',
  portfolio: 'Portfolio Construction',
  strategy: 'Strategies',
  labs: 'Practice Labs',
};

export const TRACK_DESCRIPTIONS: Record<LearningTrackId, string> = {
  foundations: 'Start with vocabulary, structure, and day-to-day mechanics.',
  portfolio: 'Translate ETF knowledge into diversified allocations.',
  strategy: 'Deep dives into factor tilts, thematic plays, and fixed income.',
  labs: 'Hands-on labs that combine analytics, chat, and the pipeline.',
};

export const LEARNING_LEVELS: LearningLevelMeta[] = [
  {
    id: 'beginner',
    label: 'Beginner',
    description: 'Start from scratch and learn the ETF basics.',
    longDescription: 'Understand what an ETF is, how it trades, and how to research your first fund.',
  },
];

export const LEARNING_PATHS: Record<LearningLevelId, LearningTopic[]> = {
  beginner: [
    {
      id: 'topic-foundations-basics',
      track: 'foundations',
      title: 'ETF Foundations',
      summary: 'Understand how ETFs are assembled, priced, and why they are popular with long-term investors.',
      lessons: [
        {
          id: 'lesson-etf-structure',
          title: 'How ETFs are built',
          duration: '6 min',
          content: [
            'An exchange-traded fund (ETF) sits between a mutual fund and a stock. Issuers create ETF “shares” backed by a basket of securities that mirrors an index or strategy.',
            'Authorized participants swap baskets of securities for ETF shares in the primary market. You, the investor, buy and sell those shares on the exchange just like a normal stock.',
            'This creation/redemption process keeps the market price close to the fund’s net asset value (NAV) and allows ETFs to stay diversified without constant portfolio churn.',
          ],
          takeaways: [
            'ETFs hold a transparent basket that targets a defined index or objective.',
            'Creation/redemption keeps the fund aligned to its holdings and limits big premiums or discounts.',
            'You trade ETF shares on an exchange even though the fund owns dozens or hundreds of positions.',
          ],
          ctas: [
            {
              id: 'cta-etf-structure-analytics',
              label: 'Open analytics',
              description: 'Inspect the holdings list of a broad ETF.',
              route: '/(tabs)',
            },
            {
              id: 'cta-etf-structure-chat',
              label: 'Ask the AI',
              description: 'Have the assistant compare an ETF basket to a single stock.',
              route: '/(tabs)/chat',
              prompt: 'Explain how the holdings list of VWCE differs from owning Apple directly.',
            },
          ],
          aiPrompts: [
            'Summarize how ETF creation and redemption works using simple language.',
            'Why do ETF issuers rely on authorized participants?',
          ],
        },
        {
          id: 'lesson-etf-trading',
          title: 'Trading & liquidity basics',
          duration: '5 min',
          content: [
            'When you place a trade, you interact with the secondary market. Bid/ask spreads, volume, and the time of day influence the final execution price.',
            'Large ETFs typically have tight spreads because market makers can quickly hedge positions. Niche products may be liquid, but spreads widen when the market for the underlying holdings is thin.',
            'Use limit orders when possible and avoid trading during the first or last minutes of the session to let spreads stabilize.',
          ],
          takeaways: [
            'Secondary-market supply/demand dictates the trade price even though the NAV anchors value.',
            'Spreads and volume are indicators of trading friction.',
            'Plan trades outside volatile windows and prefer limit orders for control.',
          ],
          ctas: [
            {
              id: 'cta-trading-analytics',
              label: 'View liquidity metrics',
              description: 'Review spreads and volume inside analytics.',
              route: '/(tabs)',
            },
          ],
          aiPrompts: [
            'How do spreads differ between SPY and a small thematic ETF?',
            'When should I consider using a limit order for ETFs?',
          ],
        },
        {
          id: 'lesson-etf-costs',
          title: 'Fees and total cost',
          duration: '5 min',
          content: [
            'Expense ratios show the ongoing cost to run the fund. For index ETFs these are often below 0.2%, while specialized funds can exceed 0.6%.',
            'Trading introduces other costs—spreads, commissions (if any), and taxes. A lower expense ratio may not offset a wide spread if you trade frequently.',
            'Assess total cost of ownership: expense ratio, tracking error versus the benchmark, taxes on distributions, and any platform fees.',
          ],
          takeaways: [
            'Expense ratios are annualized but deducted daily from the fund’s NAV.',
            'Spreads, tracking error, and taxes matter as much as the sticker fee.',
            'Long holding periods make low-cost, diversified ETFs powerful compounding tools.',
          ],
          ctas: [
            {
              id: 'cta-costs-chat',
              label: 'Discuss cost structure',
              description: 'Send a prompt to the assistant with two ETFs to compare.',
              route: '/(tabs)/chat',
              prompt: 'Compare the TER and tax treatment of CSPX and EIMI.',
            },
          ],
          aiPrompts: [
            'What is the difference between TER and tracking error?',
            'How can taxes impact ETF returns for EU investors?',
          ],
        },
      ],
      practice: [
        'Open analytics and inspect an ETF’s holdings list. Note the top five positions.',
        'Add two ETFs with different spreads to your watchlist and monitor intraday prices.',
        'Ask the AI which costs matter most for long-term, buy-and-hold investors.',
      ],
    },
    {
      id: 'topic-getting-started-app',
      track: 'foundations',
      title: 'Using the App to Learn',
      summary: 'Connect lessons to real data with analytics, chat, and your pipeline watchlist.',
      lessons: [
        {
          id: 'lesson-analytics-tour',
          title: 'Analytics walkthrough',
          duration: '7 min',
          content: [
            'The Analytics tab filters ETFs by geography, theme, or issuer. Use the chips to focus on regions, then tap a fund for metrics like volatility and drawdown.',
            'Run historical performance queries to see how ETFs moved together. Save combinations you like and reuse them during research.',
            'Every metric includes tooltips—tap them to reinforce what you learned in the lesson modules.',
          ],
          takeaways: [
            'Filters narrow the ETF universe fast.',
            'Performance queries validate what a lesson explained.',
            'Tooltips and cards keep terminology consistent across the app.',
          ],
          ctas: [
            {
              id: 'cta-analytics-open',
              label: 'Launch analytics',
              description: 'Put your filters into action.',
              route: '/(tabs)',
            },
          ],
          aiPrompts: [
            'How can I interpret the volatility metric inside analytics?',
            'Suggest two filters to find diversified global equity ETFs.',
          ],
        },
        {
          id: 'lesson-chat-workflow',
          title: 'Chat-assisted research',
          duration: '6 min',
          content: [
            'Use the Chat tab as your research partner. Paste tickers, ask qualitative questions, or request comparisons after you finish a lesson.',
            'The assistant remembers the conversation, so you can iterate: first ask for a summary, then drill into fees, then request a checklist.',
            'Combine answers from the assistant with analytics data to decide whether an ETF fits your goal.',
          ],
          takeaways: [
            'Chat is best when you provide context—goal, time horizon, ETF list.',
            'Iterative questioning surfaces risks you might overlook.',
            'Lessons, chat, and analytics reinforce each other.',
          ],
          ctas: [
            {
              id: 'cta-chat-open',
              label: 'Open chat',
              description: 'Start a guided conversation.',
              route: '/(tabs)/chat',
              prompt: 'I am new to ETFs. Help me evaluate VWCE for a passive strategy.',
            },
          ],
          aiPrompts: [
            'What should I ask the assistant after reading about ETF costs?',
            'How can the AI help me compare two ETFs that track the same index?',
          ],
        },
        {
          id: 'lesson-watchlist',
          title: 'Building a watchlist',
          duration: '4 min',
          content: [
            'Save ETFs that match your interests. Watching a curated list keeps you focused and brings notifications when data refreshes.',
            'Group watchlists by objective: “Core global”, “Income”, or “Thematic bets”. Pair each watchlist with relevant lessons.',
            'Review watchlists after each module to connect theory with an actionable idea.',
          ],
          takeaways: [
            'A tight watchlist keeps learning actionable.',
            'Naming conventions help you remember why each ETF matters.',
            'Review saved ETFs whenever you complete a lesson to reinforce memory.',
          ],
          ctas: [
            {
              id: 'cta-watchlist-analytics',
              label: 'Add candidates',
              description: 'From analytics, tap the bookmark icon on ETFs that match today’s lesson.',
              route: '/(tabs)',
            },
          ],
          aiPrompts: [
            'What three ETFs should I add to a beginner-friendly watchlist?',
          ],
        },
      ],
      practice: [
        'Create a “First portfolio” watchlist with three diverse ETFs.',
        'Run one analytics query per lesson to visualize what you just read.',
        'Start a chat asking how two saved ETFs complement each other.',
      ],
    },
    {
      id: 'topic-beginner-understand-purchases',
      track: 'foundations',
      title: 'Understand what you are buying',
      summary: 'Master ETF vocabulary—what you hold, how it trades, which costs matter, and why structure affects compounding.',
      lessons: [
        {
          id: 'lesson-etf-vs-mutual-funds',
          title: 'ETF vs mutual funds',
          duration: '6 min',
          content: [
            'An ETF replicates an index and trades intraday like a stock; it aims to mirror market performance rather than beat it.',
            'Passive rules remove day-to-day discretion, so holdings change only when the benchmark rebalances.',
            'One share buys a pre-built bundle of securities, giving instant diversification without paying for constant portfolio churn.',
          ],
          takeaways: [
            'ETFs follow rule-based indices while many mutual funds rely on discretionary managers.',
            'Transparency and low turnover keep costs predictable.',
            'Buying a single ETF feels like buying hundreds of companies at once.',
          ],
          ctas: [
            {
              id: 'cta-beginner-etf-mutual-chat',
              label: 'Ask the AI',
              description: 'Request a comparison between your favorite mutual fund and an ETF.',
              route: '/(tabs)/chat',
              prompt: 'Explain the main differences between a passive ETF and an actively managed mutual fund for a new investor.',
            },
          ],
          aiPrompts: [
            'Describe three reasons ETFs are often cheaper than mutual funds.',
          ],
        },
        {
          id: 'lesson-understanding-indices',
          title: 'Understanding indices',
          duration: '6 min',
          content: [
            'An index is a rule-based basket that represents a market segment, such as US large caps (S&P 500) or global developed equities (MSCI World).',
            'Each index defines selection criteria, weighting methods, and rebalancing schedules that determine what your ETF truly owns.',
            'Studying the methodology tells you whether the ETF is concentrated, sector-biased, or diversified beyond the marketing name.',
          ],
          takeaways: [
            'Owning an ETF means owning the index methodology under the hood.',
            'Two global indices can have different eligibility rules, so holdings differ.',
            'Knowing the rules helps you anticipate when and why the ETF rebalances.',
          ],
          ctas: [
            {
              id: 'cta-beginner-index-analytics',
              label: 'Inspect an index',
              description: 'Open analytics and review the sector mix of an index ETF.',
              route: '/(tabs)',
            },
          ],
          aiPrompts: [
            'Summarize the difference between MSCI World and FTSE Developed.',
          ],
        },
        {
          id: 'lesson-nav-vs-price',
          title: 'NAV vs trading price',
          duration: '5 min',
          content: [
            'The NAV is the theoretical per-share value calculated from closing prices of the holdings, while the market price reflects intraday supply and demand.',
            'Bid/ask spread is the gap between the highest buyer and lowest seller; tighter spreads mean cheaper execution.',
            'When the market price sits above or below NAV you see a premium or discount, typically tiny for liquid ETFs but important to monitor.',
          ],
          takeaways: [
            'NAV anchors value but trades execute at live market prices.',
            'Spreads are a hidden cost you can influence by trading carefully.',
            'Premiums/discounts are usually small but spike in stressed markets.',
          ],
          ctas: [
            {
              id: 'cta-beginner-nav-chat',
              label: 'Clarify with AI',
              description: 'Paste a ticker and ask when it last traded at a premium.',
              route: '/(tabs)/chat',
              prompt: 'Why would an ETF briefly trade at a premium to NAV?',
            },
          ],
          aiPrompts: [
            'How can I minimize spread costs when buying ETFs?',
          ],
        },
        {
          id: 'lesson-etf-types',
          title: 'Major ETF categories',
          duration: '6 min',
          content: [
            'Equity ETFs target growth and cover geographies from single countries to global baskets or individual sectors.',
            'Bond ETFs package government or corporate debt, typically to dampen portfolio volatility.',
            'Commodity and thematic ETFs (often ETCs) give access to metals, energy, or narratives such as clean energy, but come with higher concentration risk.',
          ],
          takeaways: [
            'Different ETF types map to different goals—growth, income, diversification, or speculation.',
            'Sector and thematic funds amplify potential returns and drawdowns.',
            'Bond ETFs are not risk-free; they simply respond to different drivers.',
          ],
          ctas: [
            {
              id: 'cta-beginner-type-watchlist',
              label: 'Classify your watchlist',
              description: 'Tag each saved ETF as equity, bond, commodity, or thematic inside analytics.',
              route: '/(tabs)',
            },
          ],
          aiPrompts: [
            'List pros and cons of using a commodity ETC versus an equity sector ETF.',
          ],
        },
        {
          id: 'lesson-base-costs',
          title: 'Core cost components',
          duration: '5 min',
          content: [
            'The TER (Total Expense Ratio) is deducted daily and sets the baseline annual cost you pay the issuer.',
            'Trading introduces broker commissions, spreads, and price impact—costs that matter when rebalancing frequently.',
            'Winning with ETFs means stacking the odds via low cost, low turnover, and patience rather than constant tinkering.',
          ],
          takeaways: [
            'TER is only part of total cost of ownership.',
            'Few, well-planned trades preserve the cost advantage of ETFs.',
            'Small percentage differences compound massively over decades.',
          ],
          ctas: [
            {
              id: 'cta-beginner-cost-chat',
              label: 'Run a cost scenario',
              description: 'Ask the AI to estimate long-term impact of TER differences.',
              route: '/(tabs)/chat',
              prompt: 'If I invest €500 monthly, how much does a 0.15% TER difference cost after 20 years?',
            },
          ],
          aiPrompts: [
            'What hidden costs should I watch when rebalancing ETFs quarterly?',
          ],
        },
        {
          id: 'lesson-minimums-pac',
          title: 'Minimum capital & recurring plans',
          duration: '5 min',
          content: [
            'Most brokers let you buy whole ETF shares, and many now offer fractional purchases so you can start with modest amounts.',
            'Recurring investment plans (PAC/DCA) automate contributions, smoothing entry points without timing every dip.',
            'Flexible contribution sizes and schedules make ETFs friendly for everyday savers, not only high-net-worth investors.',
          ],
          takeaways: [
            'You can start investing with the cost of a single share or even less via fractional features.',
            'DCA builds exposure steadily and removes timing anxiety.',
            'Consistency beats perfectly timing the market.',
          ],
          ctas: [
            {
              id: 'cta-beginner-pac-pipeline',
              label: 'Schedule contributions',
              description: 'Draft a simple recurring-plan simulation inside the pipeline tab.',
              route: '/(tabs)/pipeline',
            },
          ],
          aiPrompts: [
            'Suggest a €200 monthly ETF plan for a cautious investor.',
          ],
        },
        {
          id: 'lesson-risk-return-basics',
          title: 'Risk, return & volatility',
          duration: '6 min',
          content: [
            'Equity ETFs swing more but offer higher long-term expected returns; bond ETFs swing less but grow slower.',
            'Volatility measures how wildly prices move—it is not “bad”, but it tests your emotional resilience.',
            'Understanding risk/return trade-offs keeps you invested during inevitable downturns.',
          ],
          takeaways: [
            'Match ETF type to your time horizon and ability to stomach volatility.',
            'A diversified ETF can drop sharply in the short run yet still compound long term.',
            'Volatility is the “fee” you pay for higher expected returns.',
          ],
          ctas: [
            {
              id: 'cta-beginner-risk-analytics',
              label: 'Check volatility',
              description: 'Chart historical drawdowns for one equity and one bond ETF.',
              route: '/(tabs)',
            },
          ],
          aiPrompts: [
            'How do I explain volatility to someone scared of market swings?',
          ],
        },
        {
          id: 'lesson-diversification-basics',
          title: 'Diversification layers',
          duration: '6 min',
          content: [
            'Geographic diversification spreads risk across countries—global ETFs shield you from single-country shocks.',
            'Sector diversification keeps you balanced when industries cycle in and out of favor.',
            'Style diversification (value, growth, small caps) becomes more relevant as you move beyond basics but starts with understanding what each ETF tilts toward.',
          ],
          takeaways: [
            'A single broad ETF may cover thousands of companies worldwide.',
            'Concentrated sector bets need to stay small to avoid portfolio swings.',
            'Knowing each ETF’s style tilt prevents unintentional overlaps.',
          ],
          ctas: [
            {
              id: 'cta-beginner-diversification-watchlist',
              label: 'Audit diversification',
              description: 'Label each watchlist ETF by geography and sector focus.',
              route: '/(tabs)',
            },
          ],
          aiPrompts: [
            'What is the benefit of mixing global and regional ETFs?',
          ],
        },
        {
          id: 'lesson-acc-vs-dist',
          title: 'Accumulating vs distributing ETFs',
          duration: '5 min',
          content: [
            'Accumulating share classes reinvest dividends, boosting compounding automatically.',
            'Distributing share classes pay cash, useful if you seek income but reducing reinvestment speed.',
            'Tax rules and life stage influence which share class makes sense for you.',
          ],
          takeaways: [
            'Compounding accelerates when payouts stay inside the fund.',
            'Cash distributions can fund spending goals but slow growth.',
            'Always check how your country taxes each share class.',
          ],
          ctas: [
            {
              id: 'cta-beginner-acc-dist-chat',
              label: 'Discuss share classes',
              description: 'Ask the AI to contrast an accumulating vs distributing ETF you follow.',
              route: '/(tabs)/chat',
              prompt: 'Help me decide between an accumulating and distributing UCITS ETF for long-term investing.',
            },
          ],
          aiPrompts: [
            'Give me a checklist for picking between acc and dist share classes.',
          ],
        },
        {
          id: 'lesson-ucits-domicile-currency',
          title: 'UCITS, domicile & currencies',
          duration: '6 min',
          content: [
            'UCITS is the European regulatory framework that enforces diversification, disclosure, and investor protection standards.',
            'Fund domicile (Ireland, Luxembourg, etc.) drives legal jurisdiction and certain tax treaties but does not dictate where the ETF invests.',
            'Base currency is the accounting currency for the portfolio, while the listing currency is what you trade in—FX risk ultimately comes from the underlying assets.',
          ],
          takeaways: [
            'UCITS labeling signals compliance with EU rules.',
            'Domicile affects taxation of dividends before they reach you.',
            'Listing currency differs from the currencies of the holdings.',
          ],
          ctas: [
            {
              id: 'cta-beginner-ucits-chat',
              label: 'Clarify FX exposure',
              description: 'Send the assistant a question about domicile vs investment region.',
              route: '/(tabs)/chat',
              prompt: 'Does an Irish-domiciled ETF quoted in EUR still carry USD exposure if it tracks the S&P 500?',
            },
          ],
          aiPrompts: [
            'What is the difference between fund domicile and trading exchange?',
          ],
        },
      ],
      practice: [
        'Pick one ETF and write down the index methodology in your own words.',
        'Record the spread, NAV, and market price at two different times of the day.',
        'List whether each ETF in your watchlist is accumulating or distributing and why.',
      ],
    },
  ],
  intermediate: [
    {
      id: 'topic-portfolio-construction',
      track: 'portfolio',
      title: 'Portfolio Construction',
      summary: 'Turn ETF knowledge into allocation rules, risk budgets, and rebalancing habits.',
      lessons: [
        {
          id: 'lesson-core-satellite',
          title: 'Core-satellite design',
          duration: '7 min',
          content: [
            'The core holds broad-market ETFs that deliver beta at low cost. Satellites tilt toward factors or regions you believe will outperform.',
            'Define the purpose of each satellite: growth, income, inflation hedge, or tactical bet. Cap satellites to a percent of the portfolio to protect diversification.',
            'Review correlations between satellites and the core using analytics before funding them.',
          ],
          takeaways: [
            'Core holdings anchor risk; satellites express specific views.',
            'Predefine allocation limits per satellite to avoid drift.',
            'Use historical correlation data to avoid overlapping bets.',
          ],
          ctas: [
            {
              id: 'cta-core-analytics',
              label: 'Compare correlations',
              description: 'Select core and satellite ETFs in analytics and run a correlation query.',
              route: '/(tabs)',
            },
            {
              id: 'cta-core-pipeline',
              label: 'Draft in pipeline',
              description: 'Open the pipeline tab and sketch allocations for your idea.',
              route: '/(tabs)/pipeline',
            },
          ],
          aiPrompts: [
            'Suggest a core-satellite mix for a balanced investor using ETFs.',
            'What factors make a good satellite candidate?',
          ],
        },
        {
          id: 'lesson-risk-budget',
          title: 'Risk budgeting & factor mix',
          duration: '8 min',
          content: [
            'Allocate volatility across factors (value, momentum, quality) rather than just nominal percentages.',
            'Use rolling volatility from analytics to define how much each ETF can contribute to total downside.',
            'Document scenarios—when does a factor underperform? Which macro regimes hurt it most?',
          ],
          takeaways: [
            'Risk budgets keep concentrated factor bets in check.',
            'Volatility and drawdown history turn vague “risk” into measurable data.',
            'Scenario mapping prepares you for inevitable periods of underperformance.',
          ],
          ctas: [
            {
              id: 'cta-risk-analytics',
              label: 'Inspect factor stats',
              description: 'Run volatility metrics for your preferred factor ETFs.',
              route: '/(tabs)',
            },
          ],
          aiPrompts: [
            'Explain how to size a momentum ETF if I want risk parity with a broad ETF.',
            'What macro backdrop usually harms quality-focused ETFs?',
          ],
        },
        {
          id: 'lesson-rebalance',
          title: 'Rebalancing cadence',
          duration: '5 min',
          content: [
            'Choose a trigger: time-based (quarterly) or threshold-based (when weights drift). Combine both for discipline.',
            'Automate rebalancing in the pipeline simulator to understand tax and trading costs before implementing live.',
            'Document which metrics you will monitor after each rebalance to validate the thesis.',
          ],
          takeaways: [
            'Rules-based rebalancing maintains your intended exposures.',
            'Simulation highlights how often you might trade and what it costs.',
            'A checklist after each rebalance prevents emotional tinkering.',
          ],
          ctas: [
            {
              id: 'cta-rebalance-pipeline',
              label: 'Run a simulation',
              description: 'Use the pipeline to backtest quarterly vs threshold rebalancing.',
              route: '/(tabs)/pipeline',
            },
          ],
          aiPrompts: [
            'What are the pros and cons of quarterly rebalancing for ETF portfolios?',
            'Help me design a threshold-based rule for a two-ETF allocation.',
          ],
        },
      ],
      practice: [
        'Draft a core-satellite plan with target weights and guardrails.',
        'Compute correlations between each satellite and the core ETF.',
        'Simulate two rebalancing approaches and compare turnover.',
      ],
    },
    {
      id: 'topic-research-workflow',
      track: 'portfolio',
      title: 'Research Workflow',
      summary: 'Evaluate ETF quality across liquidity, cost, and operational considerations.',
      lessons: [
        {
          id: 'lesson-tracking-error',
          title: 'Tracking error deep dive',
          duration: '7 min',
          content: [
            'Tracking error measures the difference between the ETF’s returns and its benchmark. Consistently high tracking error signals replication issues or high costs.',
            'Review methodology documents to understand sampling vs full replication, securities lending, and cash drag.',
            'Compare multiple ETFs tracking the same index to see who performs closest to the benchmark.',
          ],
          takeaways: [
            'Low tracking error is essential for passive exposure.',
            'Replication method and cash management drive differences.',
            'Use analytics to overlay multiple funds on the same chart and inspect deviations.',
          ],
          ctas: [
            {
              id: 'cta-tracking-analytics',
              label: 'Overlay benchmarks',
              description: 'Run a performance comparison on two ETFs tracking MSCI World.',
              route: '/(tabs)',
            },
          ],
          aiPrompts: [
            'Why would two ETFs tracking MSCI World show different returns?',
            'Explain sampling vs full replication in practical terms.',
          ],
        },
        {
          id: 'lesson-liquidity-sourcing',
          title: 'Liquidity and venues',
          duration: '6 min',
          content: [
            'ETFs list on multiple exchanges. Pick the venue aligned with your currency and trading hours to reduce FX conversions.',
            'Average spread, on-screen depth, and primary-market activity together define real liquidity.',
            'For large allocations, coordinate with your broker to execute via risk trades or use creation/redemption directly.',
          ],
          takeaways: [
            'Multiple listings offer flexibility but introduce FX considerations.',
            'On-screen volume alone can underestimate available liquidity.',
            'Institutional-size trades often leverage capital markets desks.',
          ],
          ctas: [
            {
              id: 'cta-liquidity-analytics',
              label: 'Check spreads',
              description: 'Use analytics to compare spreads between listings.',
              route: '/(tabs)',
            },
          ],
          aiPrompts: [
            'How can I estimate the real liquidity of an ETF?',
            'What should I ask a broker before a large ETF trade?',
          ],
        },
        {
          id: 'lesson-tax-overview',
          title: 'Taxes & fund domicile',
          duration: '6 min',
          content: [
            'ETF domicile determines which treaties apply to dividends. Irish UCITS ETFs often reduce withholding on US equities compared with funds domiciled elsewhere.',
            'Distributing vs accumulating share classes change when you owe taxes. Match them to your country’s rules.',
            'Recordkeeping matters—keep PDF reports and export analytics data to document cost basis.',
          ],
          takeaways: [
            'Domicile plus share class dictate tax drag.',
            'Treaties can add or subtract dozens of basis points per year.',
            'Administrative discipline keeps surprises away during filing season.',
          ],
          ctas: [
            {
              id: 'cta-tax-chat',
              label: 'Clarify with AI',
              description: 'Send a prompt describing your residency and ETFs to discuss taxes.',
              route: '/(tabs)/chat',
              prompt: 'I live in Italy. How do taxes differ between distributing and accumulating UCITS ETFs?',
            },
          ],
          aiPrompts: [
            'What tax forms should I expect after buying UCITS ETFs?',
            'How does fund domicile affect withholding taxes for EU investors?',
          ],
        },
      ],
      practice: [
        'Pick two ETFs tracking the same index and compare tracking error.',
        'List the exchanges and tickers for your core ETFs and note the spreads.',
        'Document the tax treatment for each ETF in your watchlist.',
      ],
    },
    {
      id: 'topic-intermediate-select-combine',
      track: 'portfolio',
      title: 'Selecting & combining ETFs',
      summary: 'Evaluate replication, costs, liquidity, and behavioral discipline so your ETF mix works together.',
      lessons: [
        {
          id: 'lesson-replication-methods',
          title: 'Replication methods explained',
          duration: '7 min',
          content: [
            'Full physical replication buys nearly every index constituent, ideal for concentrated benchmarks but costly for sprawling ones.',
            'Sampling holds a representative subset when an index has thousands of names, trading precision for practicality.',
            'Synthetic replication uses swaps with a counterparty to match the index, introducing extra due-diligence on collateral and counterparty risk.',
          ],
          takeaways: [
            'Replication choice affects tracking quality and operational risk.',
            'Sampling is efficient for complex indices but can widen tracking differences.',
            'Synthetic ETFs demand scrutiny of swap counterparties and collateral rules.',
          ],
          ctas: [
            {
              id: 'cta-intermediate-replication-chat',
              label: 'Discuss replication',
              description: 'Ask the assistant which replication style fits a specific index.',
              route: '/(tabs)/chat',
              prompt: 'When is synthetic replication safer than physical for ETFs?',
            },
          ],
          aiPrompts: [
            'List pros and cons of sampling vs full replication.',
          ],
        },
        {
          id: 'lesson-tracking-diff-error',
          title: 'Tracking difference vs tracking error',
          duration: '6 min',
          content: [
            'Tracking difference measures how far the ETF’s total return deviates from the index over time; ideally it aligns with TER plus minor frictions.',
            'Tracking error captures the volatility of that difference—how tightly the ETF hugs the benchmark day after day.',
            'Securities lending, taxes, cash drag, and replication style drive these gaps more than headline TER alone.',
          ],
          takeaways: [
            'A low TER is meaningless if tracking difference is sloppy.',
            'Stable tracking error indicates operational excellence.',
            'Always inspect historical performance charts, not just marketing pages.',
          ],
          ctas: [
            {
              id: 'cta-intermediate-tracking-analytics',
              label: 'Quantify deviations',
              description: 'Overlay two ETFs against their benchmark in analytics.',
              route: '/(tabs)',
            },
          ],
          aiPrompts: [
            'How can two ETFs with identical TER show different tracking difference?',
          ],
        },
        {
          id: 'lesson-real-liquidity',
          title: 'Measuring real liquidity',
          duration: '6 min',
          content: [
            'Screen liquidity using spreads, average on-screen size, and the ability of market makers to tap the primary market.',
            'Thin-looking ETFs can still be liquid if the underlying basket trades actively, because APs can create shares on demand.',
            'Large orders may require working with your broker or the issuer’s capital-markets desk to avoid slippage.',
          ],
          takeaways: [
            'Exchange volume is only one slice of the liquidity puzzle.',
            'Underlying asset liquidity determines how quickly APs can create/redeem shares.',
            'Planning large trades with professionals minimizes impact cost.',
          ],
          ctas: [
            {
              id: 'cta-intermediate-liquidity-watch',
              label: 'Log spreads',
              description: 'Track spreads for three ETFs across different times of day.',
              route: '/(tabs)',
            },
          ],
          aiPrompts: [
            'What signals tell me an ETF has poor real liquidity?',
          ],
        },
        {
          id: 'lesson-bond-etf-metrics',
          title: 'Bond ETF drivers',
          duration: '7 min',
          content: [
            'Duration quantifies rate sensitivity: the higher it is, the more the ETF moves when yields shift.',
            'Yield to maturity estimates long-term return if bonds are held until they roll off, but is not a guarantee.',
            'Differentiate rate risk (duration) from credit risk (issuer quality) to avoid lumping all bonds together as “safe”.',
          ],
          takeaways: [
            'High-duration bond ETFs can be as volatile as equities when rates jump.',
            'Credit exposure (government vs HY corporate) changes drawdown behavior.',
            'Yield figures must be weighed alongside duration to judge reward per unit of risk.',
          ],
          ctas: [
            {
              id: 'cta-intermediate-bond-analytics',
              label: 'Compare bond stats',
              description: 'Use analytics to contrast duration and yield for two bond ETFs.',
              route: '/(tabs)',
            },
          ],
          aiPrompts: [
            'How do I explain rate risk vs credit risk within bond ETFs?',
          ],
        },
        {
          id: 'lesson-core-satellite-simple',
          title: 'Core-satellite in practice',
          duration: '6 min',
          content: [
            'Anchor your account with broad ETFs (global equity, aggregate bonds) that cover most of the allocation.',
            'Add satellites—sector, thematic, or factor ETFs—in small percentages to tilt toward convictions.',
            'Document rules for max satellite size and when to trim them so they never hijack the portfolio.',
          ],
          takeaways: [
            'Core positions deliver beta; satellites express active views.',
            'Writing allocation rules prevents emotion-driven overweights.',
            'Review satellites quarterly to confirm the thesis is alive.',
          ],
          ctas: [
            {
              id: 'cta-intermediate-core-pipeline',
              label: 'Model allocations',
              description: 'Sketch a simple core-satellite mix inside the pipeline simulator.',
              route: '/(tabs)/pipeline',
            },
          ],
          aiPrompts: [
            'Suggest a 70/30 core-satellite structure for a growth investor.',
          ],
        },
        {
          id: 'lesson-currency-hedging',
          title: 'Currency risk & hedging',
          duration: '6 min',
          content: [
            'Unhedged ETFs expose you to both asset performance and FX swings; a stronger foreign currency boosts returns for EUR investors, and vice versa.',
            'Hedged share classes neutralize FX moves through forwards, lowering volatility but adding cost.',
            'Decide whether you want FX exposure based on time horizon, base currency, and the role the ETF plays.',
          ],
          takeaways: [
            'FX can amplify or drag performance depending on currency trends.',
            'Hedging reduces volatility but is not free or perfect.',
            'Treat hedging as a strategic decision, not a default toggle.',
          ],
          ctas: [
            {
              id: 'cta-intermediate-hedge-chat',
              label: 'Debate hedging',
              description: 'Ask the AI when hedged share classes earn their keep.',
              route: '/(tabs)/chat',
              prompt: 'I am an EUR investor considering a USD equity ETF. When should I prefer a hedged class?',
            },
          ],
          aiPrompts: [
            'Create a checklist for deciding between hedged and unhedged ETFs.',
          ],
        },
        {
          id: 'lesson-compare-similar-etfs',
          title: 'Comparing similar ETFs',
          duration: '6 min',
          content: [
            'When two ETFs track similar indices, dig into AUM, replication, domicile, and how “similar” the indices truly are.',
            'Examine liquidity (spreads, volumes) and real performance history, not just launch marketing.',
            'Prefer products with sufficient track record unless you intentionally need a brand-new fund.',
          ],
          takeaways: [
            'Small methodological differences (MSCI vs FTSE) lead to different outcomes.',
            'Operational maturity reduces surprises.',
            'Keep a comparison template to avoid decision fatigue.',
          ],
          ctas: [
            {
              id: 'cta-intermediate-compare-template',
              label: 'Build a comparison sheet',
              description: 'Use analytics exports to fill in AUM, TER, and tracking stats for two ETFs.',
              route: '/(tabs)',
            },
          ],
          aiPrompts: [
            'What questions should I ask when two ETFs claim to track the same exposure?',
          ],
        },
        {
          id: 'lesson-dca-pac',
          title: 'Recurring plans & DCA',
          duration: '5 min',
          content: [
            'Dollar/Euro-Cost Averaging buys more shares when prices are low and fewer when prices are high, smoothing the entry price.',
            'A PAC reduces the urge to time markets and automates discipline, which matters more than perfect timing.',
            'Pair recurring buys with periodic reviews so you can adjust contributions without chasing noise.',
          ],
          takeaways: [
            'DCA is a behavioral tool as much as a mathematical one.',
            'Automation keeps your plan alive during volatile stretches.',
            'Review, don’t micromanage—adjust annually or when goals change.',
          ],
          ctas: [
            {
              id: 'cta-intermediate-dca-pipeline',
              label: 'Simulate a PAC',
              description: 'Use the pipeline to simulate monthly contributions into two ETFs.',
              route: '/(tabs)/pipeline',
            },
          ],
          aiPrompts: [
            'How does DCA change my average entry price during a bear market?',
          ],
        },
        {
          id: 'lesson-factsheet-reading',
          title: 'Reading an ETF factsheet',
          duration: '6 min',
          content: [
            'Start with objective, benchmark, and inception date to confirm the strategy is what you expect.',
            'Dive into geographic/sector weightings, top holdings, and risk metrics to see concentration and volatility.',
            'Check for changes—index switches, fee adjustments, or methodology updates that could alter behavior.',
          ],
          takeaways: [
            'Factsheets are nutrition labels—read them fully.',
            'Concentration metrics reveal hidden bets.',
            'Past changes hint at how the issuer manages the strategy over time.',
          ],
          ctas: [
            {
              id: 'cta-intermediate-factsheet-check',
              label: 'Annotate a factsheet',
              description: 'Download a PDF factsheet and highlight three metrics that matter to you.',
              route: '/(tabs)',
            },
          ],
          aiPrompts: [
            'What red flags should I look for on an ETF factsheet?',
          ],
        },
        {
          id: 'lesson-investor-psychology',
          title: 'Investor psychology & drawdowns',
          duration: '6 min',
          content: [
            'Drawdown measures the distance from peak to trough—seeing it on paper is easier than living through it with real money.',
            'Define your time horizon so you know whether a multi-year slump is survivable within your plan.',
            'Volatility is the toll for long-term returns; panic-selling turns temporary losses into permanent ones.',
          ],
          takeaways: [
            'Expect downturns even with diversified ETFs.',
            'Time horizon and cash needs dictate how you react to drawdowns.',
            'Process beats prediction—follow a rules-based plan when markets fall.',
          ],
          ctas: [
            {
              id: 'cta-intermediate-psychology-chat',
              label: 'Plan for volatility',
              description: 'Ask the assistant to outline coping rules for future downturns.',
              route: '/(tabs)/chat',
              prompt: 'Help me define guardrails so I stay invested during a 30% drawdown.',
            },
          ],
          aiPrompts: [
            'How can I rehearse market crashes so I do not panic-sell ETFs?',
          ],
        },
      ],
      practice: [
        'Create a comparison table for two ETFs tracking the same region but different indices.',
        'Simulate a core-satellite allocation and note the max drawdown tolerance for each sleeve.',
        'Download a factsheet and annotate replication method, top holdings, TER, and tracking stats.',
      ],
    },
  ],
  advanced: [
    {
      id: 'topic-strategy-playbook',
      track: 'strategy',
      title: 'Strategy Playbook',
      summary: 'Go beyond beta with smart-beta factors, thematic rotations, and fixed-income building blocks.',
      lessons: [
        {
          id: 'lesson-factor-tilts',
          title: 'Smart-beta factor tilts',
          duration: '8 min',
          content: [
            'Smart-beta ETFs rebalance toward characteristics like value, momentum, quality, or low volatility. Understand each methodology—some use scorecards, others optimize with constraints.',
            'Evaluate turnover and capacity. Higher turnover raises costs, and factors concentrated in small caps can suffer slippage.',
            'Blend factors to smooth cyclical drawdowns, or time them tactically with macro indicators.',
          ],
          takeaways: [
            'Read the methodology PDF to know exactly how a factor ETF selects and weights holdings.',
            'Turnover and capacity constraints drive whether a factor premium is accessible.',
            'Combining complementary factors reduces boom-bust cycles.',
          ],
          ctas: [
            {
              id: 'cta-factor-analytics',
              label: 'Inspect methodology',
              description: 'Open analytics, choose two factor ETFs, and compare turnover plus volatility.',
              route: '/(tabs)',
            },
            {
              id: 'cta-factor-chat',
              label: 'Discuss timing',
              description: 'Ask the AI which macro regime benefits each factor.',
              route: '/(tabs)/chat',
              prompt: 'When does a momentum ETF outperform a quality ETF? Outline the macro signals.',
            },
          ],
          aiPrompts: [
            'How can I stack quality and low-volatility ETFs without duplicating holdings?',
            'What questions should I ask before funding a new smart-beta ETF?',
          ],
        },
        {
          id: 'lesson-thematic-rotation',
          title: 'Thematic & sector rotation',
          duration: '7 min',
          content: [
            'Themes offer concentrated exposure (AI, clean energy, cybersecurity). They behave like active bets—expect high volatility and binary outcomes.',
            'Define entry and exit rules ahead of time. Consider macro catalysts, valuation metrics, or momentum triggers.',
            'Tie each theme to a thesis memo. Revisit quarterly to confirm the story is intact.',
          ],
          takeaways: [
            'Themes should sit in the satellite bucket with capped allocation.',
            'Exit criteria reduce emotional reactions when volatility spikes.',
            'Written theses keep thematic bets honest over time.',
          ],
          ctas: [
            {
              id: 'cta-theme-pipeline',
              label: 'Scenario test',
              description: 'Use the pipeline to simulate adding a theme for a limited horizon.',
              route: '/(tabs)/pipeline',
            },
          ],
          aiPrompts: [
            'Help me design an exit checklist for a clean energy ETF.',
            'What metrics confirm whether a thematic ETF still follows its original thesis?',
          ],
        },
        {
          id: 'lesson-fixed-income',
          title: 'ETF fixed-income tools',
          duration: '8 min',
          content: [
            'Bond ETFs package hundreds of securities with laddered maturities. Duration, convexity, and yield-to-worst become the core stats to track.',
            'During stress, bond ETF prices may deviate from NAV, acting as price discovery for the underlying market.',
            'Combine rate-hedged, inflation-linked, and short-duration ETFs to fine-tune fixed-income exposure.',
          ],
          takeaways: [
            'Understand duration profile before using a bond ETF to hedge equities.',
            'NAV discounts/premiums in bond ETFs can reveal market stress—don’t panic unless discounts persist.',
            'Mixing duration buckets builds a resilient fixed-income sleeve.',
          ],
          ctas: [
            {
              id: 'cta-fixed-income-analytics',
              label: 'Review duration',
              description: 'In analytics, compare yield and duration of two bond ETFs.',
              route: '/(tabs)',
            },
          ],
          aiPrompts: [
            'Explain how to pair TIPS ETFs with global equity ETFs.',
            'What signals show that a bond ETF is under stress?',
          ],
        },
      ],
      practice: [
        'Write a thesis memo for one thematic ETF and review it monthly.',
        'Pair two factor ETFs with opposite cycles and backtest together.',
        'Measure duration drift quarterly within the analytics dashboard.',
      ],
    },
    {
      id: 'topic-risk-lab',
      track: 'labs',
      title: 'Risk & Hedging Labs',
      summary: 'Apply overlays, hedging tactics, and diligence workflows to institutional-grade ETF usage.',
      lessons: [
        {
          id: 'lesson-currency-hedging',
          title: 'Currency hedging playbook',
          duration: '7 min',
          content: [
            'Currency-hedged share classes neutralize FX swings. They help when your base currency diverges sharply from the ETF’s underlying currency.',
            'Hedging introduces costs: forward contracts roll monthly and may add basis drag. Evaluate whether volatility reduction outweighs the fee.',
            'Mix hedged and unhedged classes to fine-tune exposure across regions.',
          ],
          takeaways: [
            'FX hedging matters most when the currency trend dominates asset returns.',
            'Carry cost from hedges can erode performance when currencies stay stable.',
            'Document why you choose a hedged class so you know when to unwind.',
          ],
          ctas: [
            {
              id: 'cta-hedging-chat',
              label: 'Discuss FX impact',
              description: 'Send a scenario describing your base currency and ETF.',
              route: '/(tabs)/chat',
              prompt: 'I am a EUR investor buying a USD ETF. When does a hedged share class make sense?',
            },
          ],
          aiPrompts: [
            'How can I split allocations between hedged and unhedged share classes?',
            'What is the cost structure of a currency hedge on ETFs?',
          ],
        },
        {
          id: 'lesson-option-overlays',
          title: 'Option overlays & income',
          duration: '8 min',
          content: [
            'Covered-call ETFs write options on equities to harvest premiums. Understand the option schedule, collateral, and distribution policy.',
            'Option overlays change risk: upside caps, path dependency, and tax considerations. Decide whether you want buffered outcomes or extra yield.',
            'Stress test overlays in the pipeline with historical scenarios before adding them to live portfolios.',
          ],
          takeaways: [
            'Income-focused option ETFs sacrifice upside in bull markets.',
            'Distribution schedules can create lumpy cash flows and tax events.',
            'Simulations clarify how overlays behave during selloffs.',
          ],
          ctas: [
            {
              id: 'cta-overlay-pipeline',
              label: 'Backtest overlay',
              description: 'Compare a covered-call ETF with its underlying index inside the pipeline.',
              route: '/(tabs)/pipeline',
            },
          ],
          aiPrompts: [
            'What should I evaluate before buying a covered-call ETF?',
            'How do buffer ETFs differ from simple put-option overlays?',
          ],
        },
        {
          id: 'lesson-due-diligence',
          title: 'Advanced due diligence',
          duration: '9 min',
          content: [
            'Beyond factsheets, read the prospectus and annual reports. Look for securities-lending policies, derivatives usage, and counterparty exposure.',
            'Review issuer stewardship: how do they vote proxies, and what controls exist for conflicts of interest?',
            'Create a repeatable diligence checklist and store it alongside your analytics exports.',
          ],
          takeaways: [
            'Prospectuses reveal leverage, derivatives, and operational risk.',
            'Stewardship policies matter for ESG mandates and governance-sensitive investors.',
            'A written diligence log protects you when compliance or clients ask for evidence.',
          ],
          ctas: [
            {
              id: 'cta-diligence-chat',
              label: 'Draft checklist',
              description: 'Have the assistant propose a diligence checklist template.',
              route: '/(tabs)/chat',
              prompt: 'Create a due-diligence checklist for evaluating leveraged or derivative-heavy ETFs.',
            },
          ],
          aiPrompts: [
            'How do I structure an ETF due-diligence memo for clients?',
            'Which regulatory filings should I archive each year?',
          ],
        },
      ],
      practice: [
        'List ETFs where you would prefer hedged share classes and explain why.',
        'Simulate a covered-call overlay in the pipeline with two strike scenarios.',
        'Build a diligence template and store it with your analytics exports.',
      ],
    },
    {
      id: 'topic-advanced-refine',
      track: 'strategy',
      title: 'Refine & avoid expert traps',
      summary: 'Go beyond basics by dissecting factor ETFs, legal docs, taxes, complex products, and behavioral pitfalls.',
      lessons: [
        {
          id: 'lesson-factor-investing-pro',
          title: 'Factor investing & smart beta',
          duration: '8 min',
          content: [
            'Factor ETFs weight holdings by characteristics such as value, momentum, quality, or low volatility instead of pure market cap.',
            'Each methodology handles rebalancing, turnover, and constraints differently, so know whether the factor is concentrated in small caps or diluted across mega caps.',
            'Higher tracking error relative to broad benchmarks is normal—understand when each factor historically shines or lags so you can stick with it.',
          ],
          takeaways: [
            'Factor ETFs are rule-based active bets, not passive clones.',
            'Turnover, capacity, and constraints affect real-world returns.',
            'Expect long stretches of underperformance and size positions accordingly.',
          ],
          ctas: [
            {
              id: 'cta-advanced-factor-analytics',
              label: 'Audit factor behavior',
              description: 'Compare drawdowns of two smart-beta ETFs inside analytics.',
              route: '/(tabs)',
            },
          ],
          aiPrompts: [
            'When did value and momentum factors last diverge sharply?',
          ],
        },
        {
          id: 'lesson-advanced-index-review',
          title: 'Index methodology deep dive',
          duration: '7 min',
          content: [
            'Reading the methodology tells you how securities enter, exit, and get weighted—details that marketing decks gloss over.',
            'Look for rebalancing frequency, turnover caps, and guardrails that might create unintended bets.',
            'Understand how corporate actions, IPOs, and liquidity screens are handled so you can anticipate behavior during volatile periods.',
          ],
          takeaways: [
            'Methodology documents are the “brain” behind your ETF.',
            'Frequent rebalances increase trading costs inside the fund.',
            'Knowing the rules lets you predict how the ETF adapts to shocks.',
          ],
          ctas: [
            {
              id: 'cta-advanced-methodology-note',
              label: 'Summarize a methodology',
              description: 'Write a one-page memo on your favorite ETF index rules.',
              route: '/(tabs)',
            },
          ],
          aiPrompts: [
            'What questions should I answer after reading an index methodology?',
          ],
        },
        {
          id: 'lesson-legal-docs',
          title: 'Reading KID & prospectus',
          duration: '7 min',
          content: [
            'The KID condenses risk, cost, and scenario data, but the full prospectus outlines leverage limits, derivative usage, and counterparties.',
            'Focus on securities-lending policies, swap collateral rules, and what happens if the index closes or becomes uninvestable.',
            'Review annual or semi-annual reports for operational changes and auditor notes.',
          ],
          takeaways: [
            'Serious allocations deserve a read beyond glossy brochures.',
            'Legal documents reveal hidden leverage or structural quirks.',
            'Document findings so you can defend decisions to clients or compliance.',
          ],
          ctas: [
            {
              id: 'cta-advanced-legal-check',
              label: 'Log legal insights',
              description: 'Create a dedicated diligence note for KID/prospectus takeaways.',
              route: '/(tabs)',
            },
          ],
          aiPrompts: [
            'Which sections of an ETF prospectus highlight counterparty risk?',
          ],
        },
        {
          id: 'lesson-advanced-tax',
          title: 'Tax drag awareness',
          duration: '6 min',
          content: [
            'Real returns depend on after-tax outcomes—dividends, interest, and capital gains are taxed differently across jurisdictions.',
            'Fund domicile plus treaties (e.g., Irish UCITS on US equities) can shave withholding rates by dozens of basis points.',
            'Share-class choice (acc vs dist) influences when taxes are due and whether compounding stays intact.',
          ],
          takeaways: [
            'Your personal tax situation can outweigh TER differences.',
            'Treaties and domicile quietly affect net performance.',
            'Always pair investing decisions with professional tax advice.',
          ],
          ctas: [
            {
              id: 'cta-advanced-tax-chat',
              label: 'Discuss tax scenarios',
              description: 'Ask the AI to outline how taxes impact two ETF structures.',
              route: '/(tabs)/chat',
              prompt: 'Compare potential tax drag between an accumulating Irish UCITS ETF and a distributing US-domiciled ETF for an EU investor.',
            },
          ],
          aiPrompts: [
            'What tax questions should I prepare for my accountant before buying new ETFs?',
          ],
        },
        {
          id: 'lesson-complex-etfs',
          title: 'Complex ETF structures',
          duration: '7 min',
          content: [
            'Leveraged and inverse ETFs reset exposure daily, so compounding creates path-dependent outcomes—great for tactical trades, risky for long holds.',
            'Volatility and commodity ETFs often roll futures, suffering from contango or backwardation as contracts expire.',
            'Treat these products as short-term instruments with explicit exit rules, not as buy-and-hold replacements.',
          ],
          takeaways: [
            'Daily reset products rarely behave like simple multiples over weeks or months.',
            'Futures-based ETFs add roll yield and collateral considerations.',
            'Have a playbook for entry, monitoring, and exit before deploying capital.',
          ],
          ctas: [
            {
              id: 'cta-advanced-complex-pipeline',
              label: 'Stress test leverage',
              description: 'Use pipeline simulations to model a leveraged ETF through volatile periods.',
              route: '/(tabs)/pipeline',
            },
          ],
          aiPrompts: [
            'What risks make leveraged ETFs unsuitable for long-term investors?',
          ],
        },
        {
          id: 'lesson-multi-broker-selection',
          title: 'Choosing listings across brokers',
          duration: '6 min',
          content: [
            'Multiple listings of the same ETF can differ in trading currency, exchange hours, and local liquidity.',
            'Factor in each broker’s commissions, FX conversion fees, and settlement mechanics.',
            'Select venues that align with your cash currency and minimize operational friction.',
          ],
          takeaways: [
            'Identical ISINs can trade differently depending on the venue.',
            'Your brokerage fee schedule may dictate the optimal listing.',
            'Consolidate positions when possible to simplify tracking and taxes.',
          ],
          ctas: [
            {
              id: 'cta-advanced-broker-matrix',
              label: 'Build a venue matrix',
              description: 'Document which exchanges and currencies suit each broker account.',
              route: '/(tabs)',
            },
          ],
          aiPrompts: [
            'How do I decide between buying an ETF on Xetra vs LSE?',
          ],
        },
        {
          id: 'lesson-advanced-risk-hedge',
          title: 'Advanced risk management',
          duration: '7 min',
          content: [
            'Combine defensive ETFs (long-duration govies, gold, minimum-vol) to cushion drawdowns instead of panic selling core holdings.',
            'Partial hedges—reducing equity weight or adding inverse ETFs temporarily—should follow predefined triggers.',
            'Document how hedges enter and exit the portfolio so they do not morph into speculative bets.',
          ],
          takeaways: [
            'Hedges should complement, not replace, a thoughtful asset mix.',
            'Rule-based triggers prevent hedges from becoming emotional trades.',
            'Position sizing is critical so hedges don’t overwhelm the portfolio.',
          ],
          ctas: [
            {
              id: 'cta-advanced-hedge-plan',
              label: 'Draft a hedge plan',
              description: 'Outline trigger levels for adding/removing defensive ETFs.',
              route: '/(tabs)',
            },
          ],
          aiPrompts: [
            'Help me design rules for deploying a defensive ETF sleeve during crises.',
          ],
        },
        {
          id: 'lesson-backtest-limits',
          title: 'Backtesting without fooling yourself',
          duration: '6 min',
          content: [
            'Backtests suffer from survivorship bias (dead ETFs disappear) and data-mining (cherry-picking the best combination).',
            'Include realistic assumptions: slippage, TER, taxes, and the emotional challenge of living through historical drawdowns.',
            'Use backtests to understand orders of magnitude, not to find a “perfect” allocation.',
          ],
          takeaways: [
            'Historical perfection rarely survives contact with the real future.',
            'Document every assumption so collaborators can critique the test.',
            'Treat simulations as decision-support, not decision-replacement.',
          ],
          ctas: [
            {
              id: 'cta-advanced-backtest-pipeline',
              label: 'Annotate simulations',
              description: 'Add notes to each pipeline run to capture assumptions and caveats.',
              route: '/(tabs)/pipeline',
            },
          ],
          aiPrompts: [
            'What biases should I watch for when backtesting ETF portfolios?',
          ],
        },
        {
          id: 'lesson-multi-asset-integration',
          title: 'ETFs inside real portfolios',
          duration: '6 min',
          content: [
            'Map your entire balance sheet—cash, deposits, pensions, real estate—so ETF allocations complement rather than duplicate risk.',
            'Consider correlations between your career, business ownership, or property exposure and the ETFs you hold.',
            'Treat ETFs as the flexible sleeve that can dial risk up or down while other assets remain illiquid.',
          ],
          takeaways: [
            'Portfolio design happens at the household level, not just the brokerage account.',
            'Real-world commitments might already give you exposure to certain sectors/countries.',
            'ETFs are the adjustable lever; everything else sets the baseline risk tolerance.',
          ],
          ctas: [
            {
              id: 'cta-advanced-balance-sheet',
              label: 'Draft a household map',
              description: 'List every asset/liability and note how ETFs complement them.',
              route: '/(tabs)',
            },
          ],
          aiPrompts: [
            'How can I account for my real-estate exposure when sizing ETF allocations?',
          ],
        },
        {
          id: 'lesson-advanced-mistakes',
          title: 'Avoid advanced-investor mistakes',
          duration: '6 min',
          content: [
            'Overtrading erodes returns through costs and taxes—define thresholds before making allocation tweaks.',
            'Overconfidence and overfitting lure you into complex strategies with little incremental benefit.',
            'Reset to simplicity when in doubt: robust core allocations beat constant tinkering.',
          ],
          takeaways: [
            'Being more informed does not immunize you against behavioral traps.',
            'Process discipline is the best antidote to overconfidence.',
            'Regularly audit your trades to ensure each had a clear, documented rationale.',
          ],
          ctas: [
            {
              id: 'cta-advanced-mistake-audit',
              label: 'Schedule retrospectives',
              description: 'Set a quarterly reminder to review trades and note lessons learned.',
              route: '/(tabs)',
            },
          ],
          aiPrompts: [
            'Create a checklist that stops me from overtrading my ETF portfolio.',
          ],
        },
      ],
      practice: [
        'Summarize the methodology and risk controls of your favorite factor ETF.',
        'Build a venue-and-broker matrix to decide where each ETF should be traded.',
        'Write a brief post-mortem on your last three allocation changes to spot patterns.',
      ],
    },
  ],
};

type LessonLookupResult = {
  lesson: LearningLesson;
  level: LearningLevelId;
  topicId: string;
  topicTitle: string;
  track: LearningTrackId;
};

const LESSON_LOOKUP: Record<string, LessonLookupResult> = {};

(Object.entries(LEARNING_PATHS) as [LearningLevelId, LearningTopic[]]).forEach(([level, topics]) => {
  if (level !== 'beginner') {
    return;
  }
  topics.forEach((topic) => {
    topic.lessons.forEach((lesson) => {
      LESSON_LOOKUP[lesson.id] = {
        lesson,
        level,
        topicId: topic.id,
        topicTitle: topic.title,
        track: topic.track,
      };
    });
  });
});

export const LESSON_LEVEL_LOOKUP: Record<string, LearningLevelId> = Object.fromEntries(
  Object.entries(LESSON_LOOKUP).map(([lessonId, lookup]) => [lessonId, lookup.level])
) as Record<string, LearningLevelId>;

export const TOTAL_LESSONS_PER_LEVEL: Record<LearningLevelId, number> = (Object.entries(LEARNING_PATHS) as [
  LearningLevelId,
  LearningTopic[],
]).reduce((acc, [level, topics]) => {
  acc[level] = topics.reduce((count, topic) => count + topic.lessons.length, 0);
  return acc;
}, {} as Record<LearningLevelId, number>);

export function findLessonById(lessonId: string): LessonLookupResult | undefined {
  return LESSON_LOOKUP[lessonId];
}
