/**
 * Level 2: Mining Tycoon - Main Game Logic
 * Handles UI updates, user interactions, and game progression
 */

let gameState = null;
let currentMineForInvestment = null;
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

// ===== RENDER FUNCTIONS =====
function renderMines() {
    const container = document.getElementById('mines-container');
    const ownedMines = gameState.getOwnedMines();
    
    container.innerHTML = '';
    
    ownedMines.forEach(mine => {
        const card = document.createElement('div');
        card.className = 'mine-card owned';
        
        const upgrades = mine.upgrades.length > 0 
            ? `✨ ${mine.upgrades.length} upgrade(s)`
            : '';
        
        card.innerHTML = `
            <div class="mine-card-icon">${mine.icon}</div>
            <div class="mine-card-title">${mine.name}</div>
            <div class="mine-card-info">Max: $${mine.maxInvestmentPerRound}/round</div>
            <div class="mine-card-info">Value: $${mine.baseValue}</div>
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
    currentMineForInvestment = mine;
    
    document.getElementById('modalMineTitle').textContent = mine.name;
    document.getElementById('modalMineDesc').textContent = mine.description;
    document.getElementById('modalMaxInvestment').textContent = `Max Investment: $${mine.maxInvestmentPerRound}/round`;
    
    // Render upgrades
    const upgradesContainer = document.getElementById('modalUpgrades');
    const availableUpgrades = Object.entries(gameState.gameConfig.mineUpgrades)
        .filter(([id, upgrade]) => !mine.upgrades.includes(id));
    
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
                        <button class="shop-btn" ${!canAfford ? 'disabled' : ''} data-upgrade-id="${id}">
                            Apply
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        upgradesContainer.querySelectorAll('[data-upgrade-id]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const upgradeId = e.target.dataset.upgradeId;
                applyUpgrade(mine.id, upgradeId);
            });
        });
    }
    
    // Render investment inputs
    const investmentsContainer = document.getElementById('modalInvestments');
    investmentsContainer.innerHTML = Object.entries(gameState.gameConfig.digTypes).map(([digType, dig]) => `
        <div class="investment-input-group">
            <label for="inv-${digType}">${dig.icon} ${dig.name}</label>
            <input type="number" id="inv-${digType}" min="0" step="1" value="0">
        </div>
    `).join('');
    
    modal.classList.add('active');
}

function openPurchaseModal(type, itemId, itemName, cost) {
    const modal = document.getElementById('purchaseModal');
    
    pendingPurchase = { type, itemId, itemName, cost };
    
    document.getElementById('purchaseTitle').textContent = `Purchase ${itemName}`;
    document.getElementById('purchaseDesc').textContent = `Are you sure you want to purchase ${itemName}?`;
    document.getElementById('purchasePrice').textContent = `Cost: $${cost}`;
    
    if (gameState.cash < cost) {
        document.getElementById('purchaseDesc').textContent += ` (Insufficient funds: $${gameState.cash}/$${cost})`;
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
    currentMineForInvestment = null;
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
        openMineModal(gameState.gameConfig.mines[mineId]);
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
    if (!currentMineForInvestment) {
        alert('Please select a mine first');
        return;
    }
    
    // Get investments from modal inputs
    const investments = {};
    Object.keys(gameState.gameConfig.digTypes).forEach(digType => {
        const inputEl = document.getElementById(`inv-${digType}`);
        investments[digType] = inputEl ? parseInt(inputEl.value) || 0 : 0;
    });
    
    const totalInvestment = Object.values(investments).reduce((a, b) => a + b, 0);
    
    if (totalInvestment <= 0) {
        alert('Please allocate at least some funds');
        return;
    }
    
    if (totalInvestment > gameState.cash) {
        alert('Insufficient funds');
        return;
    }
    
    if (totalInvestment > currentMineForInvestment.maxInvestmentPerRound) {
        alert(`Max investment for this round: $${currentMineForInvestment.maxInvestmentPerRound}`);
        return;
    }
    
    // Deduct investment
    gameState.cash -= totalInvestment;
    
    // Roll dice
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const diceTotal = die1 + die2;
    
    // Display dice
    displayDiceRoll(die1, die2, diceTotal);
    
    // Calculate results
    const results = [];
    let roundProfit = 0;
    
    Object.entries(investments).forEach(([digType, amount]) => {
        if (amount > 0) {
            const dig = gameState.gameConfig.digTypes[digType];
            const isSuccess = diceTotal >= dig.successRange.min && diceTotal <= dig.successRange.max;
            
            let baseProfit = isSuccess ? amount * gameState.getDigTypeMultiplier(currentMineForInvestment.id, digType) : -amount;
            let finalProfit = gameState.calculateProfit(amount, baseProfit, digType, currentMineForInvestment.id);
            
            results.push({
                digType: dig.name,
                icon: dig.icon,
                amount: amount,
                profit: finalProfit,
                success: isSuccess
            });
            
            roundProfit += finalProfit;
        }
    });
    
    // Update cash with profit
    gameState.cash += roundProfit;
    
    // Display results
    displayResults(results, roundProfit);
    
    // Increment round
    gameState.round++;
    
    // Save autosave
    gameState.saveToLocalStorage();
    
    // Update UI
    updateAllUI();
    
    // Clear investments
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
                ${result.icon} ${result.digType} ${status}<br>
                Investment: $${result.amount.toFixed(2)}<br>
                Profit: ${result.profit >= 0 ? '+' : ''}$${result.profit.toFixed(2)}
            </div>
        `;
    });
    
    html += `
        <div class="result-card" style="background: #e8f5e9; border-left-color: #4caf50; margin-top: 10px;">
            <strong>Round Profit/Loss: ${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}</strong>
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
        alert('✅ Game loaded successfully!');
        updateAllUI();
        closeAllModals();
    } else {
        alert(`❌ No save data found`);
    }
}

function resetGame() {
    if (!confirm('Start a new game? All progress will be lost.')) {
        return;
    }
    
    gameState.reset();
    localStorage.removeItem('level2_autosave');
    updateAllUI();
    closeAllModals();
    alert('✅ New game started!');
}
