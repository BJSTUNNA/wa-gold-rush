/**
 * Level 2: Mining Tycoon - Main Game Logic
 * Levels 2–5 progression condensed into one playable mode.
 */

const CLASS_RECORDS_KEY = 'wa_gold_rush_class_records';
const PAUSE_STATE_KEY = 'wa_gold_rush_pause_state';
const PLAYER_KEY_STORAGE = 'wa_gold_rush_player_key';

let gameState = null;
let currentMineForInvestment = null;
let pendingPurchase = null;

document.addEventListener('DOMContentLoaded', async function() {
    gameState = new GameState();
    const configLoaded = await gameState.loadConfig('../../shared/game-config.json');
    if (!configLoaded) {
        alert('Failed to load game configuration. Please refresh the page.');
        return;
    }

    gameState.loadFromLocalStorage();
    ensureInvestmentPlansForOwnedMines();
    hydrateIdentityInputs();
    setupEventListeners();
    updatePauseStateFromStorage();
    updateAllUI();
    syncPlayerRecord();
});

function setupEventListeners() {
    document.getElementById('rollButton').addEventListener('click', playRound);
    document.getElementById('saveButton').addEventListener('click', saveGame);
    document.getElementById('loadButton').addEventListener('click', loadGame);
    document.getElementById('resetButton').addEventListener('click', resetGame);
    document.getElementById('saveMinePlanButton').addEventListener('click', saveMinePlan);
    document.getElementById('saveIdentityButton').addEventListener('click', saveIdentity);

    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    document.getElementById('confirmPurchase').addEventListener('click', confirmPurchase);
    document.getElementById('cancelPurchase').addEventListener('click', closeAllModals);

    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            closeAllModals();
        }
    });

    window.addEventListener('storage', function(event) {
        if (event.key === PAUSE_STATE_KEY) {
            updatePauseStateFromStorage();
        }
    });
}

function ensureInvestmentPlansForOwnedMines() {
    gameState.getOwnedMines().forEach(mine => {
        if (!gameState.investmentPlans[mine.id]) {
            gameState.investmentPlans[mine.id] = { safe: 0, medium: 0, deep: 0 };
        }
    });
}

function renderMines() {
    const container = document.getElementById('mines-container');
    const ownedMines = gameState.getOwnedMines();
    container.innerHTML = '';

    ownedMines.forEach(mine => {
        const card = document.createElement('div');
        card.className = 'mine-card owned';
        const upgrades = mine.upgrades.length > 0 ? `✨ ${mine.upgrades.length} upgrade(s)` : '';
        const planned = gameState.investmentPlans[mine.id] || {};
        const plannedTotal = Object.values(planned).reduce((sum, value) => sum + (Number(value) || 0), 0);

        card.innerHTML = `
            <div class="mine-card-icon">${mine.icon}</div>
            <div class="mine-card-title">${mine.name}</div>
            <div class="mine-card-info">Max: $${mine.maxInvestmentPerRound}/round</div>
            <div class="mine-card-info">Value: $${mine.baseValue}</div>
            <div class="mine-card-info">Planned this round: $${plannedTotal}</div>
            ${upgrades ? `<div class="mine-card-upgrades">${upgrades}</div>` : ''}
            <div class="mine-card-status status-owned">✓ Owned</div>
        `;
        card.addEventListener('click', () => openMineModal(mine));
        container.appendChild(card);
    });
}

function renderMineShop() {
    const shop = document.getElementById('mine-shop');
    const availableMines = gameState.getAvailableMinesForPurchase();
    shop.innerHTML = '';

    if (availableMines.length === 0) {
        shop.innerHTML = '<p class="empty-state">All currently unlocked mines are owned.</p>';
        return;
    }

    availableMines.forEach(mine => {
        const canAfford = gameState.cash >= mine.cost;
        const item = document.createElement('div');
        item.className = `shop-item ${!canAfford ? 'unavailable' : ''}`;
        item.innerHTML = `
            <div class="shop-icon">${mine.icon}</div>
            <div class="shop-name">${mine.name}</div>
            <div class="shop-cost">$${mine.cost}</div>
            <div style="font-size:11px;color:#666;margin-bottom:6px;">Max invest: $${mine.maxInvestmentPerRound}</div>
            <button class="shop-btn" ${!canAfford ? 'disabled' : ''}>Buy</button>
        `;
        item.querySelector('.shop-btn').addEventListener('click', () => {
            openPurchaseModal('mine', mine.id, mine.name, mine.cost);
        });
        shop.appendChild(item);
    });
}

function renderMachinery() {
    const container = document.getElementById('machinery-list');
    if (gameState.machinery.length === 0) {
        container.innerHTML = '<p class="empty-state">No machinery owned yet.</p>';
        return;
    }
    container.innerHTML = '';
    gameState.machinery.forEach((item, index) => {
        const config = gameState.gameConfig.machinery[item.id];
        const resaleValue = Math.floor(item.purchasePrice * config.resaleValue);
        const element = document.createElement('div');
        element.className = 'machinery-item';
        element.innerHTML = `
            <div>
                <div class="machinery-item-name">${config.icon} ${config.name}</div>
                <div style="font-size: 11px; color: #666;">Resale: $${resaleValue}</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
                <div class="machinery-item-bonus">+${Math.round(config.profitBonus * 100)}%</div>
                <button class="machinery-item-sell" data-index="${index}">Sell</button>
            </div>
        `;
        element.querySelector('.machinery-item-sell').addEventListener('click', (e) => {
            sellMachinery(parseInt(e.target.dataset.index, 10));
        });
        container.appendChild(element);
    });
}

function renderMachineryShop() {
    const shop = document.getElementById('machinery-shop');
    const machineryList = Object.entries(gameState.gameConfig.machinery);
    shop.innerHTML = '';
    machineryList.forEach(([id, machinery]) => {
        const ownedCount = gameState.machinery.filter(m => m.id === id).length;
        const canPurchase = ownedCount < machinery.purchaseLimit && gameState.cash >= machinery.cost;
        const item = document.createElement('div');
        item.className = `shop-item ${!canPurchase ? 'unavailable' : ''}`;
        item.innerHTML = `
            <div class="shop-icon">${machinery.icon}</div>
            <div class="shop-name">${machinery.name}</div>
            <div class="shop-cost">$${machinery.cost}</div>
            <div style="font-size: 11px; color: #666; margin-bottom: 6px;">
                +${Math.round(machinery.profitBonus * 100)}% profit
            </div>
            <button class="shop-btn" ${!canPurchase ? 'disabled' : ''}>${ownedCount}/${machinery.purchaseLimit}</button>
        `;
        item.querySelector('.shop-btn').addEventListener('click', () => {
            if (canPurchase) openPurchaseModal('machinery', id, machinery.name, machinery.cost);
        });
        shop.appendChild(item);
    });
}

function renderStats() {
    const netWorth = gameState.getNetWorth();
    const mineValue = gameState.getMineValue();
    const machineryValue = gameState.getMachineryValue();

    document.getElementById('cash').textContent = `$${gameState.cash.toFixed(2)}`;
    document.getElementById('netWorth').textContent = `$${netWorth.toFixed(2)}`;
    document.getElementById('minesOwned').textContent = gameState.getOwnedMines().length;
    document.getElementById('machineryCount').textContent = gameState.machinery.length;
    document.getElementById('round').textContent = gameState.round;

    document.getElementById('summary-cash').textContent = `$${gameState.cash.toFixed(2)}`;
    document.getElementById('summary-mines').textContent = `$${mineValue.toFixed(2)}`;
    document.getElementById('summary-machinery').textContent = `$${machineryValue.toFixed(2)}`;
    document.getElementById('summary-networth').textContent = `$${netWorth.toFixed(2)}`;
    document.getElementById('summary-total').textContent = `$${gameState.totalProfitLoss.toFixed(2)}`;
}

function renderFeaturesAndCosts() {
    const cfg = gameState.gameConfig;
    const mines = Object.values(cfg.mines).map(m => `${m.name} $${m.cost} (max $${m.maxInvestmentPerRound})`).join('</li><li>');
    const upgrades = Object.values(cfg.mineUpgrades).map(u => `${u.name} $${u.cost}`).join('</li><li>');
    const machinery = Object.values(cfg.machinery).map(m => `${m.name} $${m.cost} (+${Math.round(m.profitBonus * 100)}%)`).join('</li><li>');
    document.getElementById('features-costs').innerHTML = `
        <ul>
            <li><strong>Mines:</strong> ${mines}</li>
            <li><strong>Upgrades:</strong> ${upgrades}</li>
            <li><strong>Machinery:</strong> ${machinery}</li>
            <li><strong>Random Events:</strong> 1:$50 repair, 2:$20 fuel, 3:profits halved, 4:profits doubled, 5:+20%, 6:auto-success dig choice</li>
            <li><strong>Net Worth:</strong> Cash + Mine Value + Machinery Resale Value</li>
        </ul>
    `;
}

function renderLeaderboard() {
    const records = getClassRecords();
    const leaderboard = [...records].sort((a, b) => b.netWorth - a.netWorth).slice(0, 10);
    const wealthiest = leaderboard[0];
    const avgWealth = records.length ? records.reduce((s, r) => s + r.netWorth, 0) / records.length : 0;
    const mostMines = [...records].sort((a, b) => b.minesOwned - a.minesOwned)[0];
    const profitable = [...records].sort((a, b) => b.averageRoundProfit - a.averageRoundProfit)[0];

    document.getElementById('leaderboard-summary').innerHTML = `
        Wealthiest: ${wealthiest ? `${wealthiest.companyName} ($${wealthiest.netWorth.toFixed(2)})` : 'N/A'}<br>
        Most mines: ${mostMines ? `${mostMines.companyName} (${mostMines.minesOwned})` : 'N/A'}<br>
        Most profitable strategy: ${profitable ? `${profitable.companyName} (${profitable.strategyLabel || 'Balanced'})` : 'N/A'}<br>
        Average class wealth: $${avgWealth.toFixed(2)}
    `;

    const list = document.getElementById('leaderboard-list');
    if (!leaderboard.length) {
        list.innerHTML = '<p class="empty-state">No classroom records yet.</p>';
        return;
    }
    list.innerHTML = leaderboard.map((record, index) => `
        <div class="leaderboard-item">
            <span>${index + 1}. ${record.companyName}</span>
            <span>$${record.netWorth.toFixed(2)}</span>
        </div>
    `).join('');
}

function updateAllUI() {
    ensureInvestmentPlansForOwnedMines();
    renderMines();
    renderMineShop();
    renderMachinery();
    renderMachineryShop();
    renderStats();
    renderFeaturesAndCosts();
    renderLeaderboard();
}

function openMineModal(mine) {
    currentMineForInvestment = mine;
    document.getElementById('modalMineTitle').textContent = mine.name;
    document.getElementById('modalMineDesc').textContent = mine.description;
    document.getElementById('modalMaxInvestment').textContent = `Max Investment: $${mine.maxInvestmentPerRound}/round`;

    const upgradesContainer = document.getElementById('modalUpgrades');
    const availableUpgrades = Object.entries(gameState.gameConfig.mineUpgrades).filter(([id]) => !mine.upgrades.includes(id));
    if (!availableUpgrades.length) {
        upgradesContainer.innerHTML = '<p class="empty-state">All upgrades applied!</p>';
    } else {
        upgradesContainer.innerHTML = availableUpgrades.map(([id, upgrade]) => {
            const canAfford = gameState.cash >= upgrade.cost;
            return `
                <div class="upgrade-item">
                    <div>
                        <div class="upgrade-name">${upgrade.icon} ${upgrade.name}</div>
                        <div style="font-size:11px;color:#666;">${upgrade.description}</div>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <span class="upgrade-cost">$${upgrade.cost}</span>
                        <button class="shop-btn" ${!canAfford ? 'disabled' : ''} data-upgrade-id="${id}">Apply</button>
                    </div>
                </div>
            `;
        }).join('');

        upgradesContainer.querySelectorAll('[data-upgrade-id]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                applyUpgrade(mine.id, e.target.dataset.upgradeId);
            });
        });
    }

    const currentPlan = gameState.investmentPlans[mine.id] || { safe: 0, medium: 0, deep: 0 };
    document.getElementById('modalInvestments').innerHTML = Object.entries(gameState.gameConfig.digTypes).map(([digType, dig]) => `
        <div class="investment-input-group">
            <label for="inv-${digType}">${dig.icon} ${dig.name}</label>
            <input type="number" id="inv-${digType}" min="0" step="1" value="${currentPlan[digType] || 0}">
        </div>
    `).join('');

    document.getElementById('mineModal').classList.add('active');
}

function openPurchaseModal(type, itemId, itemName, cost) {
    pendingPurchase = { type, itemId, itemName, cost };
    document.getElementById('purchaseTitle').textContent = `Purchase ${itemName}`;
    document.getElementById('purchaseDesc').textContent = `Are you sure you want to purchase ${itemName}?`;
    document.getElementById('purchasePrice').textContent = `Cost: $${cost}`;
    document.getElementById('confirmPurchase').disabled = gameState.cash < cost;
    document.getElementById('purchaseModal').classList.add('active');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
    pendingPurchase = null;
}

function saveMinePlan() {
    if (!currentMineForInvestment) return;
    const plan = {};
    let total = 0;
    for (const digType of Object.keys(gameState.gameConfig.digTypes)) {
        const inputEl = document.getElementById(`inv-${digType}`);
        const amount = Math.max(0, parseInt(inputEl?.value, 10) || 0);
        plan[digType] = amount;
        total += amount;
    }
    if (total > currentMineForInvestment.maxInvestmentPerRound) {
        alert(`Max investment for ${currentMineForInvestment.name}: $${currentMineForInvestment.maxInvestmentPerRound}`);
        return;
    }
    gameState.investmentPlans[currentMineForInvestment.id] = plan;
    gameState.saveToLocalStorage();
    closeAllModals();
    updateAllUI();
}

function confirmPurchase() {
    if (!pendingPurchase) return;
    const result = pendingPurchase.type === 'mine'
        ? gameState.purchaseMine(pendingPurchase.itemId)
        : gameState.purchaseMachinery(pendingPurchase.itemId);

    if (!result.success) {
        alert(`Error: ${result.error}`);
        return;
    }

    gameState.saveToLocalStorage();
    updateAllUI();
    closeAllModals();
    syncPlayerRecord();
}

function applyUpgrade(mineId, upgradeId) {
    const result = gameState.upgradeMine(mineId, upgradeId);
    if (!result.success) {
        alert(`Error: ${result.error}`);
        return;
    }
    gameState.saveToLocalStorage();
    updateAllUI();
    const updatedMine = gameState.getOwnedMines().find(m => m.id === mineId);
    if (updatedMine) openMineModal(updatedMine);
    syncPlayerRecord();
}

function sellMachinery(index) {
    if (!confirm('Are you sure you want to sell this machinery?')) return;
    const result = gameState.sellMachinery(index);
    if (!result.success) {
        alert(`Error: ${result.error}`);
        return;
    }
    gameState.saveToLocalStorage();
    updateAllUI();
    syncPlayerRecord();
}

function rollRoundEvent() {
    const roll = Math.floor(Math.random() * 6) + 1;
    const event = Object.values(gameState.gameConfig.randomEvents).find(e => e.diceValue === roll);
    return { roll, event };
}

function getRoundEffects(event) {
    const effects = { profitMultiplier: 1, forcedDigType: null, cashPenalty: 0, message: '' };
    if (!event) return effects;

    effects.message = `${event.icon} Event (${event.diceValue}): ${event.description}`;
    if (event.effect === 'deduct_cash') {
        const deduction = Math.min(gameState.cash, event.cost || 0);
        gameState.cash -= deduction;
        effects.cashPenalty = -deduction;
    } else if (event.effect === 'halve_profits') {
        effects.profitMultiplier = 0.5;
    } else if (event.effect === 'double_profits') {
        effects.profitMultiplier = 2;
    } else if (event.effect === 'bonus_profit') {
        effects.profitMultiplier = 1 + (event.bonusPercentage || 0);
    } else if (event.effect === 'automatic_success') {
        const selected = prompt('Rich Vein Found! Choose automatic success dig type: safe, medium, or deep', 'deep');
        if (selected && ['safe', 'medium', 'deep'].includes(selected.toLowerCase().trim())) {
            effects.forcedDigType = selected.toLowerCase().trim();
        }
    }
    return effects;
}

function playRound() {
    if (isTeacherPaused()) {
        alert('Game is currently paused by the teacher.');
        return;
    }

    const plannedByMine = gameState.getOwnedMines()
        .map(mine => ({ mine, plan: gameState.investmentPlans[mine.id] || { safe: 0, medium: 0, deep: 0 } }))
        .filter(entry => Object.values(entry.plan).some(value => (Number(value) || 0) > 0));

    if (!plannedByMine.length) {
        alert('Set at least one mine investment plan before rolling.');
        return;
    }

    const totalAtRisk = plannedByMine.reduce(
        (sum, entry) => sum + Object.values(entry.plan).reduce((s, v) => s + (Number(v) || 0), 0),
        0
    );
    if (totalAtRisk > gameState.cash) {
        alert(`Insufficient cash for all planned investments. At-risk total: $${totalAtRisk}`);
        return;
    }

    const { event } = rollRoundEvent();
    const roundEffects = getRoundEffects(event);

    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const diceTotal = die1 + die2;
    displayDiceRoll(die1, die2, diceTotal);

    const results = [];
    let roundProfit = 0;

    plannedByMine.forEach(({ mine, plan }) => {
        Object.entries(plan).forEach(([digType, amount]) => {
            const numericAmount = Number(amount) || 0;
            if (numericAmount <= 0) return;
            const dig = gameState.gameConfig.digTypes[digType];
            const diceSuccess = diceTotal >= dig.successRange.min && diceTotal <= dig.successRange.max;
            const isSuccess = roundEffects.forcedDigType === digType ? true : diceSuccess;
            const finalProfit = gameState.calculateOutcome(
                numericAmount,
                digType,
                mine.id,
                isSuccess,
                roundEffects
            );
            results.push({
                mineName: mine.name,
                digKey: digType,
                digType: dig.name,
                icon: dig.icon,
                amount: numericAmount,
                profit: finalProfit,
                success: isSuccess
            });
            roundProfit += finalProfit;
        });
    });

    gameState.cash += roundProfit;
    const totalRoundChange = roundProfit + roundEffects.cashPenalty;
    gameState.totalProfitLoss += totalRoundChange;
    gameState.roundHistory.push({
        round: gameState.round,
        event: event ? event.id : null,
        totalProfit: totalRoundChange,
        cashAfter: gameState.cash,
        netWorth: gameState.getNetWorth(),
        results
    });
    gameState.round += 1;

    gameState.getOwnedMines().forEach(mine => {
        gameState.investmentPlans[mine.id] = { safe: 0, medium: 0, deep: 0 };
    });

    displayResults(results, totalRoundChange, roundEffects.message);
    gameState.saveToLocalStorage();
    updateAllUI();
    syncPlayerRecord();
}

function displayDiceRoll(die1, die2, total) {
    document.getElementById('dice-display').innerHTML = `
        🎲 Dice 1: <strong>${die1}</strong><br>
        🎲 Dice 2: <strong>${die2}</strong><br>
        ➕ Total: <strong>${total}</strong>
    `;
}

function displayResults(results, totalProfit, eventMessage) {
    const container = document.getElementById('results-container');
    let html = eventMessage ? `<div class="result-card">${eventMessage}</div>` : '';
    results.forEach(result => {
        const statusClass = result.success ? '' : 'loss';
        const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
        html += `
            <div class="result-card ${statusClass}">
                <strong>${result.mineName}</strong> • ${result.icon} ${result.digType} ${status}<br>
                Investment: $${result.amount.toFixed(2)}<br>
                Profit: ${result.profit >= 0 ? '+' : ''}$${result.profit.toFixed(2)}
            </div>
        `;
    });
    html += `
        <div class="result-card" style="background:#e8f5e9;border-left-color:#4caf50;margin-top:10px;">
            <strong>Round Profit/Loss: ${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}</strong>
        </div>
    `;
    container.innerHTML = html;
}

function saveIdentity(showAlert = true) {
    gameState.player.studentId = document.getElementById('studentIdInput').value.trim();
    gameState.player.studentName = document.getElementById('studentNameInput').value.trim();
    gameState.player.companyName = document.getElementById('companyNameInput').value.trim() || 'Untitled Mining Co.';
    gameState.saveToLocalStorage();
    updateAllUI();
    syncPlayerRecord();
    if (showAlert) {
        alert('Identity saved.');
    }
}

function hydrateIdentityInputs() {
    const suggested = gameState.gameConfig.company?.suggestedNames || [];
    if (!gameState.player.companyName || gameState.player.companyName === 'Untitled Mining Co.') {
        gameState.player.companyName = suggested[0] || 'Untitled Mining Co.';
    }
    document.getElementById('studentIdInput').value = gameState.player.studentId || '';
    document.getElementById('studentNameInput').value = gameState.player.studentName || '';
    document.getElementById('companyNameInput').value = gameState.player.companyName || '';
}

function getOrCreatePlayerKey() {
    let key = localStorage.getItem(PLAYER_KEY_STORAGE);
    if (!key) {
        key = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : `player_${Date.now()}_${(() => {
                if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
                    return Array.from(crypto.getRandomValues(new Uint32Array(2))).join('_');
                }
                return `${Math.random().toString(36).slice(2, 12)}_${Math.random().toString(36).slice(2, 12)}`;
            })()}`;
        localStorage.setItem(PLAYER_KEY_STORAGE, key);
    }
    return key;
}

function getClassRecords() {
    try {
        const records = JSON.parse(localStorage.getItem(CLASS_RECORDS_KEY));
        return Array.isArray(records) ? records : [];
    } catch (error) {
        return [];
    }
}

function saveClassRecords(records) {
    localStorage.setItem(CLASS_RECORDS_KEY, JSON.stringify(records));
}

function calculateStrategyLabel() {
    const totals = { safe: 0, medium: 0, deep: 0 };
    gameState.roundHistory.forEach(round => {
        (round.results || []).forEach(result => {
            if (result.digKey && Object.prototype.hasOwnProperty.call(totals, result.digKey)) {
                totals[result.digKey] += result.amount || 0;
            }
        });
    });
    const max = Math.max(totals.safe, totals.medium, totals.deep);
    if (max === totals.safe) return 'Safe-focused';
    if (max === totals.medium) return 'Balanced-medium';
    return 'High-risk deep';
}

function syncPlayerRecord() {
    const playerKey = getOrCreatePlayerKey();
    const records = getClassRecords();
    const totalRounds = Math.max(1, gameState.round - 1);
    const record = {
        playerKey,
        studentId: gameState.player.studentId || playerKey,
        studentName: gameState.player.studentName || 'Anonymous Student',
        companyName: gameState.player.companyName || 'Untitled Mining Co.',
        round: gameState.round,
        cash: gameState.cash,
        netWorth: gameState.getNetWorth(),
        minesOwned: gameState.getOwnedMines().length,
        machineryOwned: gameState.machinery.length,
        totalProfitLoss: gameState.totalProfitLoss,
        averageRoundProfit: gameState.totalProfitLoss / totalRounds,
        strategyLabel: calculateStrategyLabel(),
        updatedAt: new Date().toISOString()
    };

    const index = records.findIndex(r => r.playerKey === playerKey);
    if (index >= 0) records[index] = record;
    else records.push(record);
    saveClassRecords(records);
    syncTeacherDashboardRecord(record);
}

function syncTeacherDashboardRecord(record) {
    if (typeof TeacherDashboard === 'undefined') return;
    const dashboard = new TeacherDashboard();
    dashboard.loadFromLocalStorage();
    dashboard.syncFromPlayerRecord(record);
    dashboard.saveToLocalStorage();
}

function isTeacherPaused() {
    try {
        const pauseState = JSON.parse(localStorage.getItem(PAUSE_STATE_KEY));
        return !!pauseState?.paused;
    } catch (error) {
        return false;
    }
}

function updatePauseStateFromStorage() {
    const paused = isTeacherPaused();
    document.getElementById('rollButton').disabled = paused;
    const banner = document.getElementById('pause-banner');
    banner.classList.toggle('hidden', !paused);
}

function saveGame() {
    saveIdentity(false);
    const result = gameState.saveToLocalStorage();
    alert(result.success ? '✅ Game saved successfully!' : `❌ Error saving game: ${result.error}`);
}

function loadGame() {
    if (!confirm('Load saved game? This will overwrite current progress.')) return;
    const result = gameState.loadFromLocalStorage();
    if (!result.success) {
        alert('❌ No save data found');
        return;
    }
    ensureInvestmentPlansForOwnedMines();
    hydrateIdentityInputs();
    updateAllUI();
    closeAllModals();
    syncPlayerRecord();
    alert('✅ Game loaded successfully!');
}

function resetGame() {
    if (!confirm('Start a new game? All progress will be lost.')) return;
    gameState.reset();
    localStorage.removeItem('level2_autosave');
    hydrateIdentityInputs();
    updateAllUI();
    closeAllModals();
    syncPlayerRecord();
    alert('✅ New game started!');
}
