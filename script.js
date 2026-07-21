// ===== CONSTANTS =====
const MAX_ROUNDS = 10;
const DICE_SIDES = 6;
const INITIAL_CASH = 100;
const ANIMATION_DURATION = 1000; // milliseconds

const DIG_TYPES = {
    safe: {
        name: 'Safe Dig',
        multiplier: 0.10,
        minTotal: 0,
        maxTotal: Infinity,
        icon: '✅'
    },
    medium: {
        name: 'Medium Dig',
        multiplier: 0.50,
        minTotal: 7,
        maxTotal: 10,
        icon: '⚠️'
    },
    deep: {
        name: 'Deep Vein Dig',
        multiplier: 3,
        minTotal: 11,
        maxTotal: 12,
        icon: '💰'
    }
};

// ===== GAME STATE =====
const gameState = {
    cash: INITIAL_CASH,
    round: 1,
    gameOver: false
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    const playBtn = document.getElementById('playButton');
    const resetBtn = document.getElementById('resetButton');

    if (!playBtn) console.warn('playButton not found in DOM');
    else playBtn.addEventListener('click', playRound);

    if (!resetBtn) console.warn('resetButton not found in DOM');
    else resetBtn.addEventListener('click', resetGame);

    updateUI();
});

// ===== UTILITY FUNCTIONS =====
function rollDice() {
    return Math.floor(Math.random() * DICE_SIDES) + 1;
}

function updateUI() {
    const cashEl = document.getElementById('cash');
    const roundEl = document.getElementById('round');
    if (cashEl) cashEl.innerText = gameState.cash.toFixed(2);
    if (roundEl) roundEl.innerText = Math.min(gameState.round, MAX_ROUNDS);
}

function getInvestmentAmount() {
    const input = document.getElementById('investment');
    const amount = input ? Number(input.value) : NaN;

    if (isNaN(amount)) {
        throw new Error('Invalid investment amount.');
    }

    if (amount <= 0) {
        throw new Error('Enter a valid investment amount greater than 0.');
    }

    if (amount > gameState.cash) {
        throw new Error('You do not have enough cash.');
    }

    return amount;
}

function getSelectedDigType() {
    const sel = document.getElementById('dig');
    return sel ? sel.value : 'safe';
}

function calculateOutcome(digType, total, investment) {
    const dig = DIG_TYPES[digType];

    if (!dig) {
        throw new Error('Invalid dig type.');
    }

    const success = total >= dig.minTotal && total <= dig.maxTotal;
    const profit = success ? investment * dig.multiplier : -investment;

    return { profit, success };
}

function generateResultMessage(digType, investment, profit, success) {
    const dig = DIG_TYPES[digType];
    const icon = success ? dig.icon : '❌';

    if (success) {
        return `${icon} ${dig.name} Successful<br>
                Investment: $${investment.toFixed(2)}<br>
                Profit: +$${profit.toFixed(2)}`;
    } else {
        return `${icon} ${dig.name} Failed<br>
                Investment: $${investment.toFixed(2)}<br>
                Lost: $${Math.abs(profit).toFixed(2)}`;
    }
}

function animateDiceRoll() {
    const diceEl = document.getElementById('dice');
    if (!diceEl) return;

    diceEl.classList.add('rolling');

    // Generate random numbers during animation
    const interval = setInterval(() => {
        const die1 = rollDice();
        const die2 = rollDice();
        const total = die1 + die2;
        diceEl.innerHTML =
            `🎲 Dice 1: <strong>${die1}</strong><br>
             🎲 Dice 2: <strong>${die2}</strong><br>
             ➕ Total: <strong>${total}</strong>`;
    }, 100);

    // Stop animation after duration
    setTimeout(() => {
        clearInterval(interval);
        diceEl.classList.remove('rolling');
    }, ANIMATION_DURATION);
}

function displayDiceRoll(die1, die2, total) {
    const diceEl = document.getElementById('dice');
    if (diceEl) {
        diceEl.innerHTML =
            `🎲 Dice 1: <strong>${die1}</strong><br>
             🎲 Dice 2: <strong>${die2}</strong><br>
             ➕ Total: <strong>${total}</strong>`;
    }
}

function displayGameOver() {
    const resultEl = document.getElementById('result');
    if (resultEl) {
        resultEl.innerHTML +=
            `<br><br>
             <strong>🏁 GAME OVER</strong><br>
             Final Cash: $${gameState.cash.toFixed(2)}`;
    }
    gameState.gameOver = true;
    const playBtn = document.getElementById('playButton');
    if (playBtn) playBtn.disabled = true;
}

// Reset the game to initial state
function resetGame() {
    if (!confirm("Are you sure you want to restart the game?")) {
        return;
    }

    gameState.cash = INITIAL_CASH;
    gameState.round = 1;
    gameState.gameOver = false;

    const investmentEl = document.getElementById('investment');
    const digEl = document.getElementById('dig');
    const playBtn = document.getElementById('playButton');

    if (investmentEl) investmentEl.value = '10';
    if (digEl) digEl.value = 'safe';
    if (playBtn) playBtn.disabled = false;

    updateUI();

    const diceEl = document.getElementById('dice');
    const resultEl = document.getElementById('result');
    if (diceEl) diceEl.innerHTML = '-';
    if (resultEl) resultEl.innerHTML = 'Start mining!';
}

// ===== MAIN GAME LOGIC =====
async function playRound() {
    try {
        if (gameState.round > MAX_ROUNDS || gameState.gameOver) {
            alert('Game Over! Click "Restart Game" to play again.');
            return;
        }

        const investment = getInvestmentAmount();
        const digType = getSelectedDigType();

        // Start dice animation
        animateDiceRoll();

        // Roll the actual dice
        const die1 = rollDice();
        const die2 = rollDice();
        const total = die1 + die2;

        // Wait for animation to complete
        await new Promise(resolve => setTimeout(resolve, ANIMATION_DURATION));

        // Display final dice roll
        displayDiceRoll(die1, die2, total);

        const { profit, success } = calculateOutcome(digType, total, investment);

        gameState.cash += profit;

        const message = generateResultMessage(digType, investment, profit, success);
        const resultEl = document.getElementById('result');
        if (resultEl) resultEl.innerHTML = message;

        updateUI();
        gameState.round++;

        if (gameState.round > MAX_ROUNDS) {
            displayGameOver();
        }

    } catch (error) {
        alert(error.message);
    }
}
