/**
 * Level 2: Mining Tycoon - Main Game Logic
 * Handles UI updates, user interactions, and game progression
 */

let gameState = null;
let selectedMine = null;   // Currently active mine for investment
let pendingPurchase = null;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Level 2 game initializing...');
    
    // Initialize game state
    gameState = new GameState();
    const configLoaded = await gameState.loadConfig('../../shared/game-config.json');
    
    if (!configLoaded) {
        alert('Failed to load game configuration. Please refresh the page.');
        return;
    }
    
    // Try to load saved game
    const saveData = gameState.loadFromLocalStorage();
    if (!saveData.success) {
        console.log('Starting new game');
    } else {
        console.log('Game loaded from save');
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Initial UI render
    updateAllUI();
});

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Main buttons
    document.getElementById('rollButton').addEventListener('click', playRound);
    document.getElementById('saveButton').addEventListener('click', saveGame);
    document.getElementById('loadButton').addEventListener('click', loadGame);
    document.getElementById('resetButton').addEventListener('click', resetGame);
    
    // Modal controls
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    // Purchase modal
    document.getElementById('confirmPurchase').addEventListener('click', confirmPurchase);
    document.getElementById('cancelPurchase').addEventListener('click', closeAllModals);
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
}

// ===== MINE SELECTION =====
function selectMine(mine) {
    selectedMine = mine;

    // Show active mine info panel
    document.getElementById('no-mine-selected').style.display = 'none';
    document.getElementById('active-mine-info').style.display = 'block';
    document.getElementById('active-mine-name').textContent = mine.name;

    // Render investment inputs for this mine
    const container = document.getElementById('investment-inputs');
    container.innerHTML = Object.entries(gameState.gameConfig.digTypes).map(([digType, dig]) => `
        <div class="investment-input-group">
            <label for="inv-${digType}">${dig.icon} ${dig.name}</label>
            <input type="number" id="inv-${digType}" min="0" step="1" value="0">
        </div>
    `).join('');

    // Enable the Roll button
    const rollBtn = document.getElementById('rollButton');
    rollBtn.disabled = false;
    rollBtn.textContent = 'Roll Dice & Mine';

    // Re-render mines to update selection highlight
    renderMines();
}

// ===== RENDER FUNCTIONS =====
function renderMines() {
    const container = document.getElementById('mines-container');
    const ownedMines = gameState.getOwnedMines();
    
    container.innerHTML = '';
    
    ownedMines.forEach(mine => {
        const card = document.createElement('div');
        const isSelected = selectedMine && selectedMine.id === mine.id;
        card.className = `mine-card owned${isSelected ? ' selected' : ''}`;
        
        const upgradeCount = mine.upgrades ? mine.upgrades.length : 0;
        const upgradesText = upgradeCount > 0 ? `✨ ${upgradeCount} upgrade(s)` : '';
        
        card.innerHTML = `
            <div class="mine-card-icon">${mine.icon}</div>
            <div class="mine-card-title">${mine.name}</div>
            <div class="mine-card-info">Max: $${mine.maxInvestmentPerRound}/round</div>
            <div class="mine-card-info">Value: $${mine.baseValue}</div>
            ${upgradesText ? `<div class="mine-card-upgrades">${upgradesText}</div>` : ''}
            <div class="mine-card-status status-owned">${isSelected ? '⛏️ Active' : '✓ Owned'}</div>
            <button class="upgrade-btn" data-mine-id="${mine.id}">🔧 Upgrades</button>
        `;
        
        // Clicking anywhere on the card (except upgrade button) selects it
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('upgrade-btn')) {
                selectMine(mine);
            }
        });

        // Upgrade button opens the modal
        card.querySelector('.upgrade-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openMineModal(mine);
        });
        
        container.appendChild(card);
    });
}

function renderMineShop() {
    const shop = document.getElementById('mine-shop');
    const availableMines = gameState.getAvailableMinesForPurchase();
    
    shop.innerHTML = '';

    if (availableMines.length === 0) {
        shop.innerHTML = '<p class="empty-state">All mines owned!</p>';
        return;
    }
    
    availableMines.forEach(mine => {
        const item = document.createElement('div');
        item.className = 'shop-item';
        
        if (gameState.cash < mine.cost) {
            item.classList.add('unavailable');
        }
        
        item.innerHTML = `
            <div class="shop-icon">${mine.icon}</div>
            <div class="shop-name">${mine.name}</div>
            <div class="shop-cost">$${mine.cost}</div>
            <button class="shop-btn" ${gameState.cash < mine.cost ? 'disabled' : ''}>
                Buy
            </button>
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
            <div style="display: flex; gap: 8px; align-items: center;">
                <div class="machinery-item-bonus">+${Math.round(config.profitBonus * 100)}%</div>
                <button class="machinery-item-sell" data-index="${index}">Sell</button>
            </div>
        `;
        
        element.querySelector('.machinery-item-sell').addEventListener('click', (e) => {
            sellMachinery(parseInt(e.target.dataset.index));
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
        item.className = 'shop-item';
        
        if (!canPurchase) {
            item.classList.add('unavailable');
        }
        
        item.innerHTML = `
            <div class="shop-icon">${machinery.icon}</div>
            <div class="shop-name">${machinery.name}</div>
            <div class="shop-cost">$${machinery.cost}</div>
            <div style="font-size: 11px; color: #666; margin-bottom: 6px;">
                +${Math.round(machinery.profitBonus * 100)}% profit
            </div>
            <button class="shop-btn" ${!canPurchase ? 'disabled' : ''}>
                ${ownedCount}/${machinery.purchaseLimit}
            </button>
        `;
        
        item.querySelector('.shop-btn').addEventListener('click', () => {
            if (canPurchase) {
                openPurchaseModal('machinery', id, machinery.name, machinery.cost);
            }
        });
        
        shop.appendChild(item);
    });
}

function renderStats() {
    const netWorth = gameState.getNetWorth();
    const mineValue = gameState.getMineValue();
    const machineryValue = gameState.getMachineryValue();
    
    // Top stats bar
    document.getElementById('cash').textContent = `$${gameState.cash.toFixed(2)}`;
    document.getElementById('netWorth').textContent = `$${netWorth.toFixed(2)}`;
    document.getElementById('minesOwned').textContent = gameState.getOwnedMines().length;
    document.getElementById('machineryCount').textContent = gameState.machinery.length;
    document.getElementById('round').textContent = gameState.round;
    
    // Summary section
    document.getElementById('summary-cash').textContent = `$${gameState.cash.toFixed(2)}`;
    document.getElementById('summary-mines').textContent = `$${mineValue.toFixed(2)}`;
    document.getElementById('summary-machinery').textContent = `$${machineryValue.toFixed(2)}`;
    document.getElementById('summary-networth').textContent = `$${netWorth.toFixed(2)}`;
    document.getElementById('summary-total').textContent = `$${gameState.totalProfitLoss.toFixed(2)}`;
}

function updateAllUI() {
    renderMines();
    renderMineShop();
    renderMachinery();
    renderMachineryShop();
    renderStats();
}

// ===== MODAL FUNCTIONS =====
function openMineModal(mine) {
    const modal = document.getElementById('mineModal');
    
    document.getElementById('modalMineTitle').textContent = mine.name;
    document.getElementById('modalMineDesc').textContent = mine.description;
    document.getElementById('modalMaxInvestment').textContent = `Max Investment: $${mine.maxInvestmentPerRound}/round`;
    
    // Render upgrades only (investments are now in the main panel)
    const upgradesContainer = document.getElementById('modalUpgrades');
    const appliedUpgrades = mine.upgrades || [];
    const availableUpgrades = Object.entries(gameState.gameConfig.mineUpgrades)
        .filter(([id]) => !appliedUpgrades.includes(id));
    
    if (availableUpgrades.length === 0) {
        upgradesContainer.innerHTML = '<p class="empty-state">All upgrades applied!</p>';
    } else {
        upgradesContainer.innerHTML = availableUpgrades.map(([id, upgrade]) => {
            const canAfford = gameState.cash >= upgrade.cost;
            return `
                <div class="upgrade-item">
                    <div>
                        <div class="upgrade-name">${upgrade.icon} ${upgrade.name}</div>
                        <div style="font-size: 11px; color: #666;">${upgrade.description}</div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <span class="upgrade-cost">$${upgrade.cost}</span>
                        <button class="shop-btn" ${!canAfford ? 'disabled' : ''} data-upgrade-id="${id}" data-mine-id="${mine.id}">
                            Apply
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        upgradesContainer.querySelectorAll('[data-upgrade-id]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const upgradeId = e.target.dataset.upgradeId;
                const mineId = e.target.dataset.mineId;
                applyUpgrade(mineId, upgradeId);
            });
        });
    }
    
    modal.classList.add('active');
}

function openPurchaseModal(type, itemId, itemName, cost) {
    const modal = document.getElementById('purchaseModal');
    
    pendingPurchase = { type, itemId, itemName, cost };
    
    document.getElementById('purchaseTitle').textContent = `Purchase ${itemName}`;
    document.getElementById('purchaseDesc').textContent = `Are you sure you want to purchase ${itemName}?`;
    document.getElementById('purchasePrice').textContent = `Cost: $${cost}`;
    
    if (gameState.cash < cost) {
        document.getElementById('purchaseDesc').textContent += ` (Insufficient funds: $${gameState.cash.toFixed(2)}/$${cost})`;
        document.getElementById('confirmPurchase').disabled = true;
    } else {
        document.getElementById('confirmPurchase').disabled = false;
    }
    
    modal.classList.add('active');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    // Note: selectedMine is intentionally preserved so Roll Dice still works after closing
    pendingPurchase = null;
}

// ===== PURCHASE & UPGRADE FUNCTIONS =====
function confirmPurchase() {
    if (!pendingPurchase) return;
    
    let result;
    if (pendingPurchase.type === 'mine') {
        result = gameState.purchaseMine(pendingPurchase.itemId);
    } else if (pendingPurchase.type === 'machinery') {
        result = gameState.purchaseMachinery(pendingPurchase.itemId);
    }
    
    if (result.success) {
        console.log(result.message);
        updateAllUI();
        closeAllModals();
    } else {
        alert(`Error: ${result.error}`);
    }
}

function applyUpgrade(mineId, upgradeId) {
    const result = gameState.upgradeMine(mineId, upgradeId);
    
    if (result.success) {
        console.log(result.message);
        updateAllUI();
        // Re-open modal with updated owned mine data (not the static config object)
        const updatedMine = gameState.getOwnedMines().find(m => m.id === mineId);
        if (updatedMine) {
            openMineModal(updatedMine);
            // Keep selectedMine in sync if the upgraded mine is currently active
            if (selectedMine && selectedMine.id === mineId) {
                selectedMine = updatedMine;
            }
        }
    } else {
        alert(`Error: ${result.error}`);
    }
}

function sellMachinery(index) {
    if (confirm('Are you sure you want to sell this machinery?')) {
        const result = gameState.sellMachinery(index);
        if (result.success) {
            console.log(result.message);
            updateAllUI();
        } else {
            alert(`Error: ${result.error}`);
        }
    }
}

// ===== GAME ROUND LOGIC =====
function playRound() {
    if (!selectedMine) {
        alert('Please select a mine first by clicking on a mine card.');
        return;
    }
    
    // Get investments from the main investment panel inputs
    const investments = {};
    Object.keys(gameState.gameConfig.digTypes).forEach(digType => {
        const inputEl = document.getElementById(`inv-${digType}`);
        investments[digType] = inputEl ? parseInt(inputEl.value) || 0 : 0;
    });
    
    const totalInvestment = Object.values(investments).reduce((a, b) => a + b, 0);
    
    if (totalInvestment <= 0) {
        alert('Please allocate at least some funds before rolling.');
        return;
    }
    
    if (totalInvestment > gameState.cash) {
        alert(`Insufficient funds. You have $${gameState.cash.toFixed(2)} but are trying to invest $${totalInvestment}.`);
        return;
    }
    
    if (totalInvestment > selectedMine.maxInvestmentPerRound) {
        alert(`Max investment for ${selectedMine.name} this round is $${selectedMine.maxInvestmentPerRound}.`);
        return;
    }
    
    // Deduct total investment upfront
    gameState.cash -= totalInvestment;
    
    // Roll two dice
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const diceTotal = die1 + die2;
    
    displayDiceRoll(die1, die2, diceTotal);
    
    // Calculate results per dig type
    const results = [];
    let roundProfit = 0;
    const machineryBonus = gameState.getTotalMachineryBonus();
    
    Object.entries(investments).forEach(([digType, amount]) => {
        if (amount > 0) {
            const dig = gameState.gameConfig.digTypes[digType];
            const isSuccess = diceTotal >= dig.successRange.min && diceTotal <= dig.successRange.max;
            
            let finalProfit;
            if (isSuccess) {
                // On success: investment * dig multiplier (with mine upgrades) * machinery bonus
                const multiplier = gameState.getDigTypeMultiplier(selectedMine.id, digType);
                finalProfit = amount * multiplier * (1 + machineryBonus);
            } else {
                // On failure: lose the investment (machinery does not help)
                finalProfit = -amount;
            }
            
            results.push({
                digType: dig.name,
                icon: dig.icon,
                amount,
                profit: finalProfit,
                success: isSuccess
            });
            
            roundProfit += finalProfit;
        }
    });
    
    // Add profit/loss back to cash and track running total
    gameState.cash += roundProfit;
    gameState.totalProfitLoss += roundProfit;
    
    // Display round results
    displayResults(results, roundProfit);
    
    // Increment round counter and auto-save
    gameState.round++;
    gameState.saveToLocalStorage();
    
    // Refresh all UI
    updateAllUI();
    
    // Reset investment inputs to zero for next round
    Object.keys(gameState.gameConfig.digTypes).forEach(digType => {
        const inputEl = document.getElementById(`inv-${digType}`);
        if (inputEl) inputEl.value = '0';
    });
}

function displayDiceRoll(die1, die2, total) {
    const display = document.getElementById('dice-display');
    display.innerHTML = `
        🎲 Dice 1: <strong>${die1}</strong><br>
        🎲 Dice 2: <strong>${die2}</strong><br>
        ➕ Total: <strong>${total}</strong>
    `;
}

function displayResults(results, totalProfit) {
    const container = document.getElementById('results-container');
    
    let html = '';
    results.forEach(result => {
        const statusClass = result.success ? '' : 'loss';
        const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
        
        html += `
            <div class="result-card ${statusClass}">
                ${result.icon} ${result.digType} — ${status}<br>
                Investment: $${result.amount.toFixed(2)}<br>
                ${result.success
                    ? `Profit: +$${result.profit.toFixed(2)}`
                    : `Lost: $${Math.abs(result.profit).toFixed(2)}`}
            </div>
        `;
    });
    
    const profitStyle = totalProfit >= 0
        ? 'background: #e8f5e9; border-left-color: #4caf50;'
        : 'background: #ffebee; border-left-color: #f44336;';

    html += `
        <div class="result-card" style="${profitStyle} margin-top: 10px;">
            <strong>Round Total: ${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}</strong>
        </div>
    `;
    
    container.innerHTML = html;
}

// ===== SAVE/LOAD/RESET =====
function saveGame() {
    const result = gameState.saveToLocalStorage();
    if (result.success) {
        alert('✅ Game saved successfully!');
    } else {
        alert(`❌ Error saving game: ${result.error}`);
    }
}

function loadGame() {
    if (!confirm('Load saved game? This will overwrite current progress.')) {
        return;
    }
    
    const result = gameState.loadFromLocalStorage();
    if (result.success) {
        // Clear mine selection so player re-selects after load
        selectedMine = null;
        document.getElementById('no-mine-selected').style.display = 'block';
        document.getElementById('active-mine-info').style.display = 'none';
        const rollBtn = document.getElementById('rollButton');
        rollBtn.disabled = true;
        rollBtn.textContent = 'Select a mine first';

        alert('✅ Game loaded successfully!');
        updateAllUI();
        closeAllModals();
    } else {
        alert('❌ No save data found');
    }
}

function resetGame() {
    if (!confirm('Start a new game? All progress will be lost.')) {
        return;
    }
    
    gameState.reset();
    localStorage.removeItem('level2_autosave');

    // Clear mine selection
    selectedMine = null;
    document.getElementById('no-mine-selected').style.display = 'block';
    document.getElementById('active-mine-info').style.display = 'none';
    const rollBtn = document.getElementById('rollButton');
    rollBtn.disabled = true;
    rollBtn.textContent = 'Select a mine first';

    updateAllUI();
    closeAllModals();
    alert('✅ New game started!');
}
