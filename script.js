let cash = 100;
let round = 1;

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

    if (investment > cash) {
        alert("Not enough cash.");
        return;
    }

    const d1 =
        Math.floor(Math.random() * 6) + 1;

    const d2 =
        Math.floor(Math.random() * 6) + 1;

    const total = d1 + d2;

    let message = "";

    if (digType === "safe") {

        const profit = investment * 0.10;

        cash += profit;

        message =
            `Safe Dig successful. Profit $${profit.toFixed(2)}`;

    }

    else if (digType === "medium") {

        if (total >= 7 && total <= 10) {

            const profit = investment * 0.50;

            cash += profit;

            message =
                `Medium Dig successful. Profit $${profit.toFixed(2)}`;

        }
        else {

            cash -= investment;

            message =
                `Medium Dig failed. Lost $${investment.toFixed(2)}`;
        }
    }

    else if (digType === "deep") {

        if (total === 11 || total === 12) {

            const profit = investment * 3;

            cash += profit;

            message =
                `Deep Vein successful. Profit $${profit.toFixed(2)}`;

        }
        else {

            cash -= investment;

            message =
                `Deep Vein failed. Lost $${investment.toFixed(2)}`;
        }
    }

    document.getElementById("dice").innerHTML =
        `${d1} + ${d2} = ${total}`;

    document.getElementById("result").innerHTML =
        message;

    document.getElementById("cash").innerHTML =
        cash.toFixed(2);

    round++;

    document.getElementById("round").innerHTML =
        Math.min(round, 10);

    if (round > 10) {

        document.getElementById("result").innerHTML +=
            `<br><br><strong>Game Over!</strong>
             <br>Final Cash: $${cash.toFixed(2)}`;
    }
}
