export type LearningGraphBranchLesson = {
  lessonId: string;
  title: string;
  summary: string;
  duration: string;
};

export type LearningGraphNode = LearningGraphBranchLesson & {
  side?: 'left' | 'right';
  nodes?: LearningGraphBranchLesson[];
};

export type LearningGraphStage = {
  id: string;
  lessonId: string;
  title: string;
  summary: string;
  duration: string;
  branches?: LearningGraphNode[];
};

export const LEARNING_GRAPH: LearningGraphStage[] = [
  {
    id: 'stage-start-here',
    lessonId: 'lesson-start-here',
    title: 'START HERE!',
    summary: 'Fast kickoff before the ETF path.',
    duration: '5 min',
    branches: [
      {
        lessonId: 'lesson-pre-etf-basics',
        title: 'Before ETFs — What are stocks, companies and markets?',
        summary: 'Stocks, shares, markets, and diversification in plain language.',
        duration: '7 min',
        side: 'left',
      },
    ],
  },
  {
    id: 'stage-etf-basics',
    lessonId: 'lesson-etf-structure',
    title: 'Lesson 1: What Is an ETF? (The Friendliest Introduction Ever)',
    summary: 'A welcoming, plain-language intro to ETFs, why they exist, and how they fit your plan.',
    duration: '6 min',
    branches: [
      {
        lessonId: 'lesson-etf-vs-mutual-funds',
        title: 'ETF vs active funds',
        summary: 'When to prefer each, considering cost, flexibility, and transparency.',
        duration: '6 min',
        side: 'left',
        nodes: [
          {
            lessonId: 'lesson-etf-vs-mutual-funds',
            title: 'ETF vs active funds',
            summary: 'When to prefer each, considering cost, flexibility, and transparency.',
            duration: '6 min',
          },
          {
            lessonId: 'lesson-etf-fee-layers',
            title: 'Fee layers (placeholder)',
            summary: 'Dummy lesson to stretch the side branch with another dot.',
            duration: '4 min',
          },
          {
            lessonId: 'lesson-etf-liquidity-buckets',
            title: 'Liquidity buckets (placeholder)',
            summary: 'Dummy lesson to visualize a third dot; replace or remove later.',
            duration: '4 min',
          },
        ],
      },
      {
        lessonId: 'lesson-etf-types',
        title: 'ETF types',
        summary: 'Physical, synthetic, factor, thematic: what changes in practice.',
        duration: '6 min',
        side: 'right',
      },
    ],
  },
  {
    id: 'stage-portfolio-fit',
    lessonId: 'lesson-portfolio-compose',
    title: 'How to compose the right Portfolio for You',
    summary: 'Match your horizon, risk tolerance, and asset mix with simple rules of thumb.',
    duration: '8 min',
  },
  {
    id: 'stage-first-etf',
    lessonId: 'lesson-first-etf',
    title: 'Lesson 3: Buying Your First ETF (A Beginner-Proof Guide)',
    summary: 'From broker choice to order type: calm, step-by-step first purchase.',
    duration: '9 min',
  },
  {
    id: 'stage-market-mechanics',
    lessonId: 'lesson-etf-trading',
    title: 'Market mechanics',
    summary: 'Orders, spread, and liquidity: when and how to trade without surprises.',
    duration: '5 min',
    branches: [
      {
        lessonId: 'lesson-nav-vs-price',
        title: 'NAV vs price',
        summary: 'Why price moves around NAV and how to read premium/discount.',
        duration: '5 min',
        side: 'left',
      },
      {
        lessonId: 'lesson-base-costs',
        title: 'Real costs',
        summary: 'Beyond TER: slippage, spreads, and daily trading friction.',
        duration: '5 min',
        side: 'right',
      },
    ],
  },
  {
    id: 'stage-index-link',
    lessonId: 'lesson-understanding-indices',
    title: 'Index & replication',
    summary: 'Read the benchmark, understand replication, and check goal alignment.',
    duration: '6 min',
    branches: [
      {
        lessonId: 'lesson-ucits-domicile-currency',
        title: 'Domicile, currency, UCITS',
        summary: 'Trading currency, exposure currency, and regulatory protection.',
        duration: '6 min',
        side: 'right',
      },
    ],
  },
  {
    id: 'stage-costs',
    lessonId: 'lesson-etf-costs',
    title: 'Costs & taxes basics',
    summary: 'TER, tracking difference, and baseline taxation over time.',
    duration: '5 min',
    branches: [
      {
        lessonId: 'lesson-acc-vs-dist',
        title: 'Acc vs Dist',
        summary: 'When to choose accumulating or distributing based on cash flow.',
        duration: '5 min',
        side: 'left',
      },
    ],
  },
  {
    id: 'stage-risk',
    lessonId: 'lesson-risk-return-basics',
    title: 'Risk and return',
    summary: 'Volatility, drawdown, and horizon: how much risk fits your plan.',
    duration: '6 min',
    branches: [
      {
        lessonId: 'lesson-diversification-basics',
        title: 'Real diversification',
        summary: 'Build regional and sector mixes to lower surprises.',
        duration: '6 min',
        side: 'right',
      },
    ],
  },
  {
    id: 'stage-tooling',
    lessonId: 'lesson-analytics-tour',
    title: 'Read real data',
    summary: 'Use the app to check metrics, volatility, and history.',
    duration: '7 min',
    branches: [
      {
        lessonId: 'lesson-watchlist',
        title: 'Guided watchlist',
        summary: 'Save aligned ETFs and monitor updates.',
        duration: '4 min',
        side: 'left',
      },
      {
        lessonId: 'lesson-chat-workflow',
        title: 'Ask the AI',
        summary: 'Turn questions into prompts: comparisons, checklists, quick explanations.',
        duration: '6 min',
        side: 'right',
      },
    ],
  },
  {
    id: 'stage-first-investment',
    lessonId: 'lesson-minimums-pac',
    title: 'Make your first investment',
    summary: 'Set a recurring plan, define contributions, and execute the strategy.',
    duration: '5 min',
  },
];
