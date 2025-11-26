import React, { useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, CheckCircle, Circle, BookOpenCheck, MessageSquare, Compass, GitMerge, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/components/common/ThemeProvider';
import { findLessonById, TRACK_LABELS, type LessonCTA } from '@/constants/learningPaths';
import { useLearnProgress } from '@/components/Learn/LearnProgressProvider';

const CTA_ICON_MAP: Record<string, typeof Compass> = {
  '/(tabs)': Compass,
  '/(tabs)/chat': MessageSquare,
  '/(tabs)/pipeline': GitMerge,
};

function getCtaIcon(route: string) {
  return CTA_ICON_MAP[route] ?? Sparkles;
}

const START_HERE_LESSON_ID = 'lesson-start-here';
const ETF_INTRO_LESSON_ID = 'lesson-etf-structure';
const PRE_ETF_LESSON_ID = 'lesson-pre-etf-basics';
const PORTFOLIO_COMPOSE_LESSON_ID = 'lesson-portfolio-compose';
const FIRST_ETF_LESSON_ID = 'lesson-first-etf';

type StartHereScreen = {
  id: string;
  label: string;
  title: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
  highlight?: string;
  footnote?: string;
};

const START_HERE_SCREENS: StartHereScreen[] = [
  {
    id: 'hero',
    label: 'Screen 1 • Hero',
    title: 'Investing in ETFs, without the BS.',
    subtitle: 'Learn just enough to start. Invest like you actually mean it.',
    body: 'No banks, no hidden tricks, no “trust us bro” funds. Just a clear path to place your first sensible order.',
    bullets: [
      'Pick ETFs by category, geography, and sector.',
      'See past performance and compare ETFs with clear metrics.',
      'Build and backtest portfolios with lump sums + monthly contributions.',
      'Learn the bare minimum you need—dive deeper only if you want.',
    ],
  },
  {
    id: 'bank-trust',
    label: 'Screen 2',
    title: 'Banks love your money. Sometimes a bit too much.',
    body: 'Handing cash to flashy products often means fees, jargon, and misaligned incentives.',
    bullets: [
      '❌ High TERs and hidden commissions.',
      '❌ Complex products you barely understand.',
      '❌ A shiny brochure, not better results.',
      'We sell one thing: access to the app. No product pushing.',
    ],
    highlight: 'We want you to learn, invest, and keep more of your own returns.',
  },
  {
    id: 'managed-fees',
    label: 'Screen 3',
    title: 'Managed portfolios: comfy, but not free.',
    body: 'Platforms that “invest for you” (e.g., norminvest in DK, Moneyfarm in IT) bundle ETFs, but take a yearly cut.',
    bullets: [
      'They charge TERs/fees on your whole pot—fair for the service, but it stacks over time.',
      'Great convenience, zero homework… and a steady slice of your returns.',
      'Over long periods, that slice can add up to a big bite (even ~half your gains).',
    ],
    highlight: 'Comfort is a feature. Cost is the trade-off. Know what you pay. 🧾💸',
  },
  {
    id: 'not-everything',
    label: 'Screen 4',
    title: 'You don’t need to know everything to start.',
    body: 'Skip the “I must be a finance guru” mindset.',
    bullets: [
      'Know what an ETF is.',
      'Know why diversification matters.',
      'Know how to place a basic order.',
      'Lazy mode: learn the minimum and invest sensibly. Curious mode: dive deeper anytime.',
    ],
    footnote: 'Start now. Upgrade your knowledge later.',
  },
  {
    id: 'fomo',
    label: 'Screen 5',
    title: 'Not investing is also a decision. Often the worst one.',
    body: 'Time in the market beats hunting for perfection.',
    bullets: [
      'A simple global ETF or balanced fund has been hard to beat long term.',
      'Perfection is optional; starting is essential.',
      'Cash on the sidelines for 20 years is rarely the winning move.',
    ],
    highlight: 'Starting today—even imperfectly—beats waiting for “the perfect moment.”',
  },
  {
    id: 'why-etfs',
    label: 'Screen 6',
    title: 'Think you can beat the market? Statistically, probably not.',
    body: 'Most pros lag simple index funds over long periods. Why gamble?',
    bullets: [
      'Low costs.',
      'High diversification.',
      'Market returns without casino vibes.',
    ],
    highlight: 'Stop trying to be a genius. Start trying to be consistent.',
  },
  {
    id: 'real-progress',
    label: 'Screen 7',
    title: 'Not a game. Not a lifetime course.',
    body: 'No confetti for tapping—just enough learning to act and improve.',
    bullets: [
      'Make your first real investment.',
      'Get actionable education, not infinite lessons.',
      'Experiment, backtest, and iterate.',
    ],
    footnote: 'Less dopamine. More actual money working for you.',
  },
  {
    id: 'calm',
    label: 'Screen 8',
    title: 'Simple, calm, and drama-free.',
    body: 'Invest without doomscrolling or hot takes.',
    bullets: [
      'Clear ETF categories.',
      'Minimal, well-explained metrics.',
      'Clean charts and no “BREAKING NEWS” banners.',
    ],
    highlight: 'Get started. Your future self will thank you.',
  },
];

const ETF_INTRO_SCREENS: StartHereScreen[] = [
  {
    id: 'etf-hero',
    label: 'Sublesson 1',
    title: 'Lesson 1: What Is an ETF? (The Friendliest Introduction Ever)',
    subtitle: '🟦 Imagine a Fruit Basket…',
    body: 'One stock = one fruit. An ETF = a basket of many fruits. If one fruit spoils, the basket still holds.',
    bullets: [
      '🍏 A single stock = one fruit',
      '🧺 An ETF = a basket holding many different stocks (or bonds)',
      'Buy and sell it on an exchange just like a stock.',
    ],
  },
  {
    id: 'etf-why-exist',
    label: 'Sublesson 2',
    title: 'Why Do ETFs Exist?',
    bullets: [
      '✔ Easier: no need to pick winners one by one.',
      '✔ Safer: diversification spreads risk.',
      '✔ Cheaper: low fees, often track an index.',
      '✔ Accessible: buy one share and own pieces of hundreds of companies.',
    ],
  },
  {
    id: 'etf-fit',
    label: 'Sublesson 3',
    title: 'How ETFs Fit Into Finance',
    bullets: [
      'Investing: grow wealth over time.',
      'Markets: trade all day on exchanges.',
      'Risk management: many holdings reduce single-name risk.',
      'Long-term planning: used in retirement, savings, robo-advisors, and pro portfolios.',
    ],
  },
  {
    id: 'etf-types',
    label: 'Sublesson 4',
    title: 'Different Types of ETFs (Simple Overview)',
    bullets: [
      '🟦 Stock ETFs: broad markets or sectors.',
      '🟩 Bond ETFs: government or corporate bonds.',
      '🟧 Commodity ETFs: gold, oil, or agri goods.',
      '🟪 Index ETFs: S&P 500, NASDAQ 100, Dow Jones.',
      '🟨 Thematic: clean energy, robotics, cybersecurity, dividends.',
    ],
    footnote: 'The app can unpack each flavor when you need it.',
  },
  {
    id: 'etf-money',
    label: 'Sublesson 5',
    title: 'How Do You Make Money With ETFs?',
    bullets: [
      '💹 Price growth: assets in the basket rise over time.',
      '💸 Dividends: payouts from holdings flow through to you.',
    ],
  },
  {
    id: 'etf-beginners',
    label: 'Sublesson 6',
    title: 'Why ETFs Are Popular for Beginners',
    bullets: [
      'No need to guess the winning stock.',
      'Low maintenance and low fees.',
      'Start with small amounts.',
      'Lower single-stock risk.',
      'Aligns with long-term goals (5+ years).',
      'Great for investing apps, retirement, and set-and-forget portfolios.',
    ],
  },
  {
    id: 'etf-terms',
    label: 'Sublesson 7',
    title: 'Key Terms (Made Simple)',
    bullets: [
      'Index: a list of companies (e.g., S&P 500).',
      'Portfolio: your collection of investments.',
      'Diversification: avoid all eggs in one basket.',
      'Expense ratio: small yearly fee, often <0.20%.',
      'Passive investing: buy and hold; most ETFs do this.',
    ],
    highlight: 'You don’t need to be a guru—just understand the basket.',
  },
];

const PRE_ETF_SCREENS: StartHereScreen[] = [
  {
    id: 'pre-why',
    label: 'Part 1',
    title: 'Lesson 0: Before ETFs — What Are Stocks, Companies, and Markets?',
    subtitle: 'What to know before ETFs. No jargon, just basics.',
    bullets: [
      'Companies make products or services; some “go public” to raise money.',
      'Going public slices the company into shares investors can buy.',
      'Stocks are the collection of those shares; you own a tiny part.',
    ],
  },
  {
    id: 'pre-public',
    label: 'Part 2',
    title: 'What Does “Going Public” Mean?',
    body: 'Think of slicing a pizza: each slice = one share. Owning a share = owning a tiny piece of the company.',
  },
  {
    id: 'pre-stock',
    label: 'Part 3',
    title: 'What Is a Stock?',
    bullets: [
      'Buy 1 share of Apple = own a tiny piece of Apple.',
      'If the company does well, shares usually become more valuable.',
      'Stock = ownership concept; share = individual unit.',
    ],
  },
  {
    id: 'pre-why-stocks',
    label: 'Part 4',
    title: 'Why Do People Buy Stocks?',
    bullets: [
      'Price increases when a company performs well.',
      'Dividends share profits with shareholders.',
      'Long-term growth: stocks tend to rise over long horizons.',
    ],
  },
  {
    id: 'pre-market',
    label: 'Part 5',
    title: 'What Is the Stock Market?',
    body: 'A digital marketplace where buyers and sellers meet (NYSE, NASDAQ). Buy via broker/app/retirement account.',
    bullets: [
      'Prices move up and down as trades happen.',
      'Same mechanics as any market: buyers, sellers, changing prices.',
    ],
  },
  {
    id: 'pre-hard',
    label: 'Part 6',
    title: 'Why Stocks Alone Can Be Hard',
    bullets: [
      'Picking winners is hard.',
      'Risk is high with only a few stocks.',
      'Takes time: research, earnings, news.',
    ],
    highlight: 'Beginners often feel overwhelmed by single-stock picking.',
  },
  {
    id: 'pre-diversify',
    label: 'Part 7',
    title: 'The Key Idea: Diversification',
    body: 'Most important term before ETFs: don’t put all your money in one investment.',
    bullets: [
      '1 fruit = risky. A basket of 50 fruits = safer.',
      'ETFs = instant diversification.',
    ],
    highlight: 'Diversification is why ETFs exist.',
  },
  {
    id: 'pre-terms',
    label: 'Part 8',
    title: 'Other Terms You Need Before Lesson 1',
    bullets: [
      'Asset: something that can grow in value.',
      'Portfolio: your collection of assets.',
      'Risk: chance it goes down. Return: money you make.',
      'Index: list representing the market (e.g., S&P 500).',
      'Broker: platform to trade; Exchange: where trades happen.',
    ],
    footnote: 'Summary: shares slice companies; markets connect trades; diversification reduces risk; ETFs build on this.',
  },
];

const PORTFOLIO_SCREENS: StartHereScreen[] = [
  {
    id: 'portfolio-hero',
    label: 'Section 1',
    title: 'How to compose the right Portfolio for You',
    subtitle: 'It’s not “the best ETF.” It’s the right mix for your time horizon, nerves, and goals.',
    bullets: [
      '⏳ Horizon: how long the money stays invested.',
      '🎢 Risk & volatility: how much drawdown you can stomach.',
      '🧩 Asset types: equity, bonds, commodities, gold.',
      '🧬 Sectors: tech, staples, etc.',
      '🌍 Geography: global, US, Europe, emerging.',
      '✅ Rules of thumb to keep it simple.',
    ],
  },
  {
    id: 'portfolio-horizon',
    label: 'Section 2',
    title: '⏳ Investment Horizon',
    bullets: [
      '0–3y (short-term): protect capital; mostly bonds/cash, minimal equities.',
      '3–10y (medium): mix equities + bonds; maybe small gold/commodities.',
      '10y+ (long): equities as main engine; bonds/gold optional for smoother ride.',
      'If you need the money soon, prioritize stability over maximum growth.',
    ],
  },
  {
    id: 'portfolio-risk',
    label: 'Section 3',
    title: '🎢 Risk & Volatility',
    body: 'How much can you emotionally handle if markets drop?',
    bullets: [
      'More equities → higher potential return + higher swings.',
      'More bonds/cash → calmer ride, lower long-term return.',
      'Gold can help in some crises, but not a magic hedge.',
      'Ask: “If my portfolio dropped -30% in a year, what would I do?”',
    ],
  },
  {
    id: 'portfolio-assets',
    label: 'Section 4',
    title: '🧩 Asset Types',
    bullets: [
      '🟦 Equities: ownership, growth engine, volatile.',
      '🟩 Bonds: loans, more stable, pay coupons, lower return.',
      '🟧 Commodities: raw materials; complex/volatile; optional.',
      '🟨 Gold: sometimes holds value in crises; no cash flow; optional hedge.',
    ],
  },
  {
    id: 'portfolio-sectors',
    label: 'Section 5',
    title: '🧬 Sectors',
    bullets: [
      'Tech: high growth, high volatility.',
      'Staples: essentials, usually steadier.',
      'Discretionary: economy-sensitive.',
      'Healthcare: resilient across cycles.',
      'Financials: interest-rate sensitive.',
      'Energy: cyclical, commodity-linked.',
      'Broad market ETFs already include many sectors; sector ETFs are focused tilts.',
    ],
    footnote: 'Use sector tilts only if you intentionally want extra exposure.',
  },
  {
    id: 'portfolio-geo',
    label: 'Section 6',
    title: '🌍 Geography',
    bullets: [
      'Global/all-world: strong base layer; diversified across regions.',
      'USA: large, innovation-heavy; already a big chunk of global indices.',
      'Europe: broad regional exposure; more traditional sector mix.',
      'Emerging: higher growth potential + higher risk/volatility.',
    ],
  },
  {
    id: 'portfolio-rules',
    label: 'Section 7',
    title: '✅ Simple Rules of Thumb',
    bullets: [
      'By horizon: 0–3y mostly bonds/cash; 3–10y mix; 10y+ equity-led with optional bonds/gold.',
      'By risk tolerance: risk-averse = more bonds + bit of global equity; balanced = global equity + bonds; risk-tolerant = high global equity + optional tilts.',
      'Simplicity: 1 global equity ETF + 1 bond ETF can be plenty; add tilts only if intentional.',
    ],
  },
  {
    id: 'portfolio-big-idea',
    label: 'Section 8',
    title: 'The Big Idea: Start Simple, Adjust Later',
    body: 'You won’t pick the “perfect” combo. What matters: match horizon, match risk tolerance, keep costs low, stay invested.',
    bullets: [
      'Stay invested through ups and downs.',
      'Adjust only when your horizon or stomach changes.',
      'Use the app to test mixes and keep it calm.',
    ],
  },
];

const FIRST_ETF_SCREENS: StartHereScreen[] = [
  {
    id: 'first-etf-journey',
    label: 'Part 1',
    title: 'Buying Your First ETF (Beginner-Proof)',
    subtitle: 'Three big steps: pick a broker, pick an ETF, place the order.',
    bullets: [
      'Choose a broker (the app/platform).',
      'Choose an ETF (what you want to own).',
      'Place your order (how you buy).',
    ],
  },
  {
    id: 'first-etf-broker',
    label: 'Part 2',
    title: 'Choosing a Broker',
    bullets: [
      'Low/zero fees; simple app.',
      'Good ETF lineup: index + UCITS + big providers.',
      'Fractional shares (nice to have).',
      'Safety: regulated; assets in your name.',
    ],
  },
  {
    id: 'first-etf-pick',
    label: 'Part 3',
    title: 'Choosing Your First ETF',
    bullets: [
      'What it tracks: S&P 500, world, emerging, etc.',
      'Beginners often pick a broad, diversified index ETF.',
      'Check provider and availability in your region.',
    ],
  },
  {
    id: 'first-etf-ter',
    label: 'Part 4',
    title: 'TER (Total Expense Ratio)',
    body: 'Yearly fee taken inside the fund; you don’t pay manually.',
    bullets: [
      '0.07% ≈ $0.70 per $1,000 per year.',
      'Lower is usually better for index ETFs.',
    ],
  },
  {
    id: 'first-etf-divs',
    label: 'Part 5',
    title: 'Accumulating vs Distributing',
    bullets: [
      'ACC: reinvests dividends automatically (growth; common for beginners).',
      'DIST: pays out cash (income).',
    ],
  },
  {
    id: 'first-etf-ucits',
    label: 'Part 6',
    title: 'UCITS (for Europe/regions)',
    bullets: [
      'European standard for investor protection.',
      'Regulated, transparent, diversified.',
      'Look for “UCITS” on the fund if it applies to you.',
    ],
  },
  {
    id: 'first-etf-orders',
    label: 'Part 7',
    title: 'Technical Terms, Made Calm',
    bullets: [
      'Market order: buy now at current price.',
      'Limit order: buy at price X; optional for beginners.',
      'GTC: limit stays active until filled/canceled.',
      'Stop-loss: mostly not needed for long-term ETF investing.',
    ],
  },
  {
    id: 'first-etf-steps',
    label: 'Part 8',
    title: 'How to Actually Buy',
    bullets: [
      'Open broker, deposit.',
      'Search name/ticker (e.g., “Vanguard FTSE All-World”, “VWCE”).',
      'Press buy; market order is fine for first purchase.',
      'Confirm → you now own a slice of many companies.',
    ],
  },
  {
    id: 'first-etf-timing',
    label: 'Part 9',
    title: 'What If I Buy at the Wrong Time?',
    bullets: [
      'No one knows the perfect moment.',
      'For ETFs, long-term > perfect timing.',
      'Regular investing smooths bumps (monthly, paycheck).',
    ],
  },
  {
    id: 'first-etf-fears',
    label: 'Part 10',
    title: 'Common Fears (and Reassurance)',
    bullets: [
      'Global ETF doesn’t go to zero unless the world ends.',
      'Order mishaps are usually small (price wiggles).',
      'Assets stay yours even if the app crashes.',
    ],
  },
  {
    id: 'first-etf-after',
    label: 'Part 11',
    title: 'After You Buy',
    bullets: [
      'Don’t stare at price daily.',
      'Set a regular schedule to invest.',
      'Keep learning; consistency beats complexity.',
    ],
  },
];

function LessonCarousel({ colors, slides }: { colors: ReturnType<typeof useTheme>['colors']; slides: StartHereScreen[] }) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.max(320, width - 40);

  return (
    <View style={styles.startCarouselWrap}>
      <ScrollView
        horizontal
        pagingEnabled
        decelerationRate="fast"
        snapToInterval={cardWidth + 16}
        snapToAlignment="start"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {slides.map((screen, idx) => (
          <View
            key={screen.id}
            style={[
              styles.startCard,
              {
                width: cardWidth,
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
          >
            <LinearGradient
              colors={[colors.accent, colors.accent, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.startGlow}
            />
            <View style={styles.startBadge}>
              <Text style={[styles.startBadgeText, { color: colors.text }]}>{screen.label}</Text>
              <Text style={[styles.startBadgeSub, { color: colors.secondaryText }]}>
                {idx + 1}/{START_HERE_SCREENS.length}
              </Text>
            </View>
            <View style={{ gap: 10 }}>
              <Text style={[styles.startTitle, { color: colors.text }]}>{screen.title}</Text>
              {screen.subtitle && <Text style={[styles.startSubtitle, { color: colors.secondaryText }]}>{screen.subtitle}</Text>}
              {screen.body && <Text style={[styles.startBody, { color: colors.secondaryText }]}>{screen.body}</Text>}
            </View>
            {screen.bullets && (
              <View style={styles.startBulletList}>
                {screen.bullets.map((bullet) => (
                  <View key={bullet} style={styles.startBulletRow}>
                    <View style={[styles.startBulletDot, { backgroundColor: colors.accent }]} />
                    <Text style={[styles.startBulletText, { color: colors.text }]}>{bullet}</Text>
                  </View>
                ))}
              </View>
            )}
            {screen.highlight && <Text style={[styles.startHighlight, { color: colors.accent }]}>{screen.highlight}</Text>}
            {screen.footnote && <Text style={[styles.startFootnote, { color: colors.secondaryText }]}>{screen.footnote}</Text>}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export default function LessonDetailScreen() {
  const params = useLocalSearchParams<{ lessonId?: string }>();
  const lessonId = typeof params.lessonId === 'string' ? params.lessonId : '';
  const lookup = findLessonById(lessonId);
  const { colors } = useTheme();
  const router = useRouter();
  const { isLessonCompleted, markLessonComplete, markLessonIncomplete } = useLearnProgress();
  const completed = lessonId ? isLessonCompleted(lessonId) : false;
  const isStartHere = lessonId === START_HERE_LESSON_ID;

  const trackLabel = lookup ? TRACK_LABELS[lookup.track] : undefined;

  const handleToggleCompletion = () => {
    if (!lessonId) return;
    if (completed) {
      markLessonIncomplete(lessonId);
    } else {
      markLessonComplete(lessonId);
    }
  };

  const handleCTA = (cta: LessonCTA) => {
    if (!cta.route) return;
    if (cta.route === '/(tabs)/chat' && cta.prompt) {
      router.push({
        pathname: cta.route,
        params: { presetPrompt: cta.prompt },
      });
      return;
    }
    router.push(cta.route);
  };

  const aiPromptButtons = useMemo(() => {
    if (!lookup) return null;
    return lookup.lesson.aiPrompts.map((prompt) => (
      <TouchableOpacity
        key={prompt}
        style={[styles.aiPromptChip, { borderColor: colors.border, backgroundColor: colors.card }]}
        onPress={() =>
          router.push({
            pathname: '/(tabs)/chat',
            params: { presetPrompt: prompt },
          })
        }
      >
        <MessageSquare size={14} color={colors.accent} />
        <Text style={[styles.aiPromptText, { color: colors.text }]}>{prompt}</Text>
      </TouchableOpacity>
    ));
  }, [colors.accent, colors.border, colors.card, colors.text, lookup, router]);

  if (!lookup) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.fallbackContainer}>
          <Text style={[styles.fallbackTitle, { color: colors.text }]}>Lesson not found</Text>
          <TouchableOpacity style={[styles.backButton, { borderColor: colors.border }]} onPress={() => router.back()}>
            <Text style={[styles.backText, { color: colors.text }]}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const CompletionIcon = completed ? CheckCircle : Circle;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity style={[styles.backPill, { borderColor: colors.border }]} onPress={() => router.back()}>
            <ChevronLeft size={18} color={colors.text} />
            <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.heroCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View style={styles.heroIcon}>
            <BookOpenCheck size={24} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.trackLabel, { color: colors.secondaryText }]}>{trackLabel}</Text>
            <Text style={[styles.lessonTitle, { color: colors.text }]}>{lookup.lesson.title}</Text>
            <Text style={[styles.lessonMeta, { color: colors.secondaryText }]}>{lookup.lesson.duration}</Text>
          </View>
          <TouchableOpacity
            onPress={handleToggleCompletion}
            style={[styles.completePill, { borderColor: colors.border, backgroundColor: colors.background }]}
          >
            <CompletionIcon size={18} color={completed ? colors.accent : colors.secondaryText} />
            <Text style={[styles.completeText, { color: completed ? colors.accent : colors.text }]}>
              {completed ? 'Completed' : 'Mark complete'}
            </Text>
          </TouchableOpacity>
        </View>

        {(() => {
          if (isStartHere) {
            return <LessonCarousel colors={colors} slides={START_HERE_SCREENS} />;
          }
          if (lessonId === PRE_ETF_LESSON_ID) {
            return <LessonCarousel colors={colors} slides={PRE_ETF_SCREENS} />;
          }
          if (lessonId === ETF_INTRO_LESSON_ID) {
            return <LessonCarousel colors={colors} slides={ETF_INTRO_SCREENS} />;
          }
          if (lessonId === PORTFOLIO_COMPOSE_LESSON_ID) {
            return <LessonCarousel colors={colors} slides={PORTFOLIO_SCREENS} />;
          }
          if (lessonId === FIRST_ETF_LESSON_ID) {
            return <LessonCarousel colors={colors} slides={FIRST_ETF_SCREENS} />;
          }
          return null;
        })()}

        <View style={[styles.sectionCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>What you will learn</Text>
          {lookup.lesson.content.map((paragraph) => (
            <Text key={paragraph} style={[styles.paragraph, { color: colors.secondaryText }]}>
              {paragraph}
            </Text>
          ))}
        </View>

        <View style={[styles.sectionCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Key takeaways</Text>
          {lookup.lesson.takeaways.map((item) => (
            <View key={item} style={styles.takeawayRow}>
              <View style={[styles.bullet, { backgroundColor: colors.accent }]} />
              <Text style={[styles.takeawayText, { color: colors.secondaryText }]}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.sectionCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Put it in practice</Text>
          {lookup.lesson.ctas.map((cta) => {
            const Icon = getCtaIcon(cta.route);
            return (
              <TouchableOpacity key={cta.id} style={[styles.ctaRow, { borderColor: colors.border }]} onPress={() => handleCTA(cta)}>
                <View style={[styles.ctaIconWrap, { backgroundColor: colors.background }]}>
                  <Icon size={16} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ctaLabel, { color: colors.text }]}>{cta.label}</Text>
                  {cta.description && <Text style={[styles.ctaDescription, { color: colors.secondaryText }]}>{cta.description}</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {lookup.lesson.aiPrompts.length > 0 && (
          <View style={[styles.sectionCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Ask the assistant</Text>
            <View style={styles.aiPromptGrid}>{aiPromptButtons}</View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    rowGap: 16,
  },
  topBar: {
    paddingTop: 8,
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backText: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    columnGap: 12,
    alignItems: 'center',
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(37,99,235,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  lessonTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 4,
  },
  lessonMeta: {
    fontSize: 13,
    fontWeight: '600',
  },
  completePill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: 4,
  },
  completeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    rowGap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
  },
  takeawayRow: {
    flexDirection: 'row',
    columnGap: 10,
    alignItems: 'flex-start',
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 6,
  },
  takeawayText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  ctaRow: {
    flexDirection: 'row',
    columnGap: 12,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
  },
  ctaIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  ctaDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  aiPromptGrid: {
    rowGap: 10,
  },
  aiPromptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  aiPromptText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  startCarouselWrap: {
    marginTop: 12,
    marginBottom: 12,
  },
  startCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    marginRight: 16,
    overflow: 'hidden',
    gap: 14,
  },
  startGlow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0.18,
  },
  startBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  startBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  startBadgeSub: {
    fontSize: 12,
    fontWeight: '600',
  },
  startTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  startSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  startBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  startBulletList: {
    gap: 10,
  },
  startBulletRow: {
    flexDirection: 'row',
    columnGap: 10,
    alignItems: 'flex-start',
  },
  startBulletDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 6,
  },
  startBulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  startHighlight: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  startFootnote: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  fallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: 16,
    paddingHorizontal: 24,
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
