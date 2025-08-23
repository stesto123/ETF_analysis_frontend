// Palette condivisa di 50 colori vividi ad alto contrasto per line charts.
// Ordinata ruotando lo spettro e alternando saturazioni/luminosità per maggiore distinguibilità.
// Nota: Evitati accostamenti troppo simili consecutivi e colori con contrasto basso su sfondo bianco.

export const LINE_COLORS: string[] = [
  '#007AFF', // vivid blue
  '#FF3B30', // vivid red
  '#34C759', // vivid green
  '#FF9500', // vivid orange
  '#AF52DE', // vivid purple
  '#5856D6', // indigo
  '#FF2D55', // pink/red
  '#32ADE6', // cyan
  '#FFD60A', // yellow
  '#BF5AF2', // magenta
  '#0FB5AE', // teal
  '#FF6B1A', // strong orange
  '#27C4FF', // sky blue
  '#7ED321', // lime
  '#FF375F', // raspberry
  '#8E8EFF', // soft indigo
  '#00C7BE', // aqua green
  '#FFB300', // amber
  '#D100D1', // electric purple
  '#00B100', // strong green
  '#FF4F00', // safety orange
  '#0096FF', // azure
  '#FF2079', // neon pink
  '#6E00FF', // electric violet
  '#00B8D9', // caribbean blue
  '#FF5E3A', // sunset orange
  '#13C100', // vivid mid green
  '#FFB800', // warm amber
  '#A900FF', // vivid purple 2
  '#00A29A', // jade
  '#FF3366', // strong pink
  '#3366FF', // royal blue
  '#33CC33', // standard green
  '#FF6633', // orange coral
  '#9966FF', // lavender purple
  '#33CCCC', // turquoise
  '#FF3399', // hot pink
  '#6633FF', // deep violet
  '#33CC99', // mint green
  '#FF9933', // orange gold
  '#CC33FF', // purple rose
  '#33FFCC', // aqua mint
  '#FF3333', // bright red
  '#33A1FF', // light azure
  '#FF33CC', // bright magenta
  '#33FF57', // neon green
  '#FF8C00', // dark orange
  '#1E90FF', // dodger blue
  '#FF1493', // deep pink
  '#00CED1', // dark turquoise
];

/** Restituisce un colore in base all'indice. Se oltre la lunghezza, cicla. */
export function getLineColor(index: number): string {
  if (!Number.isFinite(index) || index < 0) return LINE_COLORS[0];
  return LINE_COLORS[index % LINE_COLORS.length];
}

/** Genera un colore HSL di fallback (poco usato; solo se vuoi espandere oltre la palette) */
export function generateFallbackHsl(index: number): string {
  const hue = (index * 47) % 360; // passo primo-ish per ridurre collisioni
  return `hsl(${hue} 85% 50%)`;
}
