export const TOOLTIP_COPY = {
  learn: {
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
      title: 'Swipe Lessons',
      description:
        'Browse curated micro-lessons about ETF basics, risk, and fees. Swipe horizontally to move between topics.',
    },
    tipCard: {
      title: 'Next Steps',
      description:
        'Use what you learned to research a few ETFs, save them, and ask the assistant how they differ or work together.',
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
