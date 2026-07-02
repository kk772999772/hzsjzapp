// ============ Data & Configuration (Default Fallbacks) ============
const DEFAULT_CONFIG = {
  VILLAGES: {
    "分类一": [
      "张三", "李四", "王五", "赵六", "钱七", "孙八", "周九", "吴十", "郑十一", 
      "王建国", "李华", "张伟", "刘洋", "陈静", "张敏", "李丽", "王强", "张华", 
      "李杰", "黄涛", "周军", "吴涛", "徐超", "朱军"
    ],
    "分类二": [
      "马辉", "胡勇", "林峰", "高明", "曹磊", "唐龙", "彭飞", "潘宇", "董成", 
      "崔洋", "闫杰"
    ],
    "分类三": [
      "金辉", "曾勇", "蔡新", "袁超", "沈明", "韩毅", "陆涛", "贾亮", "夏伟", 
      "何平", "罗俊", "薛飞", "范龙", "廖军"
    ],
    "分类四": [
      "邹豪", "熊武", "杜斌", "徐胜", "朱超", "杨林", "肖亮"
    ]
  },
  PROJECTS: {
    "草莓": { icon: "🍓", color: "#f43f5e" },
    "黄烟": { icon: "🍂", color: "#b45309" },
    "梨子": { icon: "🍐", color: "#84cc16" },
    "麦子": { icon: "🌾", color: "#eab308" },
    "地瓜": { icon: "🍠", color: "#8b5cf6" },
    "玉米": { icon: "🌽", color: "#f97316" },
    "其他": { icon: "📌", color: "#64748b" }
  },
  PERIODS: ["上午", "下午", "全天"],
  WORK_HOURS: [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0],
  DAILY_WAGES: [70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120],
  STANDARD_HOURS: [8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0],
  AUTH_PASSWORD: '123123'
};

// Mutable Global Config Variables loaded dynamically
let VILLAGES = {};
let PROJECTS = {};
let PERIODS = [];
let WORK_HOURS = [];
let DAILY_WAGES = [];
let STANDARD_HOURS = [];
let AUTH_PASSWORD = '123123';

// Current Active Config state object
let activeConfig = null;

// State Variables
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1; // 1-12
let records = [];
let chart = null;
let selectedVillage = "分类一";
let selectedNames = [];
let tempSelectedNames = [];
let selectedProject = "";
let budget = 0;
let pendingAction = null;
let selectedReportRecordIds = [];

// API Configuration (Proxied via Cloudflare Pages reverse proxy in production)
let apiBaseUrl = window.location.origin;
if (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  apiBaseUrl = 'http://127.0.0.1:8787'; // Fallback for local testing
}
let isOnline = false;

// ============ Initialization ============
document.addEventListener("DOMContentLoaded", () => {
  init();
});

async function init() {
  // Set default date in form to today
  document.getElementById('date').value = todayStr();
  
  // Load configuration parameters
  await loadAppConfig();
  
  // Render configuration-dependent inputs
  renderConfiguredInputs();

  // Render static options
  setupVillageTabs();
  renderNameDropdownOptions();
  setupProjectChips();

  // Load and render data
  await refreshData();

  // Setup Event Listeners
  setupFormListeners();

  // Check and display PWA shortcut banner on mobile devices
  checkMobileBanner();
}

async function loadAppConfig() {
  let loadedConfig = null;
  
  // Try to load cached config from localStorage first for instant display
  const cached = localStorage.getItem('jizhang_config');
  if (cached) {
    try {
      loadedConfig = JSON.parse(cached);
    } catch (e) {
      console.error("Failed to parse cached config", e);
    }
  }

  // Check API connection
  await checkApiConnection();

  if (isOnline) {
    try {
      const res = await fetch(`${apiBaseUrl}/api/config`);
      if (res.ok) {
        const cloudConfig = await res.json();
        if (cloudConfig && cloudConfig.VILLAGES && Object.keys(cloudConfig.VILLAGES).length > 0) {
          loadedConfig = cloudConfig;
          localStorage.setItem('jizhang_config', JSON.stringify(loadedConfig));
        }
      }
    } catch (e) {
      console.error("Failed to fetch config from API", e);
    }
  }

  // Fallback to local config.json file
  if (!loadedConfig) {
    try {
      const res = await fetch('./config.json');
      if (res.ok) {
        loadedConfig = await res.json();
        localStorage.setItem('jizhang_config', JSON.stringify(loadedConfig));
      }
    } catch (e) {
      console.error("Failed to fetch local config.json", e);
    }
  }

  // Fallback to hardcoded default config
  if (!loadedConfig) {
    loadedConfig = DEFAULT_CONFIG;
  }

  // Apply configuration ensuring all parameters exist
  activeConfig = {
    VILLAGES: loadedConfig.VILLAGES || DEFAULT_CONFIG.VILLAGES,
    PROJECTS: loadedConfig.PROJECTS || DEFAULT_CONFIG.PROJECTS,
    PERIODS: loadedConfig.PERIODS || DEFAULT_CONFIG.PERIODS,
    WORK_HOURS: loadedConfig.WORK_HOURS || DEFAULT_CONFIG.WORK_HOURS,
    DAILY_WAGES: loadedConfig.DAILY_WAGES || DEFAULT_CONFIG.DAILY_WAGES,
    STANDARD_HOURS: loadedConfig.STANDARD_HOURS || DEFAULT_CONFIG.STANDARD_HOURS,
    AUTH_PASSWORD: loadedConfig.AUTH_PASSWORD || DEFAULT_CONFIG.AUTH_PASSWORD
  };

  VILLAGES = activeConfig.VILLAGES;
  PROJECTS = activeConfig.PROJECTS;
  PERIODS = activeConfig.PERIODS;
  WORK_HOURS = activeConfig.WORK_HOURS;
  DAILY_WAGES = activeConfig.DAILY_WAGES;
  STANDARD_HOURS = activeConfig.STANDARD_HOURS;
  AUTH_PASSWORD = activeConfig.AUTH_PASSWORD;

  // Validate state selections against loaded values
  const villageNames = Object.keys(VILLAGES);
  if (villageNames.length > 0) {
    if (!villageNames.includes(selectedVillage)) {
      selectedVillage = villageNames[0];
    }
  } else {
    selectedVillage = "";
  }

  const projectNames = Object.keys(PROJECTS);
  if (selectedProject !== "" && !projectNames.includes(selectedProject)) {
    selectedProject = "";
  }
}

function renderPanelButtons(inputId, panelId, optionsArray) {
  const input = document.getElementById(inputId);
  const panel = document.getElementById(panelId);
  if (!input || !panel) return;

  const currentVal = parseFloat(input.value);
  panel.innerHTML = optionsArray.map(val => {
    const isActive = !isNaN(currentVal) && currentVal === val;
    return `<button type="button" class="option-btn${isActive ? ' active' : ''}" data-val="${val}">${val}</button>`;
  }).join('');
}

function renderConfiguredInputs() {
  // 1. Render Period select dropdown
  const periodSelect = document.getElementById('period');
  if (periodSelect) {
    const prevVal = periodSelect.value;
    periodSelect.innerHTML = '<option value="" disabled selected hidden>请选择</option>' + 
      PERIODS.map(p => `<option value="${p}">${p}</option>`).join('');
    if (prevVal && PERIODS.includes(prevVal)) {
      periodSelect.value = prevVal;
    } else {
      periodSelect.value = "";
    }
  }

  // 2. Render Work Hours custom panel buttons
  renderPanelButtons('workHours', 'workHoursPanel', WORK_HOURS);

  // 3. Render Daily Wages custom panel buttons
  renderPanelButtons('dailyWage', 'dailyWagePanel', DAILY_WAGES);

  // 4. Render Standard Hours custom panel buttons
  renderPanelButtons('standardHours', 'standardHoursPanel', STANDARD_HOURS);
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ============ API Client ============
async function checkApiConnection() {
  const testUrl = `${apiBaseUrl}/api/settings`;
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000); // 3s timeout
    const res = await fetch(testUrl, { signal: controller.signal });
    clearTimeout(id);
    if (res.ok) {
      isOnline = true;
      updateApiStatus(true, "云端数据库已连接");
      return true;
    }
  } catch (e) {
    console.error("D1 database Worker connection failed:", e);
  }
  isOnline = false;
  updateApiStatus(false, "云端连接失败，请检查网络");
  return false;
}

function updateApiStatus(online, text) {
  const badge = document.getElementById('apiStatusBadge');
  badge.className = `api-status-badge ${online ? 'online' : 'offline'}`;
  badge.innerHTML = `<span class="dot">●</span> ${text}`;
}

async function refreshData() {
  showLoading();
  await loadRecords();
  renderAll();
  hideLoading();
}

async function loadRecords() {
  if (isOnline) {
    try {
      const url = `${apiBaseUrl}/api/records?year=${currentYear}&month=${currentMonth}`;
      const res = await fetch(url);
      if (res.ok) {
        records = await res.json();
        return;
      }
    } catch (e) {
      console.error("Fetch records from D1 failed", e);
    }
  }
  records = []; // Clear records list if offline
}

// ============ UI Renderers ============
function renderAll() {
  updateMonthDisplay();
  renderSummary();
  renderRecordList();
  renderCharts();
}

function updateMonthDisplay() {
  document.getElementById('currentMonth').textContent = `${currentYear}年${currentMonth}月`;
}

function renderSummary() {
  // Sum up total money in current filtered list
  const totalAmount = records.reduce((s, r) => s + r.amount, 0);
  document.getElementById('monthTotalAmount').textContent = '¥' + totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getPeriodBadgeHtml(period) {
  if (!period) return '';
  let color = '#64748b'; // default gray
  if (period === '上午') color = '#0284c7'; // Blue
  else if (period === '下午') color = '#d97706'; // Amber/Orange
  else if (period === '全天') color = '#4f46e5'; // Indigo
  
  return `<span>·</span> <span style="color: ${color}; font-weight: 700; background: ${color}12; padding: 0.05rem 0.3rem; border-radius: 4px; font-size: 0.68rem;">${period}</span>`;
}

function renderRecordList() {
  const list = document.getElementById('recordList');
  const query = document.getElementById('searchRecordInput').value.trim().toLowerCase();
  
  // Filter records based on search input
  const filtered = records.filter(r => {
    if (!query) return true;
    return r.name.toLowerCase().includes(query) || 
           r.village.toLowerCase().includes(query) || 
           r.project.toLowerCase().includes(query) || 
           (r.note && r.note.toLowerCase().includes(query));
  });

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="emoji">📭</span>
        <p>本月没有符合条件的记录～</p>
      </div>
    `;
    return;
  }

  // Sort by date descending, then id descending
  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);

  list.innerHTML = sorted.map(r => {
    const proj = PROJECTS[r.project] || { icon: "📌", color: "#adb5bd" };
    const dObj = new Date(r.date);
    const dateStr = `${String(dObj.getMonth()+1).padStart(2,'0')}-${String(dObj.getDate()).padStart(2,'0')}`;
    
    return `
      <div class="record-item" data-record-id="${r.id}" data-from-report="false" style="cursor: pointer;">
        <div class="project-icon" style="background:${proj.color}15; color:${proj.color}">${proj.icon}</div>
        <div class="info" style="display: flex; flex-direction: column; gap: 0.15rem;">
          <!-- Row 1: 姓名 村庄 项目 -->
          <div class="line-1" style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; margin-bottom: 0;">
            <span class="name" style="font-size: 0.85rem; font-weight: 700; color: var(--text-dark);">${r.name}</span>
            <span class="village-badge" style="font-size: 0.7rem; font-weight: 500; padding: 0.05rem 0.3rem; border-radius: 4px; background: #e2e8f0; color: var(--text-muted);">${r.village}</span>
            <span class="project-badge" style="font-size: 0.7rem; font-weight: 600; padding: 0.05rem 0.3rem; border-radius: 4px; background: ${proj.color}15; color: ${proj.color};">${r.project}</span>
          </div>
          <!-- Row 2: 月日 时段 工时 -->
          <div class="line-2" style="font-size: 0.72rem; color: var(--text-light); display: flex; gap: 0.35rem; align-items: center;">
            <span style="font-weight: 500;">${dateStr}</span>
            ${getPeriodBadgeHtml(r.period)}
            ${r.work_hours ? `<span>·</span> <span class="price-weight" style="color: var(--primary-text); font-weight: 600;">工时: ${r.work_hours}时</span>` : ''}
          </div>
          <!-- Row 3: 日薪 标时 -->
          <div class="line-3" style="font-size: 0.72rem; color: var(--text-light); display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
            ${r.daily_wage ? `<span class="price-weight" style="color: var(--primary-text); font-weight: 600;">日薪: ${r.daily_wage}元</span>` : ''}
            ${r.standard_hours ? `<span>·</span> <span class="price-weight" style="color: var(--primary-text); font-weight: 600;">标时: ${r.standard_hours}时</span>` : ''}
            ${r.note ? `<span>·</span> <span style="font-style: italic; color: #71717a;">备注: ${r.note}</span>` : ''}
          </div>
        </div>
        <div class="amount">¥${r.amount.toFixed(2)}</div>
        <span class="more-btn" onclick="openRecordDetailModal('${r.id}', false)">⋮</span>
      </div>
    `;
  }).join('');
}

// ============ Form Dynamism ============
function setupVillageTabs() {
  const container = document.getElementById('villageTabs');
  container.innerHTML = Object.keys(VILLAGES).map(v => 
    `<button class="village-tab ${v === selectedVillage ? 'active' : ''}" onclick="selectVillage('${v}')">${v}</button>`
  ).join('');
}

function selectVillage(v) {
  selectedVillage = v;
  setupVillageTabs();
  
  // Re-render names list under the newly selected village, preserving tempSelectedNames
  renderNameDropdownOptions();
  document.getElementById('nameSearchInput').value = '';
}

function renderNameDropdownOptions() {
  const grid = document.getElementById('namesOptionsGrid');
  const searchVal = document.getElementById('nameSearchInput').value.trim().toLowerCase();
  
  const names = VILLAGES[selectedVillage].filter(n => !searchVal || n.toLowerCase().includes(searchVal));
  
  if (names.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:1rem; font-size:0.75rem; color:var(--text-light);">无匹配姓名</div>';
    return;
  }

  grid.innerHTML = names.map(name => {
    const isSelected = tempSelectedNames.includes(name);
    return `
      <div class="name-option-badge ${isSelected ? 'selected' : ''}" onclick="toggleNameSelection('${name}')">
        ${isSelected ? '✓ ' : ''}${name}
      </div>
    `;
  }).join('');
}

function toggleNameSelection(name) {
  const index = tempSelectedNames.indexOf(name);
  if (index > -1) {
    tempSelectedNames.splice(index, 1);
  } else {
    tempSelectedNames.push(name);
  }
  renderNameDropdownOptions();
  updateNamesSelectionCounts();
}

function updateSelectedNamesUI() {
  const trigger = document.getElementById('namesSelectTrigger');
  
  if (selectedNames.length === 0) {
    trigger.innerHTML = `<span class="placeholder">选择人员</span>`;
    return;
  }
  
  trigger.innerHTML = selectedNames.map(name => `
    <span class="selected-name-badge">
      ${name}
      <span class="remove" onclick="event.stopPropagation(); removeNameBadge('${name}')">×</span>
    </span>
  `).join('');
}

function removeNameBadge(name) {
  selectedNames = selectedNames.filter(n => n !== name);
  tempSelectedNames = tempSelectedNames.filter(n => n !== name);
  updateSelectedNamesUI();
  renderNameDropdownOptions();
  updateNamesSelectionCounts();
}

function updateNamesSelectionCounts() {
  const badge = document.getElementById('selectedCountBadge');
  if (badge) {
    if (selectedNames.length > 0) {
      badge.textContent = `(已选 ${selectedNames.length} 人)`;
      badge.style.display = 'inline';
    } else {
      badge.style.display = 'none';
    }
  }

  const tempBadge = document.getElementById('tempSelectedCount');
  if (tempBadge) {
    tempBadge.textContent = `已选 ${tempSelectedNames.length} 人`;
  }
}

function setupProjectChips() {
  const container = document.getElementById('projectChips');
  container.innerHTML = Object.entries(PROJECTS).map(([projName, val]) => {
    const isSelected = projName === selectedProject;
    const styleAttr = isSelected ? `style="border-color: ${val.color}; color: ${val.color}; background: ${val.color}15;"` : '';
    return `
      <div class="project-chip ${isSelected ? 'selected' : ''}" 
           data-project="${projName}" 
           ${styleAttr}
           onclick="selectProject('${projName}')">
        <span class="icon">${val.icon}</span>
        <span>${projName}</span>
      </div>
    `;
  }).join('');
}

function selectProject(projName) {
  selectedProject = projName;
  setupProjectChips();
}

function openNamesDropdown() {
  const trigger = document.getElementById('namesSelectTrigger');
  const panel = document.getElementById('namesDropdownPanel');
  
  tempSelectedNames = [...selectedNames];
  renderNameDropdownOptions();
  updateNamesSelectionCounts();
  trigger.classList.add('open');
  panel.classList.add('show');
  
  // Slide up header and pin month-nav at top
  document.body.classList.add('names-dropdown-open');
}

function setupFormListeners() {
  // Toggle Names Custom Dropdown
  const trigger = document.getElementById('namesSelectTrigger');
  const panel = document.getElementById('namesDropdownPanel');
  
  trigger.addEventListener('click', (e) => {
    if (!panel.classList.contains('show')) {
      openNamesDropdown();
    } else {
      trigger.classList.remove('open');
      panel.classList.remove('show');
      document.body.classList.remove('names-dropdown-open');
    }
  });

  // Prevent clicks inside the dropdown panel from bubbling up to document (prevents auto-closing on DOM updates)
  panel.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!trigger.contains(e.target) && !panel.contains(e.target)) {
      trigger.classList.remove('open');
      panel.classList.remove('show');
      document.body.classList.remove('names-dropdown-open');
    }
  });

  // Filter names in dropdown
  document.getElementById('nameSearchInput').addEventListener('input', () => {
    renderNameDropdownOptions();
  });

  // Wage auto-calculation logic (Wage = (workHours / standardHours) * dailyWage)
  const workHoursInput = document.getElementById('workHours');
  const dailyWageInput = document.getElementById('dailyWage');
  const standardHoursInput = document.getElementById('standardHours');
  const amountInput = document.getElementById('amount');

  const calculateWage = () => {
    const hours = parseFloat(workHoursInput.value);
    const wage = parseFloat(dailyWageInput.value);
    const std = parseFloat(standardHoursInput.value);

    if (!isNaN(hours) && !isNaN(wage) && !isNaN(std) && std > 0) {
      const calculatedAmount = (hours / std) * wage;
      amountInput.value = calculatedAmount.toFixed(2);
    }
  };

  workHoursInput.addEventListener('input', calculateWage);
  dailyWageInput.addEventListener('input', calculateWage);
  standardHoursInput.addEventListener('input', calculateWage);

  // Custom segment picker panels interaction logic
  const pickers = [
    { id: 'workHours', panelId: 'workHoursPanel', getOptions: () => WORK_HOURS },
    { id: 'dailyWage', panelId: 'dailyWagePanel', getOptions: () => DAILY_WAGES },
    { id: 'standardHours', panelId: 'standardHoursPanel', getOptions: () => STANDARD_HOURS }
  ];

  pickers.forEach(picker => {
    const input = document.getElementById(picker.id);
    const trigger = document.getElementById(picker.id + 'Trigger');
    const panel = document.getElementById(picker.panelId);
    if (!input || !panel || !trigger) return;

    // Show panel
    const showPanel = (e) => {
      e.stopPropagation();
      // Hide all other panels first
      document.querySelectorAll('.custom-options-panel').forEach(p => {
        if (p !== panel) p.classList.remove('show');
      });
      // Re-render buttons to ensure active state matches input value
      renderPanelButtons(picker.id, picker.panelId, picker.getOptions());
      
      // Calculate dynamic position relative to trigger button
      const triggerRect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const panelWidth = Math.min(viewportWidth * 0.8, 480);
      
      panel.style.width = `${panelWidth}px`;
      panel.style.left = `${(viewportWidth - panelWidth) / 2}px`; // Centered on screen
      panel.style.top = `${triggerRect.bottom + 4}px`;
      
      panel.classList.add('show');
    };

    // Right trigger button click -> opens panel (no keyboard)
    trigger.addEventListener('click', showPanel);

    // Focus left input field -> hide the option panel (prevent overlap with keyboard)
    input.addEventListener('focus', () => {
      panel.classList.remove('show');
    });

    // Handle button clicks in panel
    panel.addEventListener('click', (e) => {
      e.stopPropagation();
      const btn = e.target.closest('.option-btn');
      if (btn) {
        const val = btn.getAttribute('data-val');
        input.value = val;
        panel.classList.remove('show');
        calculateWage();
        
        // Trigger input event to update indicators
        input.dispatchEvent(new Event('input'));
      }
    });

    // Close panel on Enter or Escape keys
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        panel.classList.remove('show');
      }
    });

    // Update active button state on input change
    input.addEventListener('input', () => {
      const currentVal = parseFloat(input.value);
      panel.querySelectorAll('.option-btn').forEach(btn => {
        const btnVal = parseFloat(btn.getAttribute('data-val'));
        if (!isNaN(currentVal) && currentVal === btnVal) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    });
  });

  // Close all panels when clicking outside
  document.addEventListener('click', (e) => {
    document.querySelectorAll('.custom-options-panel').forEach(panel => {
      const wrapper = panel.closest('.dropdown-wrapper');
      if (wrapper && !wrapper.contains(e.target)) {
        panel.classList.remove('show');
      }
    });
  });
}

// Name dropdown helper actions
function selectAllNames() {
  const allCurrent = VILLAGES[selectedVillage];
  // If search matches subset, select only searched subset
  const searchVal = document.getElementById('nameSearchInput').value.trim().toLowerCase();
  const filtered = allCurrent.filter(n => !searchVal || n.toLowerCase().includes(searchVal));
  
  filtered.forEach(name => {
    if (!tempSelectedNames.includes(name)) {
      tempSelectedNames.push(name);
    }
  });
  
  renderNameDropdownOptions();
  updateNamesSelectionCounts();
}

function clearAllNames() {
  tempSelectedNames = [];
  renderNameDropdownOptions();
  updateNamesSelectionCounts();
}

function confirmNameSelection() {
  selectedNames = [...tempSelectedNames];
  updateSelectedNamesUI();
  updateNamesSelectionCounts();
  
  // Close dropdown panel
  const trigger = document.getElementById('namesSelectTrigger');
  const panel = document.getElementById('namesDropdownPanel');
  trigger.classList.remove('open');
  panel.classList.remove('show');
  
  // Restore normal page layout
  document.body.classList.remove('names-dropdown-open');
}

// ============ Actions ============
function getVillageOfName(name) {
  for (const [village, names] of Object.entries(VILLAGES)) {
    if (names.includes(name)) {
      return village;
    }
  }
  return selectedVillage; // Fallback
}

async function addRecords() {
  const date = document.getElementById('date').value;
  const amountVal = document.getElementById('amount').value;
  const note = document.getElementById('note').value.trim();
  const period = document.getElementById('period').value;
  const workHoursVal = document.getElementById('workHours').value;
  const dailyWageVal = document.getElementById('dailyWage').value;
  const standardHoursVal = document.getElementById('standardHours').value;

  if (!isOnline) {
    alert("保存失败：云端数据库未连接，请检查您的网络！");
    return;
  }
  if (selectedNames.length === 0) {
    alert("请至少选择一个姓名！");
    return;
  }
  if (!selectedProject) {
    alert("请选择项目！");
    return;
  }
  if (!period) {
    alert("请选择时段！");
    return;
  }
  if (workHoursVal === '' || isNaN(parseFloat(workHoursVal)) || parseFloat(workHoursVal) <= 0) {
    alert("请输入有效工时！");
    return;
  }
  if (!amountVal || isNaN(parseFloat(amountVal)) || parseFloat(amountVal) < 0) {
    alert("请输入有效金额！");
    return;
  }
  if (!date) {
    alert("请选择日期！");
    return;
  }

  // Password authorization check
  if (!checkAuth()) {
    return;
  }

  const amount = parseFloat(amountVal);
  const work_hours = workHoursVal !== '' ? parseFloat(workHoursVal) : null;
  const daily_wage = dailyWageVal !== '' ? parseFloat(dailyWageVal) : null;
  const standard_hours = standardHoursVal !== '' ? parseFloat(standardHoursVal) : null;

  // Render HTML confirmation message with larger, color-coded, and highly readable styles
  const title = `确认保存：${selectedProject}`;
  const msg = `
    <div style="font-size: 1rem; line-height: 1.8; text-align: left; padding: 0.2rem 0.5rem; color: #1e293b;">
      <div style="margin-bottom: 0.5rem; display: flex; align-items: baseline;">
        <span style="color: #64748b; font-weight: 500; min-width: 90px; display: inline-block;">👤 人员：</span>
        <span style="color: #0f172a; font-weight: 700; font-size: 1.05rem;">${selectedNames.join('、')}</span>
      </div>
      <div style="margin-bottom: 0.5rem;">
        <span style="color: #64748b; font-weight: 500; min-width: 90px; display: inline-block;">📅 日期：</span>
        <span style="color: #334155; font-weight: 600;">${date} (${period})</span>
      </div>
      <div style="margin-bottom: 0.5rem;">
        <span style="color: #64748b; font-weight: 500; min-width: 90px; display: inline-block;">⏱️ 工时：</span>
        <span style="color: #334155; font-weight: 600;">${workHoursVal ? workHoursVal + ' 小时' : '未填写'}</span>
      </div>
      <div style="margin-bottom: 0.6rem; padding-bottom: 0.6rem; border-bottom: 1px dashed #cbd5e1;">
        <span style="color: #64748b; font-weight: 500; min-width: 90px; display: inline-block;">💵 标准：</span>
        <span style="color: #475569; font-weight: 600;"> ${dailyWageVal || '80'} 元/天，日工作 ${standardHoursVal || '8'} 时</span>
      </div>
      <div style="margin-top: 0.8rem; display: flex; align-items: baseline;">
        <span style="color: #475569; font-weight: 700; font-size: 1.1rem; min-width: 90px; display: inline-block;">💰 录入金额：</span>
        <span style="color: #10b981; font-weight: 800; font-size: 1.6rem; margin-left: 0.2rem; text-shadow: 0 1px 2px rgba(16,185,129,0.1);">¥${amount.toFixed(2)}</span>
      </div>
    </div>
  `;

  showModal(title, msg, async () => {
    showLoading();
    try {
      // Group selected names by their corresponding village
      const groups = {};
      selectedNames.forEach(name => {
        const v = getVillageOfName(name);
        if (!groups[v]) {
          groups[v] = [];
        }
        groups[v].push(name);
      });

      const url = `${apiBaseUrl}/api/records`;
      const requests = Object.entries(groups).map(([v, namesList]) => {
        return fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date,
            village: v,
            names: namesList,
            project: selectedProject,
            price: null,
            weight: null,
            amount,
            note,
            period,
            work_hours,
            daily_wage,
            standard_hours
          })
        });
      });

      const responses = await Promise.all(requests);
      const allOk = responses.every(res => res.ok);

      if (allOk) {
        await refreshData();
        resetForm();
        showToast("已成功保存记录");
      } else {
        alert("保存失败：部分请求发生服务器错误");
      }
    } catch (e) {
      console.error("Cloudflare Worker insert failed", e);
      alert("保存失败：网络连接异常，无法连通云端数据库");
    }
    hideLoading();
  }, '确定', '返回修改');
}

function resetForm() {
  selectedNames = [];
  tempSelectedNames = [];
  selectedProject = "";
  setupProjectChips();
  updateSelectedNamesUI();
  renderNameDropdownOptions();
  updateNamesSelectionCounts();
  
  document.getElementById('amount').value = '';
  document.getElementById('note').value = '';
  document.getElementById('date').value = todayStr();
  document.getElementById('period').value = '';
  document.getElementById('workHours').value = '';
  document.getElementById('dailyWage').value = '80';
  document.getElementById('standardHours').value = '8';
}

async function deleteRecord(id, name) {
  if (!isOnline) {
    showToast("删除失败：云端数据库未连接！", true);
    return;
  }
  if (!checkAuth()) {
    return;
  }
  showLoading();
  try {
    const url = `${apiBaseUrl}/api/records/${id}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) {
      await refreshData();
      showToast(`已删除${name}记录`, false, 3000);
    } else {
      showToast("删除失败：服务器错误", true);
    }
  } catch (e) {
    console.error("Delete record from database failed", e);
    showToast("删除失败：网络通信异常", true);
  }
  hideLoading();
}

async function clearMonth() {
  if (!isOnline) {
    alert("清空失败：云端数据库未连接！");
    return;
  }
  
  // Modal 1: Initial warning dialog
  showModal('清空本月记录', `确定要删除 ${currentYear}年${currentMonth}月 的所有云端记录吗？此操作不可恢复。`, () => {
    // Modal 2: Hard confirmation block
    setTimeout(() => {
      showModal(
        '⚠️ 警告：危险操作再次确认', 
        `<div style="text-align: left; font-size: 0.95rem; line-height: 1.6;">
          <span style="color: #ef4444; font-weight: 700; font-size: 1.05rem;">您真的要彻底清除 ${currentYear}年${currentMonth}月 的所有云端数据吗？</span><br>
          此操作将永久抹除本月所有人员的记账数据，无法撤销！
        </div>`, 
        async () => {
          // Verify password on the final confirmation step
          if (!checkAuth()) {
            return;
          }
          
          showLoading();
          try {
            const deletePromises = records.map(r => {
              const url = `${apiBaseUrl}/api/records/${r.id}`;
              return fetch(url, { method: 'DELETE' });
            });
            await Promise.all(deletePromises);
            await refreshData();
            showToast("本月记录已全额清空");
          } catch (e) {
            console.error("Bulk delete failed", e);
            alert("部分记录可能删除失败，请检查网络后重试");
          }
          hideLoading();
        },
        '确定清空',
        '返回修改'
      );
    }, 200);
  });
}

function changeMonth(delta) {
  currentMonth += delta;
  if (currentMonth > 12) { currentMonth = 1; currentYear++; }
  if (currentMonth < 1) { currentMonth = 12; currentYear--; }
  refreshData();
}

// ============ Charts Rendering ============
function renderCharts() {
  const ctx = document.getElementById('mainChart').getContext('2d');
  
  if (chart) {
    chart.destroy();
    chart = null;
  }
  
  if (records.length === 0) {
    // Clear canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    document.getElementById('categoryStatsList').innerHTML = '';
    return;
  }

  const statsType = document.getElementById('statsType')?.value || 'project';
  const totalAmount = records.reduce((s, r) => s + r.amount, 0);
  const statsList = document.getElementById('categoryStatsList');

  if (statsType === 'project') {
    // Aggregate by crop project
    const projectMap = {};
    records.forEach(r => {
      if (!projectMap[r.project]) {
        projectMap[r.project] = { amount: 0, weight: 0 };
      }
      projectMap[r.project].amount += r.amount;
      projectMap[r.project].weight += (parseFloat(r.weight) || 0);
    });

    const sortedProjects = Object.entries(projectMap).sort((a, b) => b[1].amount - a[1].amount);
    const labels = sortedProjects.map(p => p[0]);
    const amounts = sortedProjects.map(p => p[1].amount);
    const colors = labels.map(l => PROJECTS[l] ? PROJECTS[l].color : '#64748b');

    // Render doughnut chart
    chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: amounts,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ¥${ctx.raw.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`
            }
          }
        },
        cutout: '65%'
      }
    });

    // Render detail stats list under the chart
    statsList.innerHTML = sortedProjects.map(([name, data]) => {
      const proj = PROJECTS[name] || { icon: "📌", color: "#64748b" };
      const pct = totalAmount > 0 ? ((data.amount / totalAmount) * 100).toFixed(0) : 0;
      return `
        <div class="category-stat-item">
          <div class="dot" style="background:${proj.color}"></div>
          <span class="name">${proj.icon} ${name} (${pct}%)</span>
          <div class="values">
            <span class="money">¥${data.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            ${data.weight > 0 ? `<span class="weight">${data.weight.toFixed(1)} 斤</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

  } else {
    // Aggregate by name (personnel)
    const nameMap = {};
    records.forEach(r => {
      if (!nameMap[r.name]) {
        nameMap[r.name] = { amount: 0 };
      }
      nameMap[r.name].amount += r.amount;
    });

    const sortedNames = Object.entries(nameMap).sort((a, b) => b[1].amount - a[1].amount);
    const labels = sortedNames.map(p => p[0]);
    const amounts = sortedNames.map(p => p[1].amount);
    const colors = labels.map((_, idx) => `hsl(${(idx * 137.5) % 360}, 65%, 55%)`);

    // Render doughnut chart
    chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: amounts,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ¥${ctx.raw.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`
            }
          }
        },
        cutout: '65%'
      }
    });

    // Render detail stats list under the chart
    statsList.innerHTML = sortedNames.map(([name, data], idx) => {
      const pct = totalAmount > 0 ? ((data.amount / totalAmount) * 100).toFixed(0) : 0;
      const color = colors[idx];
      return `
        <div class="category-stat-item">
          <div class="dot" style="background:${color}"></div>
          <span class="name">👤 ${name} (${pct}%)</span>
          <div class="values">
            <span class="money">¥${data.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

// ============ Excel Styled Download Helper ============
function downloadExcel(htmlContent, filename) {
  // Replace <table> with table that has HTML border attributes, avoiding the word "solid"
  const styledHtmlContent = htmlContent.replace('<table>', '<table border="1" bordercolor="#cbd5e1" style="border-collapse: collapse;">');
  
  const excelTemplate = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Sheet1</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <meta charset="UTF-8">
      <style>
        table {
          border-collapse: collapse;
        }
        td, th {
          padding: 6px 8px;
          text-align: center;
          vertical-align: middle;
          font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
          font-size: 10pt;
        }
        .title {
          font-size: 14pt;
          font-weight: bold;
          height: 38px;
          text-align: center;
          vertical-align: middle;
          background-color: #ffffff;
          color: #1e293b;
        }
        .row-even {
          background-color: #f8fafc;
        }
        .row-odd {
          background-color: #ffffff;
        }
        .total-row {
          font-weight: bold;
          background-color: #e2e8f0;
          color: #0f172a;
        }
      </style>
    </head>
    <body>
      ${styledHtmlContent}
    </body>
    </html>
  `;

  const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============ Stats Report Export CSV ============
function exportStatsReport() {
  if (records.length === 0) {
    alert('当前月份没有记录可导出');
    return;
  }
  if (!checkAuth()) {
    return;
  }

  const statsType = document.getElementById('statsType')?.value || 'project';
  const totalAmount = records.reduce((s, r) => s + r.amount, 0);

  let html = `<table>`;
  let filename = '';
  const monthStr = `${currentYear}年${String(currentMonth).padStart(2, '0')}月`;

  if (statsType === 'project') {
    filename = `${monthStr}合作社用工项目汇总.xls`;
    const titleText = `${monthStr}合作社用工项目汇总`;

    // Group by project
    const projectMap = {};
    records.forEach(r => {
      if (!projectMap[r.project]) {
        projectMap[r.project] = 0;
      }
      projectMap[r.project] += r.amount;
    });

    const sortedProjects = Object.entries(projectMap).sort((a, b) => b[1] - a[1]);
    const headers = ['项目', '金额(元)', '占比'];

    // Column widths
    html += `
      <colgroup>
        <col width="120">
        <col width="100">
        <col width="100">
      </colgroup>
    `;

    // Title row
    html += `<tr><td class="title" colspan="3">${titleText}</td></tr>`;

    // Headers row
    html += `<tr>`;
    headers.forEach((h, idx) => {
      const bgColor = idx % 2 === 0 ? '#059669' : '#10b981';
      html += `<th style="background-color: ${bgColor}; color: #ffffff; text-align: center; font-weight: bold; padding: 8px;">${h}</th>`;
    });
    html += `</tr>`;

    // Data rows
    sortedProjects.forEach(([name, amount], rowIdx) => {
      const pct = totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) + '%' : '0%';
      const rowClass = rowIdx % 2 === 0 ? 'row-even' : 'row-odd';
      html += `<tr class="${rowClass}">`;
      html += `<td style="text-align: center;">${name}</td>`;
      html += `<td style="text-align: center;">${amount.toFixed(2)}</td>`;
      html += `<td style="text-align: center;">${pct}</td>`;
      html += `</tr>`;
    });

    // Total row
    html += `<tr class="total-row">`;
    html += `<td style="text-align: center; font-weight: bold;">总金额</td>`;
    html += `<td style="text-align: center; font-weight: bold;">${totalAmount.toFixed(2)}</td>`;
    html += `<td style="text-align: center; font-weight: bold;">100%</td>`;
    html += `</tr>`;

  } else {
    // Person statistics
    filename = `${monthStr}合作社用工人员汇总.xls`;
    const titleText = `${monthStr}合作社用工人员汇总`;

    const monthProjects = [...new Set(records.map(r => r.project))].sort();
    const headers = ['姓名', ...monthProjects.map(p => `${p}(元)`), '工资总额(元)', '占比'];

    // Group by name and project
    const namePivotMap = {};
    records.forEach(r => {
      if (!namePivotMap[r.name]) {
        namePivotMap[r.name] = { total: 0, projects: {} };
      }
      if (!namePivotMap[r.name].projects[r.project]) {
        namePivotMap[r.name].projects[r.project] = 0;
      }
      namePivotMap[r.name].projects[r.project] += r.amount;
      namePivotMap[r.name].total += r.amount;
    });

    const sortedNames = Object.entries(namePivotMap).sort((a, b) => b[1].total - a[1].total);

    const projectTotals = {};
    monthProjects.forEach(p => {
      projectTotals[p] = 0;
    });
    records.forEach(r => {
      projectTotals[r.project] += r.amount;
    });

    // Column widths
    html += `<colgroup>`;
    html += `<col width="90">`;
    monthProjects.forEach(() => {
      html += `<col width="75">`;
    });
    html += `<col width="95">`;
    html += `<col width="75">`;
    html += `</colgroup>`;

    // Title row
    html += `<tr><td class="title" colspan="${headers.length}">${titleText}</td></tr>`;

    // Headers row
    html += `<tr>`;
    headers.forEach((h, idx) => {
      const bgColor = idx % 2 === 0 ? '#059669' : '#10b981';
      html += `<th style="background-color: ${bgColor}; color: #ffffff; text-align: center; font-weight: bold; padding: 8px;">${h}</th>`;
    });
    html += `</tr>`;

    // Data rows
    sortedNames.forEach(([name, data], rowIdx) => {
      const pct = totalAmount > 0 ? ((data.total / totalAmount) * 100).toFixed(1) + '%' : '0%';
      const rowClass = rowIdx % 2 === 0 ? 'row-even' : 'row-odd';
      html += `<tr class="${rowClass}">`;
      html += `<td style="text-align: center;">${name}</td>`;
      monthProjects.forEach(p => {
        const val = data.projects[p] || 0;
        html += `<td style="text-align: center;">${val.toFixed(2)}</td>`;
      });
      html += `<td style="text-align: center; font-weight: 500;">${data.total.toFixed(2)}</td>`;
      html += `<td style="text-align: center;">${pct}</td>`;
      html += `</tr>`;
    });

    // Total row
    html += `<tr class="total-row">`;
    html += `<td style="text-align: center; font-weight: bold;">总计</td>`;
    monthProjects.forEach(p => {
      html += `<td style="text-align: center; font-weight: bold;">${projectTotals[p].toFixed(2)}</td>`;
    });
    html += `<td style="text-align: center; font-weight: bold;">${totalAmount.toFixed(2)}</td>`;
    html += `<td style="text-align: center; font-weight: bold;">100%</td>`;
    html += `</tr>`;
  }

  html += `</table>`;

  downloadExcel(html, filename);
}

// ============ Configuration Dialog (Disabled in Hardcoded Cloud Version) ============
function openConfigModal() {
  alert("此应用已被锁定为固定云端数据库模式，无需手动配置接口！");
}

// ============ Data Export CSV ============
function exportCSV() {
  if (records.length === 0) {
    alert('当前月份没有记录可导出');
    return;
  }
  if (!checkAuth()) {
    return;
  }

  const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
  const totalAmount = sorted.reduce((s, r) => s + r.amount, 0);

  const titleText = `${currentYear}年${String(currentMonth).padStart(2, '0')}月合作社用工记账表`;
  const filename = `${titleText}.xls`;

  // Header column names
  const headers = ['日期', '时段', '村庄', '姓名', '项目', '工时', '日工资', '日工作时间', '金额(元)', '备注'];
  
  let html = `<table>`;
  html += `
    <colgroup>
      <col width="90">
      <col width="50">
      <col width="85">
      <col width="85">
      <col width="70">
      <col width="80">
      <col width="80">
      <col width="90">
      <col width="90">
      <col width="130">
    </colgroup>
  `;
  // Title row
  html += `<tr><td class="title" colspan="10">${titleText}</td></tr>`;
  
  // Headers row
  html += `<tr>`;
  headers.forEach((h, idx) => {
    // Alternating header background color
    const bgColor = idx % 2 === 0 ? '#059669' : '#10b981';
    html += `<th style="background-color: ${bgColor}; color: #ffffff; text-align: center; font-weight: bold; padding: 8px;">${h}</th>`;
  });
  html += `</tr>`;

  // Data rows
  sorted.forEach((r, rowIdx) => {
    const rowClass = rowIdx % 2 === 0 ? 'row-even' : 'row-odd';
    html += `<tr class="${rowClass}">`;
    html += `<td style="text-align: center;">${r.date}</td>`;
    html += `<td style="text-align: center;">${r.period || ''}</td>`;
    html += `<td style="text-align: center;">${r.village}</td>`;
    html += `<td style="text-align: center;">${r.name}</td>`;
    html += `<td style="text-align: center;">${r.project}</td>`;
    html += `<td style="text-align: center;">${r.work_hours || ''}</td>`;
    html += `<td style="text-align: center;">${r.daily_wage || ''}</td>`;
    html += `<td style="text-align: center;">${r.standard_hours || ''}</td>`;
    html += `<td style="text-align: center; font-weight: 500;">${r.amount.toFixed(2)}</td>`;
    html += `<td style="text-align: center;">${r.note || ''}</td>`;
    html += `</tr>`;
  });

  // Total summary row
  html += `<tr class="total-row">`;
  html += `<td colspan="8" style="text-align: right; font-weight: bold; padding: 8px;">总计：</td>`;
  html += `<td style="text-align: center; font-weight: bold;">${totalAmount.toFixed(2)}</td>`;
  html += `<td></td>`;
  html += `</tr>`;

  html += `</table>`;

  downloadExcel(html, filename);
}

// ============ Modals & Loaders ============
function showModal(title, msg, onConfirm, confirmText = '确认', cancelText = '取消') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalMsg').innerHTML = msg;
  document.getElementById('confirmModal').classList.add('show');
  pendingAction = onConfirm;
  
  const cancelBtn = document.querySelector('#confirmModal .btn-secondary');
  const confirmBtn = document.getElementById('modalConfirmBtn');
  
  if (cancelBtn) cancelBtn.textContent = cancelText;
  if (confirmBtn) confirmBtn.textContent = confirmText;
  
  confirmBtn.onclick = () => {
    const action = pendingAction;
    closeModal();
    if (action) action();
  };
}

function closeModal() {
  document.getElementById('confirmModal').classList.remove('show');
  pendingAction = null;
}

function showLoading() {
  document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

// ============ Record Detail Modal Actions ============
// Single document-level delegation — works even in strict CSP environments
document.addEventListener('click', function(e) {
  const row = e.target.closest('[data-record-id]');
  if (!row) return;
  const isFromReport = row.getAttribute('data-from-report') === 'true';
  
  // For Today's Report, ONLY open the modal if the clicked element is or is within the three-dots button (.more-btn)
  if (isFromReport && !e.target.closest('.more-btn')) {
    return;
  }
  
  const recordId = row.getAttribute('data-record-id');
  openRecordDetailModal(recordId, isFromReport);
});

// Also available as window global for any remaining onclick references
window.openRecordDetail = function(el) {
  const row = el.closest ? el.closest('[data-record-id]') : el;
  if (!row) return;
  const recordId = row.getAttribute('data-record-id');
  const isFromReport = row.getAttribute('data-from-report') === 'true';
  openRecordDetailModal(recordId, isFromReport);
};

function handleMoreBtnClick(e) {
  // Kept for safety, no longer primary
  const row = e.target.closest('[data-record-id]');
  if (!row) return;
  const recordId = row.getAttribute('data-record-id');
  const isFromReport = row.getAttribute('data-from-report') === 'true';
  openRecordDetailModal(recordId, isFromReport);
}

function openRecordDetailModal(recordId, isFromReport) {
  try {
    const r = isFromReport 
      ? reportRecords.find(rec => String(rec.id) === String(recordId)) 
      : records.find(rec => String(rec.id) === String(recordId));
    if (!r) {
      alert("未找到该条记录！");
      return;
    }

    const dObj = new Date(r.date);
    const dateStr = `${dObj.getFullYear()}年${String(dObj.getMonth()+1).padStart(2,'0')}月${String(dObj.getDate()).padStart(2,'0')}日`;
    
    const detailsHtml = `
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 0.5rem 0;">
        <span style="color: var(--text-light); font-weight: 600; font-size: 0.9rem;">姓名</span>
        <strong style="font-size: 1.05rem; color: var(--text-dark);">${r.name}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 0.5rem 0;">
        <span style="color: var(--text-light); font-weight: 600; font-size: 0.9rem;">村庄</span>
        <strong style="font-size: 1.05rem; color: var(--text-dark);">${r.village}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 0.5rem 0;">
        <span style="color: var(--text-light); font-weight: 600; font-size: 0.9rem;">项目</span>
        <strong style="font-size: 1.05rem; color: var(--text-dark);">${r.project}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 0.5rem 0;">
        <span style="color: var(--text-light); font-weight: 600; font-size: 0.9rem;">日期</span>
        <strong style="font-size: 1.05rem; color: var(--text-dark);">${dateStr}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 0.5rem 0;">
        <span style="color: var(--text-light); font-weight: 600; font-size: 0.9rem;">时段</span>
        <strong style="font-size: 1.05rem; color: var(--text-dark);">${r.period || '无'}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 0.5rem 0;">
        <span style="color: var(--text-light); font-weight: 600; font-size: 0.9rem;">工时</span>
        <strong style="font-size: 1.05rem; color: var(--text-dark);">${r.work_hours ? r.work_hours + ' 小时' : '无'}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 0.5rem 0;">
        <span style="color: var(--text-light); font-weight: 600; font-size: 0.9rem;">日工资</span>
        <strong style="font-size: 1.05rem; color: var(--text-dark);">${r.daily_wage ? r.daily_wage + ' 元/天' : '无'}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 0.5rem 0;">
        <span style="color: var(--text-light); font-weight: 600; font-size: 0.9rem;">标时</span>
        <strong style="font-size: 1.05rem; color: var(--text-dark);">${r.standard_hours ? r.standard_hours + ' 小时' : '无'}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 0.5rem 0;">
        <span style="color: var(--text-light); font-weight: 600; font-size: 0.9rem;">计算金额</span>
        <strong style="font-size: 1.15rem; color: var(--primary); font-weight: 800;">¥${r.amount.toFixed(2)}</strong>
      </div>
      ${r.note ? `
      <div style="display: flex; flex-direction: column; gap: 0.3rem; margin-top: 0.2rem;">
        <span style="color: var(--text-light); font-weight: 600; font-size: 0.9rem;">备注</span>
        <div style="font-size: 0.85rem; color: var(--text-dark); background: #f8fafc; padding: 0.5rem; border-radius: 6px; border: 1px solid #e2e8f0; line-height: 1.4;">${r.note}</div>
      </div>
      ` : ''}
    `;

    document.getElementById('recordDetailContent').innerHTML = detailsHtml;

    const deleteBtn = document.getElementById('detailDeleteBtn');
    deleteBtn.onclick = () => {
      triggerDetailRecordDeletion(r, isFromReport);
    };

    const modal = document.getElementById('recordDetailModal');
    modal.style.display = 'flex';
    modal.style.pointerEvents = 'auto';
    // Small delay so display:flex takes effect before opacity transition
    setTimeout(() => { modal.style.opacity = '1'; }, 10);
  } catch (e) {
    alert("打开详情失败: " + e.message);
    console.error(e);
  }
}

function closeRecordDetailModal() {
  const modal = document.getElementById('recordDetailModal');
  if (!modal) return;
  modal.style.opacity = '0';
  modal.style.pointerEvents = 'none';
  setTimeout(() => { modal.style.display = 'none'; }, 280);
}

function triggerDetailRecordDeletion(r, isFromReport) {
  const confirmMsg = `确定要删除该条记录吗？<br><br><b>姓名：</b>${r.name}<br><b>项目：</b>${r.project}<br><b>金额：</b>¥${r.amount.toFixed(2)}`;
  showModal('确认删除记录', confirmMsg, async () => {
    closeRecordDetailModal(); // Close detail modal first
    if (isFromReport) {
      await deleteRecordFromReport(r.id, r.name);
    } else {
      await deleteRecord(r.id, r.name);
    }
  }, '删除', '返回');
}

// ============ Toast Notification ============
function showToast(message, isError = false, duration = 2000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${isError ? 'error' : 'success'} show`;
  
  if (window.toastTimeout) clearTimeout(window.toastTimeout);
  window.toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// ============ Password Authentication ============
function checkAuth() {
  const savedPassword = localStorage.getItem('jizhang_auth_password');
  const savedTime = localStorage.getItem('jizhang_auth_time');
  const tenDaysMs = 10 * 24 * 60 * 60 * 1000;
  
  // Backward compatibility with older session hash if password is still 2017
  const savedHash = localStorage.getItem('jizhang_auth');
  const isOldAuthValid = (AUTH_PASSWORD === '123456' && savedHash === '7c794d2f');
  
  if ((savedPassword === AUTH_PASSWORD || isOldAuthValid) && savedTime && (Date.now() - parseInt(savedTime)) < tenDaysMs) {
    return true;
  }
  
  // Clear any expired auth info
  localStorage.removeItem('jizhang_auth');
  localStorage.removeItem('jizhang_auth_password');
  localStorage.removeItem('jizhang_auth_time');
  
  const pwd = prompt('请输入操作授权密码：');
  if (pwd === null) {
    return false;
  }
  
  if (pwd === AUTH_PASSWORD) {
    localStorage.setItem('jizhang_auth_password', AUTH_PASSWORD);
    localStorage.setItem('jizhang_auth_time', Date.now().toString());
    showToast('验证成功，已获得10天操作权限');
    return true;
  } else {
    showToast('密码错误，操作已被拒绝！', true);
    return false;
  }
}

// ============ Today's Report Actions ============
let reportRecords = [];
let reportFilteredRecords = [];

async function fetchRecordsForReportRange() {
  const startDate = document.getElementById('repStartDate').value;
  const endDate = document.getElementById('repEndDate').value;
  
  let url = `${apiBaseUrl}/api/records`;
  const queryParams = [];
  if (startDate) queryParams.push(`startDate=${startDate}`);
  if (endDate) queryParams.push(`endDate=${endDate}`);
  
  if (queryParams.length > 0) {
    url += `?${queryParams.join('&')}`;
  }
  
  showLoading();
  try {
    const res = await fetch(url);
    if (res.ok) {
      reportRecords = await res.json();
    } else {
      showToast("加载报表数据失败", true);
    }
  } catch (e) {
    console.error("Failed to fetch report range data", e);
    showToast("加载报表数据出错", true);
  }
  hideLoading();
}

async function openTodayReportModal() {
  const overlay = document.getElementById('todayReportOverlay');
  overlay.style.display = 'block';
  setTimeout(() => {
    overlay.classList.add('show');
  }, 10);
  
  // Default range to today
  const today = todayStr();
  document.getElementById('repStartDate').value = today;
  document.getElementById('repEndDate').value = today;
  
  // Reset search and project filters
  document.getElementById('repName').value = '';
  document.getElementById('repQuery').value = '';
  
  const selectProj = document.getElementById('repProject');
  selectProj.innerHTML = '<option value="">全部项目</option>' + 
    Object.keys(PROJECTS).map(p => `<option value="${p}">${p}</option>`).join('');
  selectProj.value = '';
  
  // Initial fetch for today's records
  selectedReportRecordIds = [];
  await fetchRecordsForReportRange();
  filterTodayReport();
}

function closeTodayReportModal() {
  const overlay = document.getElementById('todayReportOverlay');
  overlay.classList.remove('show');
  setTimeout(() => {
    overlay.style.display = 'none';
  }, 350);
}

async function onReportDateChange() {
  await fetchRecordsForReportRange();
  filterTodayReport();
}

async function clearReportDates() {
  document.getElementById('repStartDate').value = '';
  document.getElementById('repEndDate').value = '';
  await fetchRecordsForReportRange();
  filterTodayReport();
}

function filterTodayReport() {
  const filterName = document.getElementById('repName').value.trim().toLowerCase();
  const filterProj = document.getElementById('repProject').value;
  const filterQuery = document.getElementById('repQuery').value.trim().toLowerCase();

  let filtered = reportRecords;

  if (filterName) {
    filtered = filtered.filter(r => r.name.toLowerCase().includes(filterName));
  }
  if (filterProj) {
    filtered = filtered.filter(r => r.project === filterProj);
  }
  if (filterQuery) {
    filtered = filtered.filter(r => 
      (r.village && r.village.toLowerCase().includes(filterQuery)) ||
      (r.note && r.note.toLowerCase().includes(filterQuery))
    );
  }

  // Sort: newest first
  reportFilteredRecords = [...filtered].sort((a, b) => b.id - a.id);

  // Update statistics widget
  const count = reportFilteredRecords.length;
  const total = reportFilteredRecords.reduce((s, r) => s + r.amount, 0);
  
  document.getElementById('repFilteredCount').textContent = count;
  document.getElementById('repFilteredAmount').textContent = `¥${total.toFixed(2)}`;

  // Render list
  const listContainer = document.getElementById('repRecordList');
  if (count === 0) {
    listContainer.innerHTML = `
      <div class="empty-state" style="padding: 3rem 0;">
        <span class="emoji">📭</span>
        <p>没有找到符合筛选条件的记录～</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = reportFilteredRecords.map(r => {
    const proj = PROJECTS[r.project] || { icon: "📌", color: "#adb5bd" };
    const dObj = new Date(r.date);
    const dateStr = `${String(dObj.getMonth()+1).padStart(2,'0')}-${String(dObj.getDate()).padStart(2,'0')}`;
    const isChecked = selectedReportRecordIds.includes(String(r.id));
    
    return `
      <div class="record-item" data-record-id="${r.id}" data-from-report="true" style="cursor: pointer; display: flex; align-items: center; gap: 0.6rem;">
        <input type="checkbox" class="report-select-checkbox" data-id="${r.id}" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation(); toggleSelectReportRecord('${r.id}')" style="width: 1.1rem; height: 1.1rem; cursor: pointer; margin: 0; flex-shrink: 0;">
        <div class="project-icon" style="background:${proj.color}15; color:${proj.color}">${proj.icon}</div>
        <div class="info" style="display: flex; flex-direction: column; gap: 0.15rem; flex: 1; min-width: 0;">
          <!-- Row 1: 姓名 村庄 项目 -->
          <div class="line-1" style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; margin-bottom: 0;">
            <span class="name" style="font-size: 0.85rem; font-weight: 700; color: var(--text-dark);">${r.name}</span>
            <span class="village-badge" style="font-size: 0.7rem; font-weight: 500; padding: 0.05rem 0.3rem; border-radius: 4px; background: #e2e8f0; color: var(--text-muted);">${r.village}</span>
            <span class="project-badge" style="font-size: 0.7rem; font-weight: 600; padding: 0.05rem 0.3rem; border-radius: 4px; background: ${proj.color}15; color: ${proj.color};">${r.project}</span>
          </div>
          <!-- Row 2: 月日 时段 工时 -->
          <div class="line-2" style="font-size: 0.72rem; color: var(--text-light); display: flex; gap: 0.35rem; align-items: center;">
            <span style="font-weight: 500;">${dateStr}</span>
            ${getPeriodBadgeHtml(r.period)}
            ${r.work_hours ? `<span>·</span> <span class="price-weight" style="color: var(--primary-text); font-weight: 600;">工时: ${r.work_hours}时</span>` : ''}
          </div>
          <!-- Row 3: 日薪 标时 -->
          <div class="line-3" style="font-size: 0.72rem; color: var(--text-light); display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
            ${r.daily_wage ? `<span class="price-weight" style="color: var(--primary-text); font-weight: 600;">日薪: ${r.daily_wage}元</span>` : ''}
            ${r.standard_hours ? `<span>·</span> <span class="price-weight" style="color: var(--primary-text); font-weight: 600;">标时: ${r.standard_hours}时</span>` : ''}
            ${r.note ? `<span>·</span> <span style="font-style: italic; color: #71717a;">备注: ${r.note}</span>` : ''}
          </div>
        </div>
        <div class="amount" style="flex-shrink: 0;">¥${r.amount.toFixed(2)}</div>
        <span class="more-btn" onclick="openRecordDetailModal('${r.id}', true)" style="flex-shrink: 0;">⋮</span>
      </div>
    `;
  }).join('');

  // Sync selected IDs and update UI
  const visibleIds = reportFilteredRecords.map(r => String(r.id));
  selectedReportRecordIds = selectedReportRecordIds.filter(id => visibleIds.includes(id));
  updateBatchActionRowUI();
}

async function deleteRecordFromReport(id, name) {
  if (!isOnline) {
    showToast("删除失败：云端数据库未连接！", true);
    return;
  }
  if (!checkAuth()) {
    return;
  }
  showLoading();
  try {
    const url = `${apiBaseUrl}/api/records/${id}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) {
      // Refresh both main screen cache and report cache
      await refreshData();
      await fetchRecordsForReportRange();
      showToast(`已删除${name}记录`, false, 3000);
      filterTodayReport();
    } else {
      showToast("删除失败：服务器错误", true);
    }
  } catch (e) {
    console.error("Delete record failed", e);
    showToast("删除失败：网络通信异常", true);
  }
  hideLoading();
}

// ============ Report Batch Actions ============
function toggleSelectReportRecord(id) {
  const idStr = String(id);
  const index = selectedReportRecordIds.indexOf(idStr);
  if (index > -1) {
    selectedReportRecordIds.splice(index, 1);
  } else {
    selectedReportRecordIds.push(idStr);
  }
  updateBatchActionRowUI();
}

function toggleSelectAllReport(checked) {
  if (checked) {
    reportFilteredRecords.forEach(r => {
      const idStr = String(r.id);
      if (!selectedReportRecordIds.includes(idStr)) {
        selectedReportRecordIds.push(idStr);
      }
    });
  } else {
    const filteredIds = reportFilteredRecords.map(r => String(r.id));
    selectedReportRecordIds = selectedReportRecordIds.filter(id => !filteredIds.includes(id));
  }

  // Sync visual checkbox states
  document.querySelectorAll('.report-select-checkbox').forEach(cb => {
    const id = cb.getAttribute('data-id');
    cb.checked = selectedReportRecordIds.includes(String(id));
  });

  updateBatchActionRowUI();
}

function updateBatchActionRowUI() {
  const batchRow = document.getElementById('batchActionRow');
  const countBadge = document.getElementById('selectedBatchCount');
  const selectAllCb = document.getElementById('selectAllReportCheckbox');

  if (!batchRow || !countBadge) return;

  const count = selectedReportRecordIds.length;
  if (count > 0) {
    batchRow.style.display = 'flex';
    countBadge.textContent = count;
  } else {
    batchRow.style.display = 'none';
  }

  if (selectAllCb) {
    const allFilteredSelected = reportFilteredRecords.length > 0 &&
      reportFilteredRecords.every(r => selectedReportRecordIds.includes(String(r.id)));
    selectAllCb.checked = allFilteredSelected;
  }
}

async function triggerBatchDelete() {
  if (selectedReportRecordIds.length === 0) return;

  if (!isOnline) {
    showToast("删除失败：云端数据库未连接！", true);
    return;
  }
  if (!checkAuth()) {
    return;
  }

  const count = selectedReportRecordIds.length;
  const confirmMsg = `确定要批量删除已选中的 <b>${count}</b> 条记录吗？<br><br>此操作将永久从云端数据库中移除，无法恢复！`;

  showModal('确认批量删除记录', confirmMsg, async () => {
    showLoading();
    try {
      // Execute deletions in parallel
      const promises = selectedReportRecordIds.map(id => {
        const url = `${apiBaseUrl}/api/records/${id}`;
        return fetch(url, { method: 'DELETE' });
      });

      const results = await Promise.all(promises);
      const failedCount = results.filter(res => !res.ok).length;

      // Refresh data caches
      await refreshData();
      await fetchRecordsForReportRange();

      // Reset selection state
      selectedReportRecordIds = [];

      if (failedCount > 0) {
        showToast(`批量删除完成：成功 ${count - failedCount} 条，失败 ${failedCount} 条`, true);
      } else {
        showToast(`已批量删除 ${count} 条记录`, false, 3000);
      }

      filterTodayReport();
    } catch (e) {
      console.error("Batch delete failed", e);
      showToast("批量删除发生异常错误！", true);
    }
    hideLoading();
  });
}

function exportTodayReportCSV() {
  if (reportFilteredRecords.length === 0) {
    alert('没有符合筛选条件的记录可导出');
    return;
  }
  if (!checkAuth()) {
    return;
  }

  const sorted = [...reportFilteredRecords].sort((a, b) => new Date(a.date) - new Date(b.date));
  const totalAmount = sorted.reduce((s, r) => s + r.amount, 0);

  const filterStart = document.getElementById('repStartDate').value;
  const filterEnd = document.getElementById('repEndDate').value;
  const filterVillage = document.getElementById('repVillageSelect')?.value;
  const filterName = document.getElementById('repNameInput')?.value.trim();
  const filterProject = document.getElementById('repProjectSelect')?.value;

  let filterDesc = '';
  if (filterVillage) filterDesc += `_${filterVillage}`;
  if (filterName) filterDesc += `_${filterName}`;
  if (filterProject) filterDesc += `_${filterProject}`;

  let dateRange = '全部日期';
  if (filterStart && filterEnd) {
    dateRange = `${filterStart}至${filterEnd}`;
  } else if (filterStart) {
    dateRange = `${filterStart}起`;
  } else if (filterEnd) {
    dateRange = `${filterEnd}止`;
  }

  const titleText = `${dateRange}合作社用工统计表${filterDesc}`;
  const filename = `${titleText}.xls`;

  // Headers
  const headers = ['日期', '时段', '村庄', '姓名', '项目', '工时', '日工资', '日工作时间', '金额(元)', '备注'];

  let html = `<table>`;
  html += `
    <colgroup>
      <col width="90">
      <col width="50">
      <col width="85">
      <col width="85">
      <col width="70">
      <col width="80">
      <col width="80">
      <col width="90">
      <col width="90">
      <col width="130">
    </colgroup>
  `;
  // Title row
  html += `<tr><td class="title" colspan="10">${titleText}</td></tr>`;

  // Headers row
  html += `<tr>`;
  headers.forEach((h, idx) => {
    const bgColor = idx % 2 === 0 ? '#059669' : '#10b981';
    html += `<th style="background-color: ${bgColor}; color: #ffffff; text-align: center; font-weight: bold; padding: 8px;">${h}</th>`;
  });
  html += `</tr>`;

  // Data rows
  sorted.forEach((r, rowIdx) => {
    const rowClass = rowIdx % 2 === 0 ? 'row-even' : 'row-odd';
    html += `<tr class="${rowClass}">`;
    html += `<td style="text-align: center;">${r.date}</td>`;
    html += `<td style="text-align: center;">${r.period || ''}</td>`;
    html += `<td style="text-align: center;">${r.village}</td>`;
    html += `<td style="text-align: center;">${r.name}</td>`;
    html += `<td style="text-align: center;">${r.project}</td>`;
    html += `<td style="text-align: center;">${r.work_hours || ''}</td>`;
    html += `<td style="text-align: center;">${r.daily_wage || ''}</td>`;
    html += `<td style="text-align: center;">${r.standard_hours || ''}</td>`;
    html += `<td style="text-align: center; font-weight: 500;">${r.amount.toFixed(2)}</td>`;
    html += `<td style="text-align: center;">${r.note || ''}</td>`;
    html += `</tr>`;
  });

  // Total summary row
  html += `<tr class="total-row">`;
  html += `<td colspan="8" style="text-align: right; font-weight: bold; padding: 8px;">总计：</td>`;
  html += `<td style="text-align: center; font-weight: bold;">${totalAmount.toFixed(2)}</td>`;
  html += `<td></td>`;
  html += `</tr>`;

  html += `</table>`;

  downloadExcel(html, filename);
}

// ============ Project Settings & Config Editor Logic ============
let editingConfig = null;

function triggerProjectSettings() {
  const pwd = prompt('请输入项目配置设置授权密码：');
  if (pwd === null) return;
  
  if (pwd === '123456') {
    openProjectSettings();
  } else {
    showToast('密码错误，访问拒绝！', true);
  }
}

function openProjectSettings() {
  try {
    if (!activeConfig) {
      throw new Error("activeConfig is null or undefined. Please check if configurations are loaded.");
    }
    editingConfig = JSON.parse(JSON.stringify(activeConfig));
    renderSettingsEditor();
    const modal = document.getElementById('projectSettingsModal');
    if (!modal) {
      throw new Error("Element 'projectSettingsModal' not found in HTML.");
    }
    modal.style.display = 'flex';
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
  } catch (e) {
    console.error("Failed to open project settings:", e);
    alert("打开项目设置失败:\n" + e.message + "\n" + e.stack);
  }
}

function closeProjectSettings() {
  const modal = document.getElementById('projectSettingsModal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }
  editingConfig = null;
}

function renderSettingsEditor() {
  try {
    // 1. Render Villages & Personnel
    const villagesContainer = document.getElementById('settingsVillagesList');
    if (!villagesContainer) {
      throw new Error("Element 'settingsVillagesList' not found in HTML.");
    }
    
    if (!editingConfig.VILLAGES) {
      editingConfig.VILLAGES = {};
    }
    
    villagesContainer.innerHTML = Object.entries(editingConfig.VILLAGES).map(([village, names]) => {
      if (!Array.isArray(names)) {
        names = [];
      }
      const namesBadges = names.map(name => `
        <span class="settings-name-badge">
          <span style="cursor: pointer;" onclick="editPersonSettingName('${village}', '${name}')" title="点击修改姓名">${name}</span>
          <span class="remove-name-btn" onclick="removeNameFromVillageSetting('${village}', '${name}')">&times;</span>
        </span>
      `).join('');
      
      return `
        <div class="settings-village-card">
          <div class="settings-village-header">
            <span class="settings-village-title" style="cursor: pointer; border-bottom: 1px dotted var(--text-light);" onclick="editVillageSettingName('${village}')" title="点击修改村庄名称">🏡 ${village} (${names.length}人)</span>
            <button class="btn-secondary btn-danger" style="padding: 0.15rem 0.4rem; font-size: 0.75rem; margin:0;" onclick="removeVillageSetting('${village}')">删除村庄</button>
          </div>
          <div class="settings-names-list">
            ${namesBadges || '<span style="color: var(--text-light); font-size: 0.75rem;">暂无人员</span>'}
          </div>
          <div style="display: flex; gap: 0.4rem; align-items: center; margin-top: 0.3rem;">
            <input type="text" id="addPersonInput_${village}" placeholder="新加人员姓名..." style="flex: 1; padding: 0.3rem; font-size: 0.75rem; border: 1px solid var(--border); border-radius: 4px; outline:none; background: var(--card-bg); color: var(--text-dark);">
            <button class="btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.75rem; margin:0;" onclick="addPersonToVillageSetting('${village}')">添加人员</button>
          </div>
        </div>
      `;
    }).join('');

    // 2. Render Projects
    const projectsContainer = document.getElementById('settingsProjectsList');
    if (!projectsContainer) {
      throw new Error("Element 'settingsProjectsList' not found in HTML.");
    }
    
    if (!editingConfig.PROJECTS) {
      editingConfig.PROJECTS = {};
    }
    
    projectsContainer.innerHTML = Object.entries(editingConfig.PROJECTS).map(([projName, val]) => {
      const icon = val ? (val.icon || '📌') : '📌';
      const color = val ? (val.color || '#64748b') : '#64748b';
      return `
        <div class="settings-project-row">
          <div class="settings-project-info">
            <span class="settings-project-icon-badge" style="background:${color}15; color:${color}">${icon}</span>
            <span style="font-weight:600; font-size:0.85rem; color:var(--text-dark); cursor: pointer; border-bottom: 1px dotted var(--text-light);" onclick="editProjectSettingName('${projName}')" title="点击修改项目名称">${projName}</span>
          </div>
          <div class="settings-project-actions">
            <span style="display: inline-block; width: 14px; height: 14px; border-radius: 50%; background: ${color}; border: 1px solid #ffffff; box-shadow: 0 0 2px rgba(0,0,0,0.2);"></span>
            <button class="btn-secondary btn-danger" style="padding: 0.15rem 0.4rem; font-size: 0.75rem; margin:0;" onclick="removeProjectSetting('${projName}')">删除</button>
          </div>
        </div>
      `;
    }).join('');

    // 3. Render Periods
    const periodsInput = document.getElementById('settingsPeriodsInput');
    if (!periodsInput) {
      throw new Error("Element 'settingsPeriodsInput' not found in HTML.");
    }
    periodsInput.value = (editingConfig.PERIODS || []).join(',');

    // 4. Render Numeric/Text Lists
    const workHoursInput = document.getElementById('settingsWorkHoursInput');
    if (!workHoursInput) {
      throw new Error("Element 'settingsWorkHoursInput' not found in HTML.");
    }
    workHoursInput.value = (editingConfig.WORK_HOURS || []).join(',');

    const dailyWagesInput = document.getElementById('settingsDailyWagesInput');
    if (!dailyWagesInput) {
      throw new Error("Element 'settingsDailyWagesInput' not found in HTML.");
    }
    dailyWagesInput.value = (editingConfig.DAILY_WAGES || []).join(',');

    const standardHoursInput = document.getElementById('settingsStandardHoursInput');
    if (!standardHoursInput) {
      throw new Error("Element 'settingsStandardHoursInput' not found in HTML.");
    }
    standardHoursInput.value = (editingConfig.STANDARD_HOURS || []).join(',');

    // 5. Render Authorization Password
    const authPasswordInput = document.getElementById('settingsAuthPasswordInput');
    if (!authPasswordInput) {
      throw new Error("Element 'settingsAuthPasswordInput' not found in HTML.");
    }
    authPasswordInput.value = editingConfig.AUTH_PASSWORD || '123123';

  } catch (err) {
    console.error("Error in renderSettingsEditor:", err);
    throw err;
  }
}

function removeNameFromVillageSetting(village, name) {
  if (editingConfig.VILLAGES[village]) {
    editingConfig.VILLAGES[village] = editingConfig.VILLAGES[village].filter(n => n !== name);
    renderSettingsEditor();
  }
}

function addPersonToVillageSetting(village) {
  const input = document.getElementById(`addPersonInput_${village}`);
  const name = input.value.trim();
  if (!name) return;
  if (!editingConfig.VILLAGES[village]) return;
  
  if (editingConfig.VILLAGES[village].includes(name)) {
    alert("该人员名字已存在于该村庄！");
    return;
  }
  
  editingConfig.VILLAGES[village].push(name);
  renderSettingsEditor();
}

function removeVillageSetting(village) {
  if (confirm(`确定要删除村庄 "${village}" 吗？该村庄下的所有人员在配置中都将被移除。`)) {
    delete editingConfig.VILLAGES[village];
    renderSettingsEditor();
  }
}

function addVillageSetting() {
  const input = document.getElementById('newVillageNameInput');
  const village = input.value.trim();
  if (!village) return;
  
  if (editingConfig.VILLAGES[village]) {
    alert("该村庄已存在！");
    return;
  }
  
  editingConfig.VILLAGES[village] = [];
  input.value = '';
  renderSettingsEditor();
}

function removeProjectSetting(projName) {
  if (confirm(`确定要删除项目 "${projName}" 吗？`)) {
    delete editingConfig.PROJECTS[projName];
    renderSettingsEditor();
  }
}

function addProjectSetting() {
  const nameInput = document.getElementById('newProjNameInput');
  const iconInput = document.getElementById('newProjIconInput');
  const colorInput = document.getElementById('newProjColorInput');
  
  const name = nameInput.value.trim();
  const icon = iconInput.value.trim() || '📌';
  const color = colorInput.value;
  
  if (!name) {
    alert("请输入项目名称！");
    return;
  }
  if (editingConfig.PROJECTS[name]) {
    alert("该项目已存在！");
    return;
  }
  
  editingConfig.PROJECTS[name] = { icon, color };
  nameInput.value = '';
  iconInput.value = '🍓';
  colorInput.value = '#64748b';
  renderSettingsEditor();
}

function editVillageSettingName(oldVillage) {
  const newVillage = prompt("请输入新的村庄名称:", oldVillage);
  if (newVillage === null) return;
  const val = newVillage.trim();
  if (!val) {
    alert("村庄名称不能为空！");
    return;
  }
  if (val === oldVillage) return;
  if (editingConfig.VILLAGES[val]) {
    alert("该村庄名称已存在！");
    return;
  }

  // Rename key
  editingConfig.VILLAGES[val] = editingConfig.VILLAGES[oldVillage];
  delete editingConfig.VILLAGES[oldVillage];
  renderSettingsEditor();
}

function editPersonSettingName(village, oldName) {
  const newName = prompt("请输入新的姓名:", oldName);
  if (newName === null) return;
  const val = newName.trim();
  if (!val) {
    alert("姓名不能为空！");
    return;
  }
  if (val === oldName) return;
  if (editingConfig.VILLAGES[village].includes(val)) {
    alert("该人员名字已存在于该村庄！");
    return;
  }

  // Replace item
  const idx = editingConfig.VILLAGES[village].indexOf(oldName);
  if (idx > -1) {
    editingConfig.VILLAGES[village][idx] = val;
    renderSettingsEditor();
  }
}

function editProjectSettingName(oldProjName) {
  const newProjName = prompt("请输入新的项目名称:", oldProjName);
  if (newProjName === null) return;
  const val = newProjName.trim();
  if (!val) {
    alert("项目名称不能为空！");
    return;
  }
  if (val === oldProjName) return;
  if (editingConfig.PROJECTS[val]) {
    alert("该项目名称已存在！");
    return;
  }

  // Rename key
  editingConfig.PROJECTS[val] = editingConfig.PROJECTS[oldProjName];
  delete editingConfig.PROJECTS[oldProjName];
  renderSettingsEditor();
}

async function saveProjectSettings() {
  const periodsStr = document.getElementById('settingsPeriodsInput').value.trim();
  const workHoursStr = document.getElementById('settingsWorkHoursInput').value.trim();
  const dailyWagesStr = document.getElementById('settingsDailyWagesInput').value.trim();
  const standardHoursStr = document.getElementById('settingsStandardHoursInput').value.trim();
  const authPasswordInput = document.getElementById('settingsAuthPasswordInput');

  if (!periodsStr) {
    alert("时段不能为空！");
    return;
  }

  const newPwd = authPasswordInput ? authPasswordInput.value.trim() : '';
  if (!newPwd) {
    alert("操作授权密码不能为空！");
    return;
  }

  editingConfig.PERIODS = periodsStr.split(',').map(s => s.trim()).filter(Boolean);
  
  editingConfig.WORK_HOURS = workHoursStr.split(',')
    .map(s => parseFloat(s.trim()))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b);

  editingConfig.DAILY_WAGES = dailyWagesStr.split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b);

  editingConfig.STANDARD_HOURS = standardHoursStr.split(',')
    .map(s => parseFloat(s.trim()))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b);

  editingConfig.AUTH_PASSWORD = newPwd;

  let saveOk = true;
  if (isOnline) {
    showLoading();
    try {
      const res = await fetch(`${apiBaseUrl}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingConfig)
      });
      if (!res.ok) {
        saveOk = false;
      }
    } catch (e) {
      console.error("Save config to database failed", e);
      saveOk = false;
    }
    hideLoading();
  }

  localStorage.setItem('jizhang_config', JSON.stringify(editingConfig));

  activeConfig = editingConfig;
  VILLAGES = activeConfig.VILLAGES;
  PROJECTS = activeConfig.PROJECTS;
  PERIODS = activeConfig.PERIODS;
  WORK_HOURS = activeConfig.WORK_HOURS;
  DAILY_WAGES = activeConfig.DAILY_WAGES;
  STANDARD_HOURS = activeConfig.STANDARD_HOURS;
  AUTH_PASSWORD = activeConfig.AUTH_PASSWORD;

  renderConfiguredInputs();
  setupVillageTabs();
  renderNameDropdownOptions();
  setupProjectChips();

  closeProjectSettings();
  
  if (saveOk) {
    showToast("项目参数配置已成功保存！");
  } else {
    showToast("配置已保存在本地，但上传云端失败，请检查网络！", true);
  }
}

function downloadConfigJsonFile() {
  const periodsStr = document.getElementById('settingsPeriodsInput').value.trim();
  const workHoursStr = document.getElementById('settingsWorkHoursInput').value.trim();
  const dailyWagesStr = document.getElementById('settingsDailyWagesInput').value.trim();
  const standardHoursStr = document.getElementById('settingsStandardHoursInput').value.trim();
  const authPasswordInput = document.getElementById('settingsAuthPasswordInput');

  const downloadData = JSON.parse(JSON.stringify(editingConfig || activeConfig));
  
  if (periodsStr) {
    downloadData.PERIODS = periodsStr.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (workHoursStr) {
    downloadData.WORK_HOURS = workHoursStr.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
  }
  if (dailyWagesStr) {
    downloadData.DAILY_WAGES = dailyWagesStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
  }
  if (standardHoursStr) {
    downloadData.STANDARD_HOURS = standardHoursStr.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
  }
  if (authPasswordInput) {
    downloadData.AUTH_PASSWORD = authPasswordInput.value.trim();
  }

  const jsonStr = JSON.stringify(downloadData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'config.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast("配置文件已准备就绪并开始下载");
}

// ============ Technical Support (WeChat) Logic ============
function contactWechat() {
  const wechatId = 'your_wechat_id';
  
  const tempInput = document.createElement('input');
  tempInput.value = wechatId;
  document.body.appendChild(tempInput);
  tempInput.select();
  try {
    const success = document.execCommand('copy');
    document.body.removeChild(tempInput);
    if (success) {
      showToast('微信号已复制，正在打开微信...', false);
    } else {
      throw new Error();
    }
  } catch (e) {
    document.body.removeChild(tempInput);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(wechatId).then(() => {
        showToast('微信号已复制，正在打开微信...', false);
      });
    } else {
      alert('技术支持微信号：your_wechat_id (请手动复制)');
    }
  }

  setTimeout(() => {
    window.location.href = 'weixin://';
  }, 1000);
}

// ============ Add to Home Screen (A2HS) Logic ============
function checkMobileBanner() {
  // 1. Detect mobile user agent
  const ua = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  
  if (!isMobile) {
    return; // Don't show on desktop
  }

  // 2. Check if user dismissed it in the last 30 days
  const hideTime = localStorage.getItem('hide_a2hs_time');
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  if (hideTime && (Date.now() - parseInt(hideTime)) < thirtyDaysMs) {
    return; // Dismissed recently
  }

  // 3. Render the banner
  const container = document.getElementById('a2hsBannerContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="a2hs-banner">
      <div class="banner-text">
        <span>📱</span>
        <span>添加智能记账本到桌面快捷方式，使用更便捷</span>
      </div>
      <div style="display: flex; align-items: center; gap: 0.3rem;">
        <button class="btn-guide" onclick="openA2hsGuide()">查看指引</button>
        <button class="btn-close" onclick="closeA2hsBanner()">&times;</button>
      </div>
    </div>
  `;
}

function closeA2hsBanner() {
  const container = document.getElementById('a2hsBannerContainer');
  if (container) {
    container.innerHTML = '';
  }
  // Store dismissal timestamp
  localStorage.setItem('hide_a2hs_time', Date.now().toString());
}

function openA2hsGuide() {
  const modal = document.getElementById('a2hsGuideModal');
  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
  }
}

function closeA2hsGuide() {
  const modal = document.getElementById('a2hsGuideModal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }
}

