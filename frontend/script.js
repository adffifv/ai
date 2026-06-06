// frontend/script.js
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const novelText = document.getElementById('novelText');
const convertBtn = document.getElementById('convertBtn');
const yamlOutput = document.getElementById('yamlOutput');
const copyBtn = document.getElementById('copyBtn');
const exportYamlBtn = document.getElementById('exportYamlBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const exportAllBtn = document.getElementById('exportAllBtn');
const statusBadge = document.getElementById('statusBadge');
const statsPanel = document.getElementById('statsPanel');
const styleSelect = document.getElementById('styleSelect');
const loadingIcon = document.getElementById('loadingIcon');
const convertText = document.getElementById('convertText');

const tabScenesBtn = document.getElementById('tabScenesBtn');
const tabCharactersBtn = document.getElementById('tabCharactersBtn');
const tabYamlBtn = document.getElementById('tabYamlBtn');
const tabRelationBtn = document.getElementById('tabRelationBtn');
const tabAnalysisBtn = document.getElementById('tabAnalysisBtn');
const scenesContainer = document.getElementById('scenesContainer');
const charactersContainer = document.getElementById('charactersContainer');
const yamlContainer = document.getElementById('yamlContainer');
const relationContainer = document.getElementById('relationContainer');
const analysisContainer = document.getElementById('analysisContainer');
const analysisContent = document.getElementById('analysisContent');

const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const chatHistory = document.getElementById('chatHistory');

let currentScriptData = null;
let statsChart = null;
let network = null;
let relationData = null;
let progressInterval = null;

const modeRadios = document.querySelectorAll('input[name="mode"]');
const charCountSpan = document.getElementById('charCount');
const wordCountSpan = document.getElementById('wordCount');
const modeHint = document.getElementById('modeHint');
const activeModeText = document.getElementById('activeModeText');
const activeModeReason = document.getElementById('activeModeReason');

// ========== 辅助函数 ==========
function getCharacterName(scriptData, charId) {
    const char = scriptData.characters?.find(c => c.id === charId);
    return char ? char.name : charId;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
        return c;
    });
}

function setStatus(text, isError = false) {
    if (!statusBadge) return;
    statusBadge.innerText = text;
    statusBadge.className = `text-xs px-2 py-1 rounded-full ${isError ? 'bg-red-600' : 'bg-purple-600'}`;
}

function setLoading(isLoading) {
    if (!convertBtn || !loadingIcon || !convertText) return;
    if (isLoading) {
        convertBtn.disabled = true;
        loadingIcon.classList.remove('hidden');
        convertText.innerText = '转换中...';
        if (styleSelect) styleSelect.disabled = true;
        modeRadios.forEach(radio => radio.disabled = true);
    } else {
        convertBtn.disabled = false;
        loadingIcon.classList.add('hidden');
        convertText.innerText = '开始转换剧本';
        if (styleSelect) styleSelect.disabled = false;
        modeRadios.forEach(radio => radio.disabled = false);
    }
}

function enableExportButtons() {
    if (copyBtn) copyBtn.disabled = false;
    if (exportYamlBtn) exportYamlBtn.disabled = false;
    if (exportJsonBtn) exportJsonBtn.disabled = false;
    if (exportAllBtn) exportAllBtn.disabled = false;
}

// ========== 渲染函数 ==========
function renderScenes(scriptData) {
    const scenes = scriptData.scenes || [];
    if (scenes.length === 0) {
        scenesContainer.innerHTML = '<div class="p-4 text-gray-400">暂无场景信息</div>';
        return;
    }
    let html = '<div class="p-4 space-y-4">';
    scenes.forEach(scene => {
        html += `
            <div class="border border-gray-700 rounded-lg p-3">
                <h4 class="text-lg font-semibold">${escapeHtml(scene.title)} <span class="text-sm text-gray-400">(${escapeHtml(scene.scene_id)})</span></h4>
                <p class="text-sm text-gray-300 mt-1"><span class="text-purple-300">地点：</span>${escapeHtml(scene.setting?.location || '未知')}</p>
                <p class="text-sm text-gray-300"><span class="text-purple-300">时间：</span>${escapeHtml(scene.setting?.time_of_day || '未知')}</p>
                <p class="text-sm text-gray-300"><span class="text-purple-300">氛围：</span>${escapeHtml(scene.setting?.atmosphere || '未知')}</p>
                <p class="text-sm text-gray-300"><span class="text-purple-300">出场角色：</span>${(scene.characters || []).map(cid => escapeHtml(getCharacterName(scriptData, cid))).join(', ')}</p>
                <p class="text-sm text-gray-300"><span class="text-purple-300">情感弧线：</span>${escapeHtml(scene.emotional_arc || '无')}</p>
            </div>
        `;
    });
    html += '</div>';
    scenesContainer.innerHTML = html;
}

function renderCharacters(scriptData) {
    const characters = scriptData.characters || [];
    if (characters.length === 0) {
        charactersContainer.innerHTML = '<div class="p-4 text-gray-400">暂无角色信息</div>';
        return;
    }
    let html = '<div class="p-4 space-y-4">';
    characters.forEach(char => {
        html += `
            <div class="border border-gray-700 rounded-lg p-3">
                <h4 class="text-lg font-semibold">${escapeHtml(char.name)} <span class="text-sm text-gray-400">(${escapeHtml(char.id)})</span></h4>
                <p class="text-sm text-gray-300"><span class="text-purple-300">类型：</span>${escapeHtml(char.role_type || '未知')}</p>
                <p class="text-sm text-gray-300"><span class="text-purple-300">性格：</span>${escapeHtml(char.personality || '无')}</p>
                <p class="text-sm text-gray-300"><span class="text-purple-300">外貌：</span>${escapeHtml(char.appearance || '无')}</p>
                <p class="text-sm text-gray-300"><span class="text-purple-300">背景：</span>${escapeHtml(char.background || '无')}</p>
                <p class="text-sm text-gray-300"><span class="text-purple-300">首次出现：</span>${escapeHtml(char.first_appearance || '未知')}</p>
            </div>
        `;
    });
    html += '</div>';
    charactersContainer.innerHTML = html;
}

function displayYaml(jsonData) {
    const yamlStr = jsyaml.dump(jsonData, { indent: 2, lineWidth: -1 });
    const highlighted = hljs.highlight(yamlStr, { language: 'yaml' }).value;
    yamlOutput.innerHTML = `<code class="language-yaml">${highlighted}</code>`;
    return yamlStr;
}

function renderStats(scriptData) {
    const stats = scriptData.stats;
    if (!stats || !stats.character_dialogues || Object.keys(stats.character_dialogues).length === 0) {
        if (statsPanel) statsPanel.classList.add('hidden');
        return;
    }
    if (statsPanel) statsPanel.classList.remove('hidden');
    const labels = Object.keys(stats.character_dialogues);
    const data = Object.values(stats.character_dialogues);
    if (statsChart) statsChart.destroy();
    const ctx = document.getElementById('statsChart').getContext('2d');
    statsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '台词条数',
                data: data,
                backgroundColor: 'rgba(168, 85, 247, 0.7)',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { labels: { color: '#cbd5e1' } } },
            scales: {
                y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
                x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
            }
        }
    });
    document.getElementById('statsText').innerText = `总台词数: ${data.reduce((a,b)=>a+b,0)} 条`;
}

// ========== 角色关系网络图 ==========
async function loadRelationGraph(scriptData) {
    try {
        const response = await fetch('/api/analysis/relation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(scriptData)
        });
        if (!response.ok) throw new Error('关系图加载失败');
        const data = await response.json();
        relationData = data;
        drawNetwork(data);
    } catch (err) {
        console.error(err);
        if (relationContainer) relationContainer.innerHTML = `<div class="p-4 text-red-400">关系图加载失败: ${err.message}</div>`;
    }
}

function drawNetwork(data) {
    const container = document.getElementById('network');
    if (!container) return;
    const nodes = new vis.DataSet(data.nodes);
    const edges = new vis.DataSet(data.edges);
    const options = {
        nodes: {
            shape: 'dot',
            size: 20,
            font: { color: '#ffffff', size: 14 },
            shadow: true
        },
        edges: {
            smooth: { type: 'cubicBezier' },
            width: 1,
            color: { color: '#8888ff', highlight: '#ff8888' },
            font: { align: 'middle', size: 12, color: '#ffcc88', strokeWidth: 0 }
        },
        physics: {
            stabilization: true,
            barnesHut: { gravitationalConstant: -2000 }
        },
        interaction: { hover: true, tooltipDelay: 200 }
    };
    network = new vis.Network(container, { nodes, edges }, options);
    network.on('click', function(params) {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const node = data.nodes.find(n => n.id === nodeId);
            if (node) {
                alert(`角色: ${node.label}\n出场次数: ${node.value}\n${node.title}`);
            }
        } else if (params.edges.length > 0) {
            const edgeId = params.edges[0];
            const edge = data.edges.find(e => e.id === edgeId);
            if (edge) {
                alert(`关系: 共同出场 ${edge.value} 次\n${edge.title}`);
            }
        }
    });
}

// ========== 剧本解析总结 ==========
async function loadScriptAnalysis(scriptData) {
    if (!analysisContent) return;
    analysisContent.innerHTML = '<div class="text-gray-400">正在分析剧本...</div>';
    try {
        const response = await fetch('/api/analysis/summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(scriptData)
        });
        if (!response.ok) throw new Error('分析失败');
        const data = await response.json();
        renderAnalysis(data);
    } catch (err) {
        analysisContent.innerHTML = `<div class="text-red-400">分析失败: ${err.message}</div>`;
    }
}

function renderAnalysis(data) {
    let html = `
        <div class="bg-gray-800 p-3 rounded">
            <h4 class="font-semibold text-purple-300">📖 主题</h4>
            <p class="mt-1">${escapeHtml(data.theme || '无')}</p>
        </div>
        <div class="bg-gray-800 p-3 rounded">
            <h4 class="font-semibold text-purple-300">🎨 风格</h4>
            <p class="mt-1">${escapeHtml(data.style || '无')}</p>
        </div>
        <div class="bg-gray-800 p-3 rounded">
            <h4 class="font-semibold text-purple-300">📐 情节结构</h4>
            <p class="mt-1">${escapeHtml(data.structure || '无')}</p>
        </div>
        <div class="bg-gray-800 p-3 rounded">
            <h4 class="font-semibold text-purple-300">👤 角色弧线</h4>
            <p class="mt-1">${escapeHtml(data.character_arcs || '无')}</p>
        </div>
        <div class="bg-gray-800 p-3 rounded">
            <h4 class="font-semibold text-purple-300">✨ 亮点</h4>
            <ul class="list-disc list-inside mt-1">
                ${(data.highlights || []).map(h => `<li>${escapeHtml(h)}</li>`).join('')}
            </ul>
        </div>
        <div class="bg-gray-800 p-3 rounded">
            <h4 class="font-semibold text-purple-300">💡 改进建议</h4>
            <ul class="list-disc list-inside mt-1">
                ${(data.suggestions || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}
            </ul>
        </div>
    `;
    analysisContent.innerHTML = html;
}

// ========== AI 聊天功能 ==========
async function sendQuestion() {
    if (!currentScriptData) {
        alert('请先转换一部剧本');
        return;
    }
    const question = chatInput.value.trim();
    if (!question) return;
    const userMsgDiv = document.createElement('div');
    userMsgDiv.className = 'mb-2 text-right';
    userMsgDiv.innerHTML = `<span class="inline-block bg-purple-600 rounded-lg px-3 py-1 text-sm">${escapeHtml(question)}</span>`;
    chatHistory.appendChild(userMsgDiv);
    chatInput.value = '';
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'mb-2 text-left text-gray-400';
    loadingDiv.innerHTML = '<span class="inline-block bg-gray-700 rounded-lg px-3 py-1 text-sm">思考中...</span>';
    chatHistory.appendChild(loadingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    try {
        const response = await fetch('/api/chat2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ script: currentScriptData, question: question })
        });
        if (!response.ok) throw new Error('聊天请求失败');
        const data = await response.json();
        loadingDiv.remove();
        const answerDiv = document.createElement('div');
        answerDiv.className = 'mb-2 text-left';
        answerDiv.innerHTML = `<span class="inline-block bg-gray-700 rounded-lg px-3 py-1 text-sm">${escapeHtml(data.answer)}</span>`;
        chatHistory.appendChild(answerDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    } catch (err) {
        loadingDiv.innerHTML = `<span class="inline-block bg-red-600 rounded-lg px-3 py-1 text-sm">错误: ${err.message}</span>`;
    }
}

// ========== 模式与字数统计 ==========
function getActualMode() {
    const selectedMode = document.querySelector('input[name="mode"]:checked')?.value || 'short';
    const text = novelText.value.trim();
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const isLong = (selectedMode === 'long' || chineseChars >= 10000);
    let reason = '';
    if (selectedMode === 'long') {
        reason = '用户手动选择长文本模式';
    } else if (chineseChars >= 10000) {
        reason = '文本超过1万字，自动切换为长文本模式';
    } else {
        reason = '文本不足1万字，使用短文本模式';
    }
    return { mode: isLong ? 'long' : 'short', reason };
}

function updateModeIndicator() {
    const actual = getActualMode();
    const modeText = actual.mode === 'long' ? '长文本模式 (分段处理)' : '短文本模式 (一次性生成)';
    activeModeText.innerText = modeText;
    activeModeReason.innerText = actual.reason;
}

function updateCharCount(text) {
    const totalChars = text.length;
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    charCountSpan.innerText = totalChars;
    wordCountSpan.innerText = chineseChars;
    const selectedMode = document.querySelector('input[name="mode"]:checked')?.value || 'short';
    const isLong = chineseChars >= 10000;
    if (selectedMode === 'short' && isLong) {
        modeHint.innerHTML = '<span class="text-yellow-400">⚠️ 当前文本超过1万字，建议切换到“长文本模式”以获得更好的处理效果。</span>';
    } else if (selectedMode === 'long' && !isLong) {
        modeHint.innerHTML = '<span class="text-blue-400">💡 文本较短，使用“短文本模式”速度更快。</span>';
    } else {
        modeHint.innerHTML = '';
    }
    updateModeIndicator();
}

novelText.addEventListener('input', (e) => updateCharCount(e.target.value));
modeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        if (novelText.value.trim()) updateCharCount(novelText.value);
    });
});

// ========== 转换主函数 ==========
const progressSteps = [
    "📖 正在解析小说章节...",
    "👥 正在提取角色信息...",
    "🎬 正在规划场景框架...",
    "✍️ 正在生成剧本内容...",
    "📊 正在添加统计信息..."
];

async function convertNovel(text, title, style) {
    setLoading(true);
    setStatus('转换中...');
    let stepIndex = 0;
    progressInterval = setInterval(() => {
        if (stepIndex < progressSteps.length) {
            setStatus(progressSteps[stepIndex]);
            stepIndex++;
        } else {
            setStatus(progressSteps[progressSteps.length - 1]);
        }
    }, 3000);
    try {
        const actual = getActualMode();
        const apiUrl = actual.mode === 'long' ? '/api/convert/long' : '/api/convert';
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, title: title, style: style })
        });
        if (!response.ok) throw new Error(`服务器错误 ${response.status}`);
        const scriptData = await response.json();
        currentScriptData = scriptData;
        displayYaml(scriptData);
        renderScenes(scriptData);
        renderCharacters(scriptData);
        renderStats(scriptData);
        enableExportButtons();
        loadRelationGraph(scriptData);
        loadScriptAnalysis(scriptData);
        if (progressInterval) clearInterval(progressInterval);
        setStatus('转换成功');
        if (chatInput) chatInput.disabled = false;
        if (sendChatBtn) sendChatBtn.disabled = false;
    } catch (err) {
        console.error(err);
        if (progressInterval) clearInterval(progressInterval);
        setStatus('转换失败', true);
        if (yamlOutput) yamlOutput.innerHTML = `<code class="language-yaml">错误: ${err.message}</code>`;
        if (scenesContainer) scenesContainer.innerHTML = '<div class="p-4 text-red-400">转换失败，无法显示场景信息</div>';
        if (charactersContainer) charactersContainer.innerHTML = '<div class="p-4 text-red-400">转换失败，无法显示角色信息</div>';
    } finally {
        setLoading(false);
    }
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
    });
}

async function onFileSelected(file) {
    if (!file || !file.name.endsWith('.txt')) {
        alert('请选择 .txt 文件');
        return;
    }
    const content = await readFile(file);
    novelText.value = content;
    updateCharCount(content);
    const title = file.name.replace(/\.txt$/, '');
    await convertNovel(content, title, styleSelect.value);
}

// ========== 事件绑定 ==========
if (dropZone) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-purple-500'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-purple-500'));
    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-purple-500');
        const file = e.dataTransfer.files[0];
        if (file) await onFileSelected(file);
    });
}
if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
        if (e.target.files.length) await onFileSelected(e.target.files[0]);
    });
}
if (convertBtn) {
    convertBtn.addEventListener('click', async () => {
        const text = novelText.value.trim();
        if (!text) { alert('请先粘贴小说内容或上传文件'); return; }
        await convertNovel(text, '用户小说', styleSelect.value);
    });
}

if (copyBtn) {
    copyBtn.addEventListener('click', () => {
        if (!currentScriptData) return;
        navigator.clipboard.writeText(jsyaml.dump(currentScriptData));
        alert('已复制 YAML');
    });
}
if (exportYamlBtn) {
    exportYamlBtn.addEventListener('click', () => {
        if (!currentScriptData) return;
        const blob = new Blob([jsyaml.dump(currentScriptData)], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'script.yaml'; a.click(); URL.revokeObjectURL(url);
    });
}
if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => {
        if (!currentScriptData) return;
        const blob = new Blob([JSON.stringify(currentScriptData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'script.json'; a.click(); URL.revokeObjectURL(url);
    });
}
if (exportAllBtn) {
    exportAllBtn.addEventListener('click', async () => {
        if (!currentScriptData) return;
        try {
            const response = await fetch('/api/export/all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentScriptData)
            });
            if (!response.ok) throw new Error('导出失败');
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'script_export.zip';
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            alert('导出失败：' + err.message);
        }
    });
}

if (sendChatBtn) sendChatBtn.addEventListener('click', sendQuestion);
if (chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendQuestion(); });

// ========== 选项卡切换 ==========
function updateTabActive(activeBtn) {
    const btns = [tabScenesBtn, tabCharactersBtn, tabYamlBtn, tabRelationBtn, tabAnalysisBtn];
    btns.forEach(btn => {
        if (!btn) return;
        btn.classList.remove('border-purple-400', 'text-purple-400', 'border-b-2');
        btn.classList.add('border-transparent');
    });
    if (activeBtn) {
        activeBtn.classList.add('border-purple-400', 'text-purple-400', 'border-b-2');
        activeBtn.classList.remove('border-transparent');
    }
}

if (tabScenesBtn) {
    tabScenesBtn.addEventListener('click', () => {
        scenesContainer.classList.remove('hidden');
        charactersContainer.classList.add('hidden');
        yamlContainer.classList.add('hidden');
        relationContainer.classList.add('hidden');
        analysisContainer.classList.add('hidden');
        updateTabActive(tabScenesBtn);
    });
}
if (tabCharactersBtn) {
    tabCharactersBtn.addEventListener('click', () => {
        scenesContainer.classList.add('hidden');
        charactersContainer.classList.remove('hidden');
        yamlContainer.classList.add('hidden');
        relationContainer.classList.add('hidden');
        analysisContainer.classList.add('hidden');
        updateTabActive(tabCharactersBtn);
    });
}
if (tabYamlBtn) {
    tabYamlBtn.addEventListener('click', () => {
        scenesContainer.classList.add('hidden');
        charactersContainer.classList.add('hidden');
        yamlContainer.classList.remove('hidden');
        relationContainer.classList.add('hidden');
        analysisContainer.classList.add('hidden');
        updateTabActive(tabYamlBtn);
    });
}
if (tabRelationBtn) {
    tabRelationBtn.addEventListener('click', () => {
        scenesContainer.classList.add('hidden');
        charactersContainer.classList.add('hidden');
        yamlContainer.classList.add('hidden');
        relationContainer.classList.remove('hidden');
        analysisContainer.classList.add('hidden');
        updateTabActive(tabRelationBtn);
        if (network && relationData) {
            setTimeout(() => network.redraw(), 100);
        }
    });
}
if (tabAnalysisBtn) {
    tabAnalysisBtn.addEventListener('click', () => {
        scenesContainer.classList.add('hidden');
        charactersContainer.classList.add('hidden');
        yamlContainer.classList.add('hidden');
        relationContainer.classList.add('hidden');
        analysisContainer.classList.remove('hidden');
        updateTabActive(tabAnalysisBtn);
    });
}

// 初始化
hljs.highlightAll();
yamlContainer.classList.remove('hidden');
scenesContainer.classList.add('hidden');
charactersContainer.classList.add('hidden');
relationContainer.classList.add('hidden');
analysisContainer.classList.add('hidden');