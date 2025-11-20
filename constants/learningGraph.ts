export type LearningGraphNode = {
  lessonId: string;
  title: string;
  summary: string;
  duration: string;
  side?: 'left' | 'right';
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
    id: 'stage-etf-basics',
    lessonId: 'lesson-etf-structure',
    title: 'What is an ETF',
    summary: 'How an ETF is built, why it tracks an index, and how it differs from a mutual fund.',
    duration: '6 min',
    branches: [
      {
        lessonId: 'lesson-etf-vs-mutual-funds',
        title: 'ETF vs active funds',
        summary: 'When to prefer each, considering cost, flexibility, and transparency.',
        duration: '6 min',
        side: 'left',
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
