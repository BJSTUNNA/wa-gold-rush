let cash = 100;
let round = 1;

function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

function playRound() {

    if (round > 10) {
        alert("Game Over!");
        return;
    }

    const investment = Number(
        document.getElementById("investment").value
    );

    const digType =
        document.getElementById("dig").value;

    if (investment <= 0) {
        alert("Enter a valid investment amount.");
        return;
    }

    if (investment > cash) {
        alert("You do not have enough cash.");
        return;
    }

    const die1 = rollDice();
    const die2 = rollDice();
    const total = die1 + die2;

    let profit = 0;
    let message = "";

    // Display dice immediately
    document.getElementById("dice").innerHTML =
        `🎲 Dice 1: <strong>${die1}</strong><br>
         🎲 Dice 2: <strong>${die2}</strong><br>
         ➕ Total: <strong>${total}</strong>`;

    // Safe Dig
    if (digType === "safe") {

        profit = investment * 0.10;
        cash += profit;

        message =
            `✅ Safe Dig Successful<br>
             Investment: $${investment.toFixed(2)}<br>
             Profit: $${profit.toFixed(2)}`;

    }

    // Medium Dig
    else if (digType === "medium") {

        if (total >= 7 && total <= 10) {

            profit = investment * 0.50;
            cash += profit;

            message =
                `✅ Medium Dig Successful<br>
                 Investment: $${investment.toFixed(2)}<br>
                 Profit: $${profit.toFixed(2)}`;

        } else {

            cash -= investment;

            message =
                `❌ Medium Dig Failed<br>
                 Lost: $${investment.toFixed(2)}`;
        }
    }

    // Deep Vein Dig
    else if (digType === "deep") {

        if (total === 11 || total === 12) {

            profit = investment * 3;

            cash += profit;

            message =
                `💰 Deep Vein Dig Successful!<br>
                 Investment: $${investment.toFixed(2)}<br>
                 Profit: $${profit.toFixed(2)}`;

        } else {

            cash -= investment;

            message =
                `❌ Deep Vein Dig Failed<br>
                 Lost: $${investment.toFixed(2)}`;
        }
    }

    document.getElementById("result").innerHTML =
        message;

    document.getElementById("cash").innerText =
        cash.toFixed(2);

    round++;

    document.getElementById("round").innerText =
        Math.min(round, 10);

    if (round > 10) {

        document.getElementById("result").innerHTML +=
            `<br><br>
             <strong>🏁 GAME OVER</strong><br>
             Final Cash: $${cash.toFixed(2)}`;
    }
}
