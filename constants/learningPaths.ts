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
  {
    id: 'intermediate',
    label: 'Intermediate',
    description: 'Turn knowledge into a portfolio you can monitor.',
    longDescription: 'Focus on allocation, factor exposure, and due diligence workflows.',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    description: 'Explore strategies, overlays, and cross-asset ETFs.',
    longDescription: 'Learn about rotations, hedging, smart-beta factors, and scenario testing.',
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
