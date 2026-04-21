// Coin reward calculation based on ball (score) ranges
function calculateCoins(marks_obtained, total_marks) {
  if (!marks_obtained || !total_marks || total_marks <= 0) {
    return 0;
  }

  // Calculate percentage/ball score
  const percentage = (marks_obtained / total_marks) * 100;
  const ball = Math.round(percentage);

  // Coin reward table based on the provided image
  const coinTable = {
    100: 20,
    95: 15,
    90: 10,
    85: 8,
    80: 5,
    75: 3,
    70: 1,
    65: 0,
    60: -5,
    55: -10,
    50: -15,
    // 45 va undan past: -20
  };

  // Find the closest ball score that is less than or equal to the current ball
  const ballScores = Object.keys(coinTable)
    .map(Number)
    .sort((a, b) => b - a);

  for (const score of ballScores) {
    if (ball >= score) {
      return coinTable[score];
    }
  }

  // If below 45 (va undan past)
  return -20;
}

module.exports = { calculateCoins };
