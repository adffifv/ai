// DOM 元素
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

let currentScriptData = null;
let statsChart = null;

function setStatus(text, isError = false) {
    statusBadge.innerText = text;
    statusBadge.className = `text-xs px-2 py-1 rounded-full ${isError ? 'bg-red-600' : 'bg-purple-600'}`;
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

function enableExportButtons() {
    copyBtn.disabled = false;
    exportYamlBtn.disabled = false;
    exportJsonBtn.disabled = false;
}

async function convertNovel(text, title, style) {
    setStatus('转换中...');
    convertBtn.disabled = true;
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
        renderStats(scriptData);
        enableExportButtons();
        setStatus('转换成功');
    } catch (err) {
        console.error(err);
        setStatus('转换失败', true);
        yamlOutput.innerHTML = `<code class="language-yaml">错误: ${err.message}</code>`;
    } finally {
        convertBtn.disabled = false;
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
    const title = file.name.replace(/\.txt$/, '');
    await convertNovel(content, title, styleSelect.value);
}

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
convertBtn.addEventListener('click', async () => {
    const text = novelText.value.trim();
    if (!text) { alert('请先粘贴小说内容或上传文件'); return; }
    await convertNovel(text, '用户小说', styleSelect.value);
});
copyBtn.addEventListener('click', () => {
    if (!currentScriptData) return;
    navigator.clipboard.writeText(jsyaml.dump(currentScriptData));
    alert('已复制 YAML');
});
exportYamlBtn.addEventListener('click', () => {
    if (!currentScriptData) return;
    const blob = new Blob([jsyaml.dump(currentScriptData)], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'script.yaml'; a.click(); URL.revokeObjectURL(url);
});
exportJsonBtn.addEventListener('click', () => {
    if (!currentScriptData) return;
    const blob = new Blob([JSON.stringify(currentScriptData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'script.json'; a.click(); URL.revokeObjectURL(url);
});
hljs.highlightAll();