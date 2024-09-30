// pages/settings/settings.js

(async function () {
    const { ipcRenderer } = require('electron');

    // 获取DOM元素
    const customCookieInput = document.getElementById('custom-cookie');
    const saveCookieButton = document.getElementById('save-cookie-button');
    const checkUpdateButton = document.getElementById('check-update-button');
    const currentVersionElement = document.getElementById('current-version');
    const saveLogButton = document.getElementById('save-log-button');

    // 模态窗口元素
    const newVersionModal = document.getElementById('new-version-modal');
    const updateLogElement = document.getElementById('update-log');
    const downloadButton = document.getElementById('download-button');
    const cancelButton = document.getElementById('cancel-button');

    const downloadProgressModal = document.getElementById('download-progress-modal');
    const progressBar = document.getElementById('progress-bar');
    const downloadProgressPercentage = document.getElementById('download-progress-percentage');

    const downloadCompleteModal = document.getElementById('download-complete-modal');
    const installButton = document.getElementById('install-button');
    const closeDownloadCompleteModal = document.getElementById('close-download-complete-modal');

    const latestVersionModal = document.getElementById('latest-version-modal');
    const closeLatestVersionModal = document.getElementById('close-latest-version-modal');

    // 通用提示窗口元素
    const messageModal = document.getElementById('message-modal');
    const messageModalTitle = document.getElementById('message-modal-title');
    const messageModalContent = document.getElementById('message-modal-content');
    const messageModalCloseButton = document.getElementById('message-modal-close-button');

    // 当前版本号
    const currentVersion = '1.0.2';
    currentVersionElement.textContent = currentVersion;

    // 初始化：加载自定义Cookie
    loadCustomCookie();

    // 加载自定义Cookie
    async function loadCustomCookie() {
        const savedCookie = await ipcRenderer.invoke('get-custom-cookie');
        if (savedCookie) {
            customCookieInput.value = savedCookie;
        }
    }

    // 保存自定义Cookie
    saveCookieButton.addEventListener('click', async () => {
        const customCookie = customCookieInput.value.trim();
        await ipcRenderer.invoke('save-custom-cookie', customCookie);
        // 使用模态窗口显示提示
        messageModalTitle.textContent = '提示';
        messageModalContent.textContent = 'Cookie已保存';
        showModal(messageModal);
    });

    // 保存调试Log
    saveLogButton.addEventListener('click', async () => {
        const logPath = await ipcRenderer.invoke('save-debug-log');
        // 使用模态窗口显示提示
        messageModalTitle.textContent = '提示';
        messageModalContent.textContent = `调试日志已保存到桌面：${logPath}`;
        showModal(messageModal);
    });

    // 检查更新逻辑
    checkUpdateButton.addEventListener('click', async () => {
        checkUpdateButton.textContent = '开始检查更新...';

        const updateInfo = await ipcRenderer.invoke('check-for-updates');

        // 恢复按钮文本
        checkUpdateButton.textContent = '检查更新';

        if (updateInfo) {
            const latestVersion = updateInfo.version;
            const updateDate = formatDate(updateInfo.date); // 格式化日期

            if (compareVersions(currentVersion, latestVersion) < 0) {
                // 有新版本
                updateLogElement.innerHTML = (updateInfo.msg || '暂无更新日志').replace(/\n/g, '<br>');

                // 显示新版本号和日期
                document.getElementById('version-date').textContent = `版本：${latestVersion} 日期：${updateDate}`;

                showModal(newVersionModal);

                // 处理下载
                downloadButton.onclick = () => {
                    hideModal(newVersionModal);
                    startDownload(updateInfo.link);
                };

                cancelButton.onclick = () => {
                    hideModal(newVersionModal);
                };
            } else {
                // 已是最新版本
                messageModalTitle.textContent = '提示';
                messageModalContent.textContent = '已是最新版本';
                showModal(messageModal);
            }
        } else {
            // 检查更新失败
            messageModalTitle.textContent = '错误';
            messageModalContent.textContent = '检查更新失败';
            showModal(messageModal);
        }
    });

    // 日期格式化函数
    function formatDate(dateString) {
        // 假设日期格式为 "YYYY.M.D-HH:mm"
        const [datePart, timePart] = dateString.split('-');
        const [year, month, day] = datePart.split('.').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);

        // 格式化日期字符串
        return `${year}年${month}月${day}日 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }

    // 开始下载更新
    function startDownload(downloadUrl) {
        showModal(downloadProgressModal);

        ipcRenderer.invoke('download-update', downloadUrl);

        // 接收下载进度
        ipcRenderer.on('download-progress', (event, progress) => {
            progressBar.style.width = `${progress}%`;
            downloadProgressPercentage.textContent = progress.toFixed(2);
        });

        // 下载完成
        ipcRenderer.on('download-complete', () => {
            hideModal(downloadProgressModal);
            showModal(downloadCompleteModal);
        });
    }

    // 安装更新
    installButton.addEventListener('click', () => {
        ipcRenderer.invoke('install-update');
    });

    closeDownloadCompleteModal.addEventListener('click', () => {
        hideModal(downloadCompleteModal);
    });

    // 通用提示窗口关闭按钮
    messageModalCloseButton.addEventListener('click', () => {
        hideModal(messageModal);
    });

    // 比较版本号
    function compareVersions(v1, v2) {
        const v1Parts = v1.split('.').map(Number);
        const v2Parts = v2.split('.').map(Number);

        for (let i = 0; i < v1Parts.length; i++) {
            if (v1Parts[i] < v2Parts[i]) {
                return -1;
            } else if (v1Parts[i] > v2Parts[i]) {
                return 1;
            }
        }
        return 0;
    }

    // 显示模态窗口函数
    function showModal(modal) {
        modal.classList.add('show');
        setTimeout(() => {
            modal.classList.add('visible');
        }, 10);
    }

    // 隐藏模态窗口函数
    function hideModal(modal) {
        modal.classList.remove('visible');
        modal.addEventListener('transitionend', function onTransitionEnd() {
            modal.classList.remove('show');
            modal.removeEventListener('transitionend', onTransitionEnd);
        });
    }

    // 点击窗口外部关闭模态窗口
    window.addEventListener('click', (event) => {
        if (event.target == newVersionModal) {
            hideModal(newVersionModal);
        }
        if (event.target == downloadProgressModal) {
            // 禁止点击进度窗口外部关闭窗口
            event.stopPropagation();
        }
        if (event.target == downloadCompleteModal) {
            hideModal(downloadCompleteModal);
        }
        if (event.target == messageModal) {
            hideModal(messageModal);
        }
    });

})();
