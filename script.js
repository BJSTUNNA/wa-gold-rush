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

    // SAFE DIG
    if (digType === "safe") {

        profit = investment * 0.10;

        cash += profit;

        message =
            `Safe Dig successful!\nProfit: $${profit.toFixed(2)}`;
    }

    // MEDIUM DIG
    else if (digType === "medium") {

        if (total >= 7 && total <= 10) {

            profit = investment * 0.50;

            cash += profit;

            message =
                `Medium Dig successful!\nProfit: $${profit.toFixed(2)}`;

        } else {

            cash -= investment;

            message =
                `Medium Dig failed!\nLost: $${investment.toFixed(2)}`;
        }
    }

    // DEEP VEIN DIG
    else if (digType === "deep") {

        if (total === 11 || total === 12) {

            profit = investment * 3;

            cash += profit;

            message =
                `Deep Vein Dig successful!\nProfit: $${profit.toFixed(2)}`;

        } else {

            cash -= investment;

            message =
                `Deep Vein Dig failed!\nLost: $${investment.toFixed(2)}`;
        }
    }

    document.getElementById("dice").innerText =
        `${die1} + ${die2} = ${total}`;

    document.getElementById("result").innerText =
        message;

    document.getElementById("cash").innerText =
        cash.toFixed(2);

    round++;

    document.getElementById("round").innerText =
        Math.min(round, 10);

    if (round > 10) {

        document.getElementById("result").innerHTML +=
            `<br><br><strong>GAME OVER!</strong><br>
            Final Cash: $${cash.toFixed(2)}`;
    }
}
