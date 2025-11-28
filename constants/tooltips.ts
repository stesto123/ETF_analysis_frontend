export const TOOLTIP_COPY = {
  learn: {
    heroProgress: {
      title: 'Track progress',
      description: 'Each level shows how many lessons you have completed so you always know what is next.',
    },
    levelTabs: {
      title: 'Choose difficulty',
      description: 'Follow the beginner path. The modules below update automatically as you complete lessons.',
    },
    exploreAnalytics: {
      title: 'Explore Analytics',
      description:
        'Jump to dashboards that track performance, volatility, and composition so you can study ETFs in detail.',
    },
    askAI: {
      title: 'Ask the AI',
      description:
        'Open the assistant chat to ask follow-up questions, compare funds, or clarify lesson topics in plain language.',
    },
    miniLessons: {
      title: 'Warm-up cards',
      description:
        'Browse curated micro-lessons about ETF basics, risk, and fees. Swipe horizontally to refresh the fundamentals.',
    },
    topicSections: {
      title: 'Topic modules',
      description:
        'Each card bundles lessons, takeaways, and checklists for a specific theme. Tap a lesson to open the detailed view.',
    },
    practiceMissions: {
      title: 'Practice missions',
      description:
        'Actionable tasks bring the content to life—open analytics, test a scenario in the pipeline, or ask the AI for guidance.',
    },
    lessonDetail: {
      title: 'Lesson detail',
      description:
        'Mark lessons complete, revisit the explanations, and launch contextual CTAs or AI prompts from a single screen.',
    },
  },
  analytics: {
    areaFilter: {
      title: 'Geography Filter',
      description:
        'Tap a chip to focus on ETFs from that region. Choose “All” to see the full universe again.',
    },
    bulkSelect: {
      title: 'Select All ETFs',
      description:
        'Adds every ETF in the current list to your comparison. Tap again to clear the selection.',
    },
    metricPicker: {
      title: 'Choose metrics',
      description:
        'Toggle which snapshot metrics appear under each ETF row: returns, volatility, drawdown, ratios.',
    },
    queryForm: {
      title: 'Fetch Data',
      description:
        'Pick dates and metrics, then run the query to pull price history for the ETFs you selected.',
    },
    performanceChart: {
      title: 'Performance Chart',
      description:
        'Visualizes how each selected ETF has moved over your chosen time window.',
    },
  },
  pipeline: {
    compositionSection: {
      title: 'Portfolio Composition',
      description:
        'Review the ETF mix and weights saved for each portfolio before you make changes.',
    },
    createSection: {
      title: 'Create Portfolio',
      description:
        'Name a new portfolio and assign tickers with weights that add up to 100%.',
    },
    runSection: {
      title: 'Run Simulation',
      description:
        'Launch a backtest using the selected strategy, amount, and date range.',
    },
    chartSection: {
      title: 'Portfolio Chart',
      description:
        'Plot total value over time for the portfolios you toggle on above.',
    },
    saveComposition: {
      title: 'Save Composition',
      description:
        'Writes the current rows to the backend and refreshes the portfolio list.',
    },
    deletePortfolio: {
      title: 'Swipe to Delete',
      description:
        'Swipe left on a portfolio row to remove it. This also clears its stored composition.',
    },
    strategyPicker: {
      title: 'Strategy',
      description:
        'Choose the simulation playbook. Strategies define how contributions and rebalancing are applied.',
    },
  },
} as const;

export type TooltipSection = keyof typeof TOOLTIP_COPY;
export type TooltipKey<Section extends TooltipSection> = keyof (typeof TOOLTIP_COPY)[Section];
