/**
 * Coin Calculator - Converts student scores to coins
 * 
 * Score to Coin Mapping:
 * 100: +20, 95: +15, 90: +10, 85: +8, 80: +5
 * 75: +3, 70: +1, 65: 0, 60: -5, 55: -10
 * 50: -15, 45 and below: -20
 */

const COIN_SCORE_MAPPING = [
  { score: 100, coins: 20 },
  { score: 95, coins: 15 },
  { score: 90, coins: 10 },
  { score: 85, coins: 8 },
  { score: 80, coins: 5 },
  { score: 75, coins: 3 },
  { score: 70, coins: 1 },
  { score: 65, coins: 0 },
  { score: 60, coins: -5 },
  { score: 55, coins: -10 },
  { score: 50, coins: -15 },
  { score: 45, coins: -20 },
  { score: 0, coins: -20 }, // 45 and below
];

/**
 * Calculate coins based on percentage score
 * Uses linear interpolation between defined score points
 * 
 * @param percentage - The score percentage (0-100)
 * @returns The number of coins to award/deduct
 */
const calculateCoinsFromPercentage = (percentage: number): number => {
  // Clamp percentage between 0 and 100
  const score = Math.min(100, Math.max(0, percentage));

  // Find the two points to interpolate between
  let lower = COIN_SCORE_MAPPING[COIN_SCORE_MAPPING.length - 1];
  let upper = COIN_SCORE_MAPPING[0];

  for (let i = 0; i < COIN_SCORE_MAPPING.length - 1; i++) {
    if (score >= COIN_SCORE_MAPPING[i + 1].score && score <= COIN_SCORE_MAPPING[i].score) {
      upper = COIN_SCORE_MAPPING[i];
      lower = COIN_SCORE_MAPPING[i + 1];
      break;
    }
  }

  // If score is below 45, return -20
  if (score < 45) {
    return -20;
  }

  // If exact match found, return that value
  for (const mapping of COIN_SCORE_MAPPING) {
    if (score === mapping.score) {
      return mapping.coins;
    }
  }

  // Linear interpolation between two points
  const scoreDiff = upper.score - lower.score;
  if (scoreDiff === 0) {
    return upper.coins;
  }

  const coinDiff = upper.coins - lower.coins;
  const ratio = (score - lower.score) / scoreDiff;
  return Math.round(lower.coins + ratio * coinDiff);
};

/**
 * Calculate coins based on marks obtained
 * 
 * @param marksObtained - Marks the student received
 * @param totalMarks - Total marks available
 * @returns The number of coins to award/deduct
 */
const calculateCoins = (marksObtained: number, totalMarks: number = 100): number => {
  if (totalMarks <= 0) return 0;
  
  const percentage = (marksObtained / totalMarks) * 100;
  return calculateCoinsFromPercentage(percentage);
};

module.exports = {
  COIN_SCORE_MAPPING,
  calculateCoinsFromPercentage,
  calculateCoins,
};

export {};
