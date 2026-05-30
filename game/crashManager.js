
function getCrashPoint() {
    const r = Math.random() * 100;
    
    // 10% chance of instant crash at 1.0x (House edge)
    if (r < 10) return 1.0;
    
    // Standard Crash Formula: 99 / (100 - P)
    // This creates a distribution where:
    // ~50% chance to hit 2x
    // ~10% chance to hit 10x
    // ~1% chance to hit 100x
    const P = Math.random() * 100;
    let crash = 99 / (100 - P);
    
    // Keep it within a reasonable range for this bot
    if (crash < 1) crash = 1.0;
    
    return parseFloat(crash.toFixed(2));
}

function playAviator(bet, targetMultiplier) {
    const crashPoint = getCrashPoint();
    const won = crashPoint >= targetMultiplier;
    
    return {
        won,
        crashPoint,
        payout: won ? Math.floor(bet * targetMultiplier) : 0
    };
}

module.exports = {
    playAviator
};
