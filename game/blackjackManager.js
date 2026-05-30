
function createDeck() {
  const suits = ['♥️', '♦️', '♣️', '♠️'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck = [];

  for (const suit of suits) {
    for (const value of values) {
      deck.push({ value, suit });
    }
  }

  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function calculateScore(hand) {
  let score = 0;
  let aces = 0;

  for (const card of hand) {
    if (card.value === 'A') {
      aces += 1;
      score += 11;
    } else if (['J', 'Q', 'K'].includes(card.value)) {
      score += 10;
    } else {
      score += parseInt(card.value);
    }
  }

  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }

  return score;
}

function renderHand(hand, hideFirst = false) {
  return hand.map((card, index) => {
    if (hideFirst && index === 0) return '🎴';
    return `${card.value}${card.suit}`;
  }).join(' ');
}

module.exports = {
  createDeck,
  calculateScore,
  renderHand
};
