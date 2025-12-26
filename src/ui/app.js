// AssetLink Premium Custody Dashboard
// API Configuration
const API_BASE = 'http://localhost:3000/v1';
const API_KEY = 'ak_b82e11138410e62867c9ab42fd51f095';

// State
let currentView = 'overview';
let currentRole = 'issuer'; // platform, issuer, investor, checker

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeModals();
    initializeFilters();
    initializeRoleSwitcher();
    loadOverview();
});

// Role Switcher
function initializeRoleSwitcher() {
    const roleSelect = document.getElementById('role-select');
    roleSelect.value = currentRole;
    roleSelect.addEventListener('change', (e) => {
        currentRole = e.target.value;
        updateUIForRole();
        // Switch to appropriate view for the role
        const defaultViews = {
            'platform': 'overview',
            'issuer': 'custody',
            'investor': 'marketplace',
            'checker': 'approvals'
        };
        switchView(defaultViews[currentRole]);
    });
    updateUIForRole();
}

function updateUIForRole() {
    // Show/hide navigation sections
    const globalNav = document.getElementById('global-nav');
    const issuerNav = document.getElementById('issuer-nav');
    const investorNav = document.getElementById('investor-nav');
    const checkerNav = document.getElementById('checker-nav');

    if (globalNav) globalNav.style.display = (currentRole === 'platform' || currentRole === 'checker') ? 'block' : 'none';
    if (issuerNav) issuerNav.style.display = currentRole === 'issuer' ? 'block' : 'none';
    if (investorNav) investorNav.style.display = currentRole === 'investor' ? 'block' : 'none';
    if (checkerNav) checkerNav.style.display = currentRole === 'checker' ? 'block' : 'none';

    // Contextual Header Actions
    const headerActions = document.getElementById('header-actions');
    if (headerActions) {
        headerActions.style.display = currentRole === 'issuer' ? 'block' : 'none';
    }
}

// Navigation
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            switchView(view);
        });
    });
}

function switchView(view) {
    if (!view) return;

    // Update nav state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === view);
    });

    // Update visibility
    document.querySelectorAll('.view').forEach(v => {
        v.classList.toggle('active', v.id === `${view}-view`);
    });

    // Update title
    const titles = {
        'overview': 'Global Infrastructure Overview',
        'custody': 'Asset Custody Inventory',
        'mint-burn': 'Token Supply Control',
        'marketplace': 'Asset Marketplace',
        'portfolio': 'Institutional Portfolio',
        'approvals': 'Governance Approval Queue',
        'audit': 'Immutable Audit Trail',
        'api-keys': 'Platform API Infrastructure'
    };
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = titles[view] || 'Dashboard';

    currentView = view;
    loadViewData(view);
}

function loadViewData(view) {
    switch (view) {
        case 'overview': loadOverview(); break;
        case 'custody': loadCustodyRecords(); break;
        case 'mint-burn': loadMintBurn(); break;
        case 'marketplace': loadMarketplace(); break;
        case 'portfolio': loadPortfolio(); break;
        case 'approvals': loadApprovals(); break;
        case 'audit': loadAuditTrail(); break;
        case 'api-keys': loadApiKeys(); break;
    }
}

// API Communication
async function apiCall(endpoint, method = 'GET', body = null) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const headers = {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY,
        'X-TIMESTAMP': timestamp,
        'X-SIGNATURE': 'dummy_signature_for_testing'
    };

    // Role-based key override for simulation
    if (currentRole === 'checker') headers['X-API-KEY'] = API_KEY + '_CHECKER';
    if (currentRole === 'investor') headers['X-API-KEY'] = API_KEY + '_INVESTOR';

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(API_BASE + endpoint, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData.error?.message || errorData.message || `API Failure: ${response.statusText}`;
            throw new Error(message);
        }
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showError(error.message);
        return null;
    }
}

// View Loaders
async function loadOverview() {
    const stats = await apiCall('/custody/stats');
    if (stats) {
        const totalEl = document.getElementById('stat-total');
        const linkedEl = document.getElementById('stat-linked');
        const mintedEl = document.getElementById('stat-minted');
        const withdrawnEl = document.getElementById('stat-withdrawn');

        if (totalEl) totalEl.textContent = stats.total || 0;
        if (linkedEl) linkedEl.textContent = stats.linked || 0;
        if (mintedEl) mintedEl.textContent = stats.minted || 0;
        if (withdrawnEl) withdrawnEl.textContent = stats.withdrawn || 0;
    }

    const auditLogs = await apiCall('/audit/recent?limit=8');
    if (auditLogs && auditLogs.logs) renderRecentActivity(auditLogs.logs);
}

async function loadCustodyRecords() {
    const statusEl = document.getElementById('status-filter');
    const searchEl = document.getElementById('asset-search');

    const status = statusEl ? statusEl.value : '';
    const search = searchEl ? searchEl.value : '';

    let path = '/custody';
    if (search) path = `/assets/search?assetId=${search}`;
    else if (status) path = `/custody?status=${status}`;

    const data = await apiCall(path);
    if (data) {
        const records = data.records || (data.assets ? data.assets.map(a => ({ ...a.custodyRecord, assetMetadata: a })) : []);
        renderCustodyTable(records);
    }
}

function renderCustodyTable(records) {
    const tbody = document.getElementById('custody-table-body');
    if (!tbody) return;

    if (!records || records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">No institutional records found</td></tr>';
        return;
    }

    tbody.innerHTML = records.map(r => {
        const pendingOp = r.operations?.find(op => ['PENDING_CHECKER', 'APPROVED'].includes(op.status));
        return `
        <tr>
            <td>
                <strong>${r.assetId}</strong>
                ${r.assetMetadata ? `<div class="sub-text">${r.assetMetadata.assetName}</div>` : ''}
            </td>
            <td>
                <span class="badge ${getStatusBadgeClass(r.status)}">${r.status}</span>
                ${pendingOp ? `<div class="sub-text" style="color: var(--warning); font-size: 0.7rem;">🕒 ${pendingOp.operationType} Pending</div>` : ''}
            </td>
            <td>${r.status === 'MINTED' ? '1.00 Unit' : 'N/A'}</td>
            <td><span class="badge badge-info">${r.blockchain || 'PENDING'}</span></td>
            <td>${formatDate(r.linkedAt)}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="viewDetails('${r.id}')">Explore</button>
            </td>
        </tr>
    `}).join('');
}

async function loadMintBurn() {
    const data = await apiCall('/custody');
    const tbody = document.getElementById('mint-burn-table-body');
    if (!tbody) return;

    if (!data || !data.records) return;

    tbody.innerHTML = data.records.filter(r => r.status === 'LINKED' || r.status === 'MINTED' || r.status === 'PENDING').map(r => {
        const pendingOp = r.operations?.find(op => ['PENDING_CHECKER', 'APPROVED'].includes(op.status));
        const isPendingRecord = r.status === 'PENDING';

        return `
        <tr>
            <td><strong>${r.assetId}</strong></td>
            <td><span class="badge badge-info">RWA</span></td>
            <td>${r.status === 'MINTED' ? '1.00' : '0.00'}</td>
            <td>Ethereum Goerli</td>
            <td>
                ${isPendingRecord ?
                `<button class="btn btn-sm" disabled style="opacity: 0.5; cursor: not-allowed;">Awaiting Link</button>` :
                pendingOp ?
                    `<button class="btn btn-sm btn-warning" disabled style="opacity: 0.7;">${pendingOp.operationType} Pending</button>` :
                    r.status === 'LINKED' ?
                        `<button class="btn btn-sm btn-primary" onclick="initiateOp('${r.id}', 'MINT')">Mint Token</button>` :
                        `<button class="btn btn-sm btn-danger" onclick="initiateOp('${r.id}', 'BURN')">Burn Supply</button>`
            }
            </td>
        </tr>
    `}).join('');
}

async function loadMarketplace() {
    const data = await apiCall('/custody?status=MINTED');
    const container = document.getElementById('marketplace-list');
    if (!container) return;

    if (!data || !data.records || data.records.length === 0) {
        container.innerHTML = '<div class="loading">Inventory currently sold out</div>';
        return;
    }

    container.innerHTML = data.records.map(r => `
        <div class="market-card glass" style="padding: 1.5rem; border: 1px solid var(--border); background: var(--bg-card);">
            <div class="stat-icon">🪙</div>
            <h3>${r.assetId}</h3>
            <p class="sub-text">Tier 1 Institutional Asset</p>
            <div style="margin: 1rem 0; font-size: 0.875rem;">
                <div><strong>Standard:</strong> ERC-721</div>
                <div><strong>Network:</strong> Ethereum Mainnet</div>
            </div>
            <button class="btn btn-primary w-full" onclick="initiateOp('${r.id}', 'TRANSFER')">Aquire Token</button>
        </div>
    `).join('');
}

async function loadPortfolio() {
    const tbody = document.getElementById('portfolio-table-body');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td><strong>ROLEX-SUB-01</strong></td>
            <td>RWA-RX</td>
            <td>1.00</td>
            <td>$12,500.00</td>
            <td><button class="btn btn-sm btn-secondary">Sell</button></td>
        </tr>
    `;
}

async function loadApprovals() {
    const data = await apiCall('/operations?status=PENDING_CHECKER');
    const container = document.getElementById('approval-queue');
    if (!container) return;

    if (!data || !data.operations || data.operations.length === 0) {
        container.innerHTML = '<div class="loading">Governance queue cleared</div>';
        return;
    }

    container.innerHTML = data.operations.map(op => {
        const isLinking = op.operationType === 'LINK_ASSET';
        // Use payload for linking operations, otherwise use custodyRecord
        const assetId = isLinking ? op.payload.assetId : (op.custodyRecord?.assetId || 'Unknown');
        const assetName = isLinking ? op.payload.assetName : (op.custodyRecord?.assetMetadata?.assetName || 'Institutional Asset');

        return `
        <div class="approval-item glass" style="margin-bottom: 0.5rem; padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-card);">
            <div>
                <div style="font-weight: 600;">${op.operationType} Request</div>
                <div class="sub-text">Asset: <strong>${assetId}</strong> ${assetName !== 'Institutional Asset' ? `• ${assetName}` : ''}</div>
                <div class="sub-text" style="font-size: 0.75rem; margin-top: 0.25rem;">Initiated by: ${op.initiatedBy.substring(0, 15)}...</div>
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-sm btn-secondary" onclick="processOp('${op.id}', 'reject')">Reject</button>
                <button class="btn btn-sm btn-primary" onclick="processOp('${op.id}', 'approve')">Authorize</button>
            </div>
        </div>
    `;
    }).join('');
}

async function loadAuditTrail() {
    const data = await apiCall('/audit/recent?limit=20');
    const container = document.getElementById('audit-list');
    if (!container) return;
    if (!data || !data.logs) return;

    container.innerHTML = data.logs.map(log => `
        <div class="audit-item glass" style="margin-bottom: 0.5rem; padding: 1rem; border-radius: 10px; border-left: 4px solid var(--primary); border: 1px solid var(--border); background: var(--bg-card);">
            <div style="display: flex; justify-content: space-between;">
                <strong>${log.eventType}</strong>
                <span class="sub-text">${formatDate(log.timestamp)}</span>
            </div>
            <div class="sub-text">Actor: ${log.actor}</div>
        </div>
    `).join('');
}

async function loadApiKeys() {
    const data = await apiCall('/auth/keys');
    const tbody = document.getElementById('api-keys-table-body');
    if (!tbody) return;
    if (!data || !data.keys) return;

    tbody.innerHTML = data.keys.map(k => `
        <tr>
            <td><code>${k.publicKey.substring(0, 12)}...</code></td>
            <td>${k.permissions.join(', ')}</td>
            <td><span class="badge ${k.isActive ? 'badge-success' : 'badge-danger'}">${k.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>Q4 2025</td>
            <td><button class="btn btn-sm btn-danger" onclick="revokeKey('${k.id}')">Revoke</button></td>
        </tr>
    `).join('');
}

// Actions
async function initiateOp(custodyRecordId, operationType) {
    if (operationType === 'MINT') {
        openMintModal(custodyRecordId);
        return;
    }

    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Processing...';

    const result = await apiCall('/operations', 'POST', { custodyRecordId, operationType, payload: {} });
    if (result) {
        showSuccess(`Governance request for ${operationType} submitted.`);
        loadViewData(currentView);
    } else {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function openMintModal(custodyRecordId) {
    document.getElementById('mint-custody-id').value = custodyRecordId;
    document.getElementById('mint-token-modal').classList.add('active');
}

function closeMintModal() {
    document.getElementById('mint-token-modal').classList.remove('active');
}

async function confirmMintToken() {
    const custodyRecordId = document.getElementById('mint-custody-id').value;
    const symbol = document.getElementById('mint-symbol-input').value.trim();
    const totalSupply = document.getElementById('mint-supply-input').value;
    const blockchainId = document.getElementById('mint-chain-select').value;

    if (!symbol || !totalSupply) return showError('Please fill all fields');

    const btn = document.getElementById('confirm-mint-btn');
    btn.disabled = true;
    btn.innerHTML = 'Submitting...';

    const payload = {
        symbol,
        totalSupply,
        blockchainId,
        decimals: 18,
        name: 'AssetLink Tokenized Asset'
    };

    const result = await apiCall('/operations', 'POST', {
        custodyRecordId,
        operationType: 'MINT',
        payload
    });

    if (result) {
        showSuccess(`Minting request for ${symbol} submitted for governance.`);
        closeMintModal();
        loadViewData(currentView);
    }

    btn.disabled = false;
    btn.innerHTML = 'Initiate Minting';
}

async function processOp(id, action) {
    const btn = event.target;
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = action === 'approve' ? 'Authorizing...' : 'Rejecting...';

    const result = await apiCall(`/operations/${id}/${action}`, 'POST');
    if (result) {
        showSuccess(`Operation ${action}d successfully`);
        loadApprovals();

        // Show live execution if approved and it's a mint/burn/transfer
        if (action === 'approve') {
            showProgressModal(id);
        }
    } else {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

let progressInterval = null;

async function showProgressModal(operationId) {
    const modal = document.getElementById('progress-modal');
    const stepsContainer = document.getElementById('execution-steps');
    const closeBtn = document.getElementById('close-progress-btn');

    modal.classList.add('active');
    stepsContainer.innerHTML = '<div class="loading">Initiating secure handover...</div>';
    closeBtn.disabled = true;
    closeBtn.textContent = 'Waiting for Finality...';

    if (progressInterval) clearInterval(progressInterval);

    const poll = async () => {
        const auditData = await apiCall(`/audit/operation/${operationId}`);
        const opData = await apiCall(`/operations/${operationId}`);

        if (auditData && auditData.logs) {
            renderExecutionSteps(auditData.logs);
        }

        if (opData && ['EXECUTED', 'FAILED', 'REJECTED'].includes(opData.status)) {
            // Check if it's actually finished (for MINT, EXECUTED means it might still be monitoring, 
            // but in our simulation it's fast. Let's look for TOKEN_MINTED in logs for better precision)
            const isFinished = opData.status === 'FAILED' || opData.status === 'REJECTED' ||
                (opData.status === 'EXECUTED' && auditData?.logs?.some(l => l.eventType === 'TOKEN_MINTED' || opData.operationType === 'LINK_ASSET'));

            if (isFinished) {
                clearInterval(progressInterval);
                closeBtn.disabled = false;
                closeBtn.innerHTML = '✔ Close Live Stream';
                loadViewData(currentView);
            }
        }
    };

    poll();
    progressInterval = setInterval(poll, 3000);
}

function renderExecutionSteps(logs) {
    const container = document.getElementById('execution-steps');
    if (!container) return;

    const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    container.innerHTML = sortedLogs.map(l => {
        let text = l.eventType.replace(/_/g, ' ');
        let meta = '';

        if (l.eventType === 'TOKEN_MINTED') {
            text = '✅ Minting Confirmed';
            meta = `TX: ${l.metadata.txHash ? l.metadata.txHash.substring(0, 20) + '...' : 'Confirmed'}`;
        } else if (l.eventType === 'ON_CHAIN_SUBMISSION') {
            text = '🛰️ Task Broadcasted to Network';
            meta = 'Awaiting inclusion in mempool...';
        } else if (l.eventType === 'BLOCK_PROPAGATION') {
            text = '⛓️ Block Propagation Started';
            meta = 'Syncing across distributed nodes...';
        } else if (l.eventType === 'FINALIZING_SETTLEMENT') {
            text = '⚖️ Finalizing Atomic Settlement';
            meta = 'Verifying consensus signatures...';
        } else if (l.eventType === 'OPERATION_EXECUTED') {
            text = '🔗 Fireblocks JWT Signed & Dispatched';
            meta = 'Handover to institutional node complete.';
        } else if (l.eventType === 'OPERATION_APPROVED') {
            text = '✍️ Checker Authorization Verified';
        } else if (l.eventType === 'OPERATION_FAILED') {
            text = '❌ Execution Failed';
            meta = l.metadata.error || 'Unknown error';
        }

        return `
            <div class="timeline-item">
                <div class="timeline-content">
                    <div class="timeline-time">${new Date(l.timestamp).toLocaleTimeString()}</div>
                    <div class="timeline-text">${text}</div>
                    ${meta ? `<div class="timeline-meta">${meta}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function closeProgressModal() {
    document.getElementById('progress-modal').classList.remove('active');
    if (progressInterval) clearInterval(progressInterval);
}


async function linkAsset() {
    const payload = {
        assetId: document.getElementById('asset-id-input').value.trim(),
        assetType: document.getElementById('asset-type-input').value,
        assetName: document.getElementById('asset-name-input').value.trim(),
        estimatedValue: document.getElementById('asset-value-input').value
    };

    if (!payload.assetId || !payload.assetName) return showError('Incomplete metadata');

    const result = await apiCall('/assets', 'POST', payload);
    if (result) {
        document.getElementById('link-asset-modal').classList.remove('active');
        showSuccess('Asset linking request submitted for governance approval.');
        if (currentView === 'custody') loadCustodyRecords();
    }
}

// Helpers
function initializeModals() {
    const modal = document.getElementById('link-asset-modal');
    if (!modal) return;

    const openBtn = document.getElementById('link-asset-btn');
    if (openBtn) openBtn.addEventListener('click', () => modal.classList.add('active'));

    modal.querySelector('.modal-close').addEventListener('click', () => modal.classList.remove('active'));
    document.getElementById('cancel-link-btn').addEventListener('click', () => modal.classList.remove('active'));
    document.getElementById('confirm-link-btn').addEventListener('click', linkAsset);

    // Mint Modal Confirm
    const confirmMintBtn = document.getElementById('confirm-mint-btn');
    if (confirmMintBtn) confirmMintBtn.addEventListener('click', confirmMintToken);
}

function initializeFilters() {
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) statusFilter.addEventListener('change', () => loadCustodyRecords());

    const searchInput = document.getElementById('asset-search');
    if (searchInput) {
        let timer;
        searchInput.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(() => loadCustodyRecords(), 600);
        });
    }
}

function renderRecentActivity(logs) {
    const container = document.getElementById('recent-activity');
    if (!container) return;
    container.innerHTML = logs.map(l => `
        <div class="activity-item glass" style="margin-bottom: 0.5rem; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card);">
            <div style="font-weight: 600;">${l.eventType.replace(/_/g, ' ')}</div>
            <div class="sub-text">${l.actor} • ${formatDate(l.timestamp)}</div>
        </div>
    `).join('');
}

function getStatusBadgeClass(s) {
    return { 'LINKED': 'badge-info', 'MINTED': 'badge-success', 'BURNED': 'badge-danger' }[s] || 'badge-info';
}

function formatDate(d) { return d ? new Date(d).toLocaleString() : '-'; }
function showError(m) { alert('System Notification: ' + m); }
function showSuccess(m) { alert('Authorization Success: ' + m); }

window.initiateOp = initiateOp;
window.processOp = processOp;
window.viewDetails = (id) => alert('Asset Reference: ' + id);
