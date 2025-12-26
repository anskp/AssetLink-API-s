// AssetLink Custody Dashboard
// API Configuration
const API_BASE = 'http://localhost:3000/v1';
const API_KEY = 'ak_897b8cb11c23e23'; // Replace with your actual API key
const API_SECRET = 'sk_4ee2'; // Replace with your actual secret

// State
let currentView = 'overview';
let currentRole = 'issuer'; // issuer, investor, checker

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
    roleSelect.addEventListener('change', (e) => {
        currentRole = e.target.value;
        updateUIForRole();
    });
    updateUIForRole();
}

function updateUIForRole() {
    // Show/hide sidebar controls
    document.getElementById('issuer-controls').style.display = currentRole === 'issuer' ? 'block' : 'none';
    document.getElementById('investor-controls').style.display = currentRole === 'investor' ? 'block' : 'none';
    document.getElementById('checker-controls').style.display = currentRole === 'checker' ? 'block' : 'none';

    // Show/hide action buttons
    const linkBtn = document.getElementById('link-asset-btn');
    linkBtn.style.display = currentRole === 'issuer' ? 'block' : 'none';

    // Switch view if current view is not allowed for role
    if (currentRole === 'checker' && currentView === 'marketplace') switchView('approvals');
    if (currentRole === 'investor' && currentView === 'asset-linking') switchView('marketplace');
    if (currentRole === 'issuer' && currentView === 'approvals') switchView('overview');
}

// Navigation
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            if (view === 'asset-linking') {
                document.getElementById('link-asset-btn').click();
                return;
            }
            switchView(view);
        });
    });
}

function switchView(view) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeNav = document.querySelector(`[data-view="${view}"]`);
    if (activeNav) activeNav.classList.add('active');

    // Update views
    document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
    });
    const targetView = document.getElementById(`${view}-view`);
    if (targetView) targetView.classList.add('active');

    // Update title
    const titles = {
        'overview': 'Overview',
        'custody': 'Custody Records',
        'audit': 'Audit Trail',
        'api-keys': 'API Keys',
        'marketplace': 'Token Marketplace',
        'approvals': 'Approval Queue'
    };
    document.getElementById('page-title').textContent = titles[view] || 'Dashboard';

    // Load data
    currentView = view;
    loadViewData(view);
}

function loadViewData(view) {
    switch (view) {
        case 'overview':
            loadOverview();
            break;
        case 'custody':
            loadCustodyRecords();
            break;
        case 'audit':
            loadAuditTrail();
            break;
        case 'api-keys':
            loadApiKeys();
            break;
        case 'marketplace':
            loadMarketplace();
            break;
        case 'approvals':
            loadApprovals();
            break;
    }
}

// API Functions
async function apiCall(endpoint, method = 'GET', body = null) {
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // Auth headers change based on role for testing maker-checker segregation
    // In a real app, this would be different API keys
    const headers = {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY, // We should use different keys for role testing if possible
        'X-TIMESTAMP': timestamp
    };

    // For testing segregation: If we are checker, use a different "key" suffix
    // Note: The middleware needs to actually support these keys
    if (currentRole === 'checker') {
        headers['X-API-KEY'] = API_KEY + '_CHECKER';
    }

    const options = {
        method,
        headers
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(API_BASE + endpoint, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `API Error: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        showError(error.message);
        return null;
    }
}

// Load Overview
async function loadOverview() {
    const stats = await apiCall('/custody/stats');
    if (stats) {
        document.getElementById('stat-total').textContent = stats.total || 0;
        document.getElementById('stat-linked').textContent = stats.linked || 0;
        document.getElementById('stat-minted').textContent = stats.minted || 0;
        document.getElementById('stat-withdrawn').textContent = stats.withdrawn || 0;
    }

    const auditLogs = await apiCall('/audit/recent?limit=10');
    if (auditLogs && auditLogs.logs) {
        renderRecentActivity(auditLogs.logs);
    }
}

// Marketplace
async function loadMarketplace() {
    const data = await apiCall('/custody?status=MINTED');
    const container = document.getElementById('marketplace-list');

    if (!data || !data.records || data.records.length === 0) {
        container.innerHTML = '<div class="loading">No tokens available in marketplace</div>';
        return;
    }

    container.innerHTML = data.records.map(record => `
        <div class="market-card">
            <div class="market-header">
                <h3>${record.assetId}</h3>
                <span class="badge badge-success">MINTED</span>
            </div>
            <div class="market-body">
                <p><strong>Blockchain:</strong> ${record.blockchain}</p>
                <p><strong>Token ID:</strong> ${record.tokenId}</p>
            </div>
            <div class="market-footer">
                <button class="btn btn-primary w-full" onclick="initiateOperation('${record.id}', 'TRANSFER')">
                    Buy Token
                </button>
            </div>
        </div>
    `).join('');
}

// Approvals Queue
async function loadApprovals() {
    const data = await apiCall('/operations?status=PENDING_CHECKER');
    const container = document.getElementById('approval-queue');

    if (!data || !data.operations || data.operations.length === 0) {
        container.innerHTML = '<div class="loading">No pending approvals</div>';
        return;
    }

    container.innerHTML = data.operations.map(op => `
        <div class="approval-item">
            <div class="approval-info">
                <strong>${op.operationType}</strong> for ${op.custodyRecord.assetId}
                <div class="sub-text">Initiated by: ${op.initiatedBy} • ${formatDate(op.createdAt)}</div>
            </div>
            <div class="approval-actions">
                <button class="btn btn-sm btn-secondary" onclick="rejectOperation('${op.id}')">Reject</button>
                <button class="btn btn-sm btn-primary" onclick="approveOperation('${op.id}')">Approve</button>
            </div>
        </div>
    `).join('');
}

// Operation Actions
async function initiateOperation(custodyRecordId, operationType) {
    if (operationType === 'MINT' && currentRole !== 'issuer') {
        showError('Only Issuers can initiate minting');
        return;
    }

    const payload = operationType === 'MINT' ? {
        blockchain: 'ETH',
        tokenStandard: 'ERC721'
    } : {};

    const result = await apiCall('/operations', 'POST', {
        custodyRecordId,
        operationType,
        payload
    });

    if (result) {
        showSuccess(`${operationType} operation initiated and sent for approval`);
        loadViewData(currentView);
    }
}

async function approveOperation(id) {
    const result = await apiCall(`/operations/${id}/approve`, 'POST');
    if (result) {
        showSuccess('Operation approved and executed');
        loadApprovals();
    }
}

async function rejectOperation(id) {
    const reason = prompt('Reason for rejection:');
    if (reason === null) return;

    const result = await apiCall(`/operations/${id}/reject`, 'POST', { reason });
    if (result) {
        showSuccess('Operation rejected');
        loadApprovals();
    }
}

// Existing Loaders Updated
async function loadCustodyRecords() {
    const status = document.getElementById('status-filter').value;
    const type = document.getElementById('type-filter').value;
    const search = document.getElementById('asset-search').value;

    let endpoint = '/custody';
    let params = [];
    if (status) params.push(`status=${status}`);

    if (search || type) {
        endpoint = '/assets/search';
        if (type) params.push(`assetType=${type}`);
    }

    const queryString = params.length > 0 ? `?${params.join('&')}` : '';
    const data = await apiCall(endpoint + queryString);

    if (data) {
        const records = data.records || (data.assets ? data.assets.map(a => ({
            ...a.custodyRecord,
            assetMetadata: a
        })) : []);
        renderCustodyRecords(records);
    }
}

function renderCustodyRecords(records) {
    const tbody = document.getElementById('custody-table-body');
    if (!records || records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">No custody records found</td></tr>';
        return;
    }

    tbody.innerHTML = records.map(record => `
        <tr>
            <td>
                <strong>${record.assetId}</strong>
                ${record.assetMetadata ? `<div class="sub-text">${record.assetMetadata.assetName}</div>` : ''}
            </td>
            <td><span class="badge ${getStatusBadgeClass(record.status)}">${record.status}</span></td>
            <td>${record.blockchain || '-'}</td>
            <td>${record.tokenId || '-'}</td>
            <td>${formatDate(record.linkedAt)}</td>
            <td>
                <div class="row-actions">
                    ${currentRole === 'issuer' && record.status === 'LINKED' ?
            `<button class="btn btn-sm btn-primary" onclick="initiateOperation('${record.id}', 'MINT')">Mint</button>` : ''}
                    ${currentRole === 'investor' && record.status === 'MINTED' ?
            `<button class="btn btn-sm btn-danger" onclick="initiateOperation('${record.id}', 'BURN')">Redeem</button>` : ''}
                    <button class="btn btn-sm btn-secondary" onclick="viewCustodyDetails('${record.id}')">View</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Standard helper updates ...
function initializeModals() {
    const linkAssetBtn = document.getElementById('link-asset-btn');
    const linkAssetModal = document.getElementById('link-asset-modal');
    const cancelLinkBtn = document.getElementById('cancel-link-btn');
    const confirmLinkBtn = document.getElementById('confirm-link-btn');
    const modalClose = linkAssetModal.querySelector('.modal-close');

    linkAssetBtn.addEventListener('click', () => linkAssetModal.classList.add('active'));

    const closeLinkModal = () => {
        linkAssetModal.classList.remove('active');
        document.getElementById('asset-id-input').value = '';
    };

    [cancelLinkBtn, modalClose].forEach(btn => btn.addEventListener('click', closeLinkModal));
    confirmLinkBtn.addEventListener('click', linkAsset);
}

async function linkAsset() {
    const assetId = document.getElementById('asset-id-input').value.trim();
    const assetType = document.getElementById('asset-type-input').value;
    const assetName = document.getElementById('asset-name-input').value.trim();
    const estimatedValue = document.getElementById('asset-value-input').value;

    if (!assetId || !assetName || !estimatedValue) {
        showError('Required fields missing');
        return;
    }

    const result = await apiCall('/assets', 'POST', {
        assetId, assetType, assetName, estimatedValue
    });

    if (result) {
        document.getElementById('link-asset-modal').classList.remove('active');
        showSuccess('Asset linked successfully!');
        loadViewData(currentView);
    }
}

function initializeFilters() {
    ['status-filter', 'type-filter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', () => loadCustodyRecords());
    });

    const search = document.getElementById('asset-search');
    if (search) {
        let timeout;
        search.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => loadCustodyRecords(), 500);
        });
    }
}

function renderRecentActivity(logs) {
    const container = document.getElementById('recent-activity');
    if (!logs || logs.length === 0) {
        container.innerHTML = '<div class="loading">No recent activity</div>';
        return;
    }
    container.innerHTML = logs.map(log => `
        <div class="activity-item">
            <div class="activity-icon">${getEventIcon(log.eventType)}</div>
            <div class="activity-content">
                <div class="activity-title">${log.eventType.replace(/_/g, ' ')}</div>
                <div class="activity-meta">${log.actor} • ${formatDate(log.timestamp)}</div>
            </div>
        </div>
    `).join('');
}

function getEventIcon(eventType) {
    const icons = {
        'ASSET_LINKED': '🔗', 'TOKEN_MINTED': '🪙', 'TOKEN_TRANSFERRED': '📤',
        'TOKEN_BURNED': '🔥', 'OPERATION_CREATED': '📝', 'OPERATION_APPROVED': '✅',
        'OPERATION_REJECTED': '❌', 'ASSET_VERIFIED': '⚖️'
    };
    return icons[eventType] || '📋';
}

function getStatusBadgeClass(status) {
    return { 'LINKED': 'badge-info', 'MINTED': 'badge-success', 'WITHDRAWN': 'badge-warning', 'BURNED': 'badge-danger' }[status] || 'badge-info';
}

function formatDate(date) { return date ? new Date(date).toLocaleString() : '-'; }
function showError(m) { alert('Error: ' + m); }
function showSuccess(m) { alert('Success: ' + m); }
function loadAuditTrail() { /* Implementation skipped for brevity, similar to others */ }
function loadApiKeys() { /* Implementation skipped for brevity */ }
