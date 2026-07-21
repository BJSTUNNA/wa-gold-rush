// ===== CONSTANTS =====
const MAX_ROUNDS = 10;
const DICE_SIDES = 6;
const INITIAL_CASH = 100;

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
    document.getElementById('playButton').addEventListener('click', playRound);
    document.getElementById('resetButton').addEventListener('click', resetGame);
    updateUI();
});

// ===== UTILITY FUNCTIONS =====

/**
 * Roll a single dice
 * @returns {number} Random number between 1 and 6
 */
function rollDice() {
    return Math.floor(Math.random() * DICE_SIDES) + 1;
}

/**
 * Update the UI with current game state
 */
function updateUI() {
    document.getElementById('cash').innerText = gameState.cash.toFixed(2);
    document.getElementById('round').innerText = Math.min(gameState.round, MAX_ROUNDS);
}

/**
 * Get and validate investment amount from input
 * @throws {Error} If investment is invalid or insufficient funds
 * @returns {number} Valid investment amount
 */
function getInvestmentAmount() {
    const input = document.getElementById('investment');
    const amount = Number(input.value);

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

/**
 * Get selected dig type from dropdown
 * @returns {string} The dig type value
 */
function getSelectedDigType() {
    return document.getElementById('dig').value;
}

/**
 * Calculate profit and success based on dig type and dice total
 * @param {string} digType - Type of dig (safe, medium, deep)
 * @param {number} total - Sum of two dice rolls
 * @param {number} investment - Amount invested
 * @returns {Object} { profit: number, success: boolean }
 */
function calculateOutcome(digType, total, investment) {
    const dig = DIG_TYPES[digType];

    if (!dig) {
        throw new Error('Invalid dig type.');
    }

    const success = total >= dig.minTotal && total <= dig.maxTotal;
    const profit = success ? investment * dig.multiplier : -investment;

    return { profit, success };
}

/**
 * Generate result message
 * @param {string} digType - Type of dig
 * @param {number} investment - Investment amount
 * @param {number} profit - Profit or loss amount
 * @param {boolean} success - Whether dig was successful
 * @returns {string} HTML message
 */
function generateResultMessage(digType, investment, profit, success) {
    const dig = DIG_TYPES[digType];
    const profitText = success ? `+$${profit.toFixed(2)}` : `-$${Math.abs(profit).toFixed(2)}`;
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

/**
 * Display dice roll results
 * @param {number} die1 - First dice value
 * @param {number} die2 - Second dice value
 * @param {number} total - Sum of dice
 */
function displayDiceRoll(die1, die2, total) {
    document.getElementById('dice').innerHTML =
        `🎲 Dice 1: <strong>${die1}</strong><br>
         🎲 Dice 2: <strong>${die2}</strong><br>
         ➕ Total: <strong>${total}</strong>`;
}

/**
 * Display game over message
 */
function displayGameOver() {
    document.getElementById('result').innerHTML +=
        `<br><br>
         <strong>🏁 GAME OVER</strong><br>
         Final Cash: $${gameState.cash.toFixed(2)}`;
    gameState.gameOver = true;
    document.getElementById('playButton').disabled = true;
}

/**
 * Reset the game to initial state
 */
function resetGame() {
    gameState.cash = INITIAL_CASH;
    gameState.round = 1;
    gameState.gameOver = false;

    document.getElementById('investment').value = '10';
    document.getElementById('dig').value = 'safe';
    document.getElementById('playButton').disabled = false;
    updateUI();

    document.getElementById('dice').innerHTML = '-';
    document.getElementById('result').innerHTML = 'Start mining!';
}

// ===== MAIN GAME LOGIC =====

/**
 * Play a single round of the game
 */
function playRound() {
    try {
        // Check if game is already over
        if (gameState.round > MAX_ROUNDS) {
            alert('Game Over! Click "Reset Game" to play again.');
            return;
        }

        // Validate input
        const investment = getInvestmentAmount();
        const digType = getSelectedDigType();

        // Roll dice
        const die1 = rollDice();
        const die2 = rollDice();
        const total = die1 + die2;

        // Display dice
        displayDiceRoll(die1, die2, total);

        // Calculate outcome
        const { profit, success } = calculateOutcome(digType, total, investment);

        // Update cash
        gameState.cash += profit;

        // Display result
        const message = generateResultMessage(digType, investment, profit, success);
        document.getElementById('result').innerHTML = message;

        // Update UI
        updateUI();
        gameState.round++;

        // Check if game is over
        if (gameState.round > MAX_ROUNDS) {
            displayGameOver();
        }

    } catch (error) {
        alert(error.message);
    }
}
