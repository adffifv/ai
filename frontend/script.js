// frontend/script.js
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const novelText = document.getElementById('novelText');
const convertBtn = document.getElementById('convertBtn');
const yamlOutput = document.getElementById('yamlOutput');
const copyBtn = document.getElementById('copyBtn');
const exportYamlBtn = document.getElementById('exportYamlBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const statusBadge = document.getElementById('statusBadge');
const statsPanel = document.getElementById('statsPanel');
const styleSelect = document.getElementById('styleSelect');
const loadingIcon = document.getElementById('loadingIcon');
const convertText = document.getElementById('convertText');

// 选项卡元素
const tabScenesBtn = document.getElementById('tabScenesBtn');
const tabCharactersBtn = document.getElementById('tabCharactersBtn');
const tabYamlBtn = document.getElementById('tabYamlBtn');
const scenesContainer = document.getElementById('scenesContainer');
const charactersContainer = document.getElementById('charactersContainer');
const yamlContainer = document.getElementById('yamlContainer');

// AI 聊天元素
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const chatHistory = document.getElementById('chatHistory');

let currentScriptData = null;
let statsChart = null;

// 辅助函数：获取角色名称
function getCharacterName(scriptData, charId) {
    const char = scriptData.characters?.find(c => c.id === charId);
    return char ? char.name : charId;
}

// 渲染场景信息（卡片形式）
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

// 渲染角色信息（卡片形式）
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

// 显示 YAML 并高亮
function displayYaml(jsonData) {
    const yamlStr = jsyaml.dump(jsonData, { indent: 2, lineWidth: -1 });
    const highlighted = hljs.highlight(yamlStr, { language: 'yaml' }).value;
    yamlOutput.innerHTML = `<code class="language-yaml">${highlighted}</code>`;
    return yamlStr;
}

// 渲染统计图表
function renderStats(scriptData) {
    const stats = scriptData.stats;
    if (!stats || !stats.character_dialogues || Object.keys(stats.character_dialogues).length === 0) {
        statsPanel.classList.add('hidden');
        return;
    }
    statsPanel.classList.remove('hidden');
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

// 启用导出按钮
function enableExportButtons() {
    copyBtn.disabled = false;
    exportYamlBtn.disabled = false;
    exportJsonBtn.disabled = false;
}

// 设置加载状态
function setLoading(isLoading) {
    if (isLoading) {
        convertBtn.disabled = true;
        loadingIcon.classList.remove('hidden');
        convertText.innerText = '转换中...';
    } else {
        convertBtn.disabled = false;
        loadingIcon.classList.add('hidden');
        convertText.innerText = '开始转换剧本';
    }
}

// 设置状态文本
function setStatus(text, isError = false) {
    statusBadge.innerText = text;
    statusBadge.className = `text-xs px-2 py-1 rounded-full ${isError ? 'bg-red-600' : 'bg-purple-600'}`;
}

// 调用后端转换
async function convertNovel(text, title, style) {
    setLoading(true);
    setStatus('转换中...');
    try {
        const response = await fetch('/api/convert', {
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
        setStatus('转换成功');
        // 激活聊天窗口（可发送消息）
        chatInput.disabled = false;
        sendChatBtn.disabled = false;
    } catch (err) {
        console.error(err);
        setStatus('转换失败', true);
        yamlOutput.innerHTML = `<code class="language-yaml">错误: ${err.message}</code>`;
        scenesContainer.innerHTML = '<div class="p-4 text-red-400">转换失败，无法显示场景信息</div>';
        charactersContainer.innerHTML = '<div class="p-4 text-red-400">转换失败，无法显示角色信息</div>';
    } finally {
        setLoading(false);
    }
}

// 读取文件
function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
    });
}

// 文件选择处理
async function onFileSelected(file) {
    if (!file || !file.name.endsWith('.txt')) {
        alert('请选择 .txt 文件');
        return;
    }
    const content = await readFile(file);
    novelText.value = content;
    const title = file.name.replace(/\.txt$/, '');
    await convertNovel(content, title, styleSelect.value);
}

// 事件绑定：拖拽上传、点击上传
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-purple-500'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-purple-500'));
dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-purple-500');
    const file = e.dataTransfer.files[0];
    if (file) await onFileSelected(file);
});
fileInput.addEventListener('change', async (e) => {
    if (e.target.files.length) await onFileSelected(e.target.files[0]);
});

// 转换按钮（使用文本框内容）
convertBtn.addEventListener('click', async () => {
    const text = novelText.value.trim();
    if (!text) { alert('请先粘贴小说内容或上传文件'); return; }
    await convertNovel(text, '用户小说', styleSelect.value);
});

// 导出功能
copyBtn.addEventListener('click', () => {
    if (!currentScriptData) return;
    const yamlStr = jsyaml.dump(currentScriptData);
    navigator.clipboard.writeText(yamlStr);
    alert('已复制 YAML 到剪贴板');
});
exportYamlBtn.addEventListener('click', () => {
    if (!currentScriptData) return;
    const yamlStr = jsyaml.dump(currentScriptData);
    const blob = new Blob([yamlStr], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'script.yaml'; a.click(); URL.revokeObjectURL(url);
});
exportJsonBtn.addEventListener('click', () => {
    if (!currentScriptData) return;
    const jsonStr = JSON.stringify(currentScriptData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'script.json'; a.click(); URL.revokeObjectURL(url);
});

// 选项卡切换
tabScenesBtn.addEventListener('click', () => {
    scenesContainer.classList.remove('hidden');
    charactersContainer.classList.add('hidden');
    yamlContainer.classList.add('hidden');
    tabScenesBtn.classList.add('border-purple-400', 'text-purple-400');
    tabCharactersBtn.classList.remove('border-purple-400', 'text-purple-400');
    tabYamlBtn.classList.remove('border-purple-400', 'text-purple-400');
    tabScenesBtn.classList.add('border-b-2');
    tabCharactersBtn.classList.remove('border-b-2');
    tabYamlBtn.classList.remove('border-b-2');
});
tabCharactersBtn.addEventListener('click', () => {
    scenesContainer.classList.add('hidden');
    charactersContainer.classList.remove('hidden');
    yamlContainer.classList.add('hidden');
    tabCharactersBtn.classList.add('border-purple-400', 'text-purple-400');
    tabScenesBtn.classList.remove('border-purple-400', 'text-purple-400');
    tabYamlBtn.classList.remove('border-purple-400', 'text-purple-400');
    tabCharactersBtn.classList.add('border-b-2');
    tabScenesBtn.classList.remove('border-b-2');
    tabYamlBtn.classList.remove('border-b-2');
});
tabYamlBtn.addEventListener('click', () => {
    scenesContainer.classList.add('hidden');
    charactersContainer.classList.add('hidden');
    yamlContainer.classList.remove('hidden');
    tabYamlBtn.classList.add('border-purple-400', 'text-purple-400');
    tabScenesBtn.classList.remove('border-purple-400', 'text-purple-400');
    tabCharactersBtn.classList.remove('border-purple-400', 'text-purple-400');
    tabYamlBtn.classList.add('border-b-2');
    tabScenesBtn.classList.remove('border-b-2');
    tabCharactersBtn.classList.remove('border-b-2');
});

// AI 聊天功能
async function sendQuestion() {
    if (!currentScriptData) {
        alert('请先转换一部剧本');
        return;
    }
    const question = chatInput.value.trim();
    if (!question) return;
    // 显示用户消息
    const userMsgDiv = document.createElement('div');
    userMsgDiv.className = 'mb-2 text-right';
    userMsgDiv.innerHTML = `<span class="inline-block bg-purple-600 rounded-lg px-3 py-1 text-sm">${escapeHtml(question)}</span>`;
    chatHistory.appendChild(userMsgDiv);
    chatInput.value = '';
    // 显示加载中
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
        // 替换加载中的消息
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
sendChatBtn.addEventListener('click', sendQuestion);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendQuestion();
});

// 简单转义HTML
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

// 初始化 hljs
hljs.highlightAll();
// 默认显示 YAML 容器
yamlContainer.classList.remove('hidden');
scenesContainer.classList.add('hidden');
charactersContainer.classList.add('hidden');