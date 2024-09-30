(async function () {
    const { ipcRenderer } = require('electron');

    // 获取DOM元素
    const dataListContent = document.getElementById('data-list-content');
    const fetchDataButton = document.getElementById('fetch-data-button');
    const filterButton = document.getElementById('filter-button');
    const lastFetchTimeElement = document.getElementById('last-fetch-time');

    // 获取模态窗口的DOM元素
    const fetchProgressModal = document.getElementById('fetch-progress-modal');
    const fetchProgressBar = document.getElementById('progress-bar');
    const fetchProgressPercentage = document.getElementById('fetch-progress-percentage');

    const filterModal = document.getElementById('filter-modal');
    const closeFilterModal = document.getElementById('close-filter-modal');
    const filterForm = document.getElementById('filter-form');

    // 通用提示窗口元素
    const messageModal = document.getElementById('message-modal');
    const messageModalTitle = document.getElementById('message-modal-title');
    const messageModalContent = document.getElementById('message-modal-content');
    const messageModalCloseButton = document.getElementById('message-modal-close-button');

    // 关闭提示窗口
    messageModalCloseButton.addEventListener('click', () => {
        hideModal(messageModal);
    });

    // 排序状态
    let sortKey = null;
    let sortOrder = 'asc'; // asc = 升序, desc = 降序

    // 初始化：加载数据列表
    loadDataList();

    // 点击表头进行排序
    document.querySelectorAll('.data-list-header .data-list-column').forEach(column => {
        const sortKeyAttr = column.getAttribute('data-sort-key');
        if (sortKeyAttr) {
            column.style.cursor = 'pointer'; // 添加手型指针
            column.addEventListener('click', () => {
                handleSort(sortKeyAttr);
            });
        }
    });

    // 加载数据列表函数
    async function loadDataList() {
        // 清空列表
        dataListContent.innerHTML = '';

        // 显示加载动画
        dataListContent.innerHTML = '<div class="loading">加载中...</div>';

        // 获取用户数据
        const users = await ipcRenderer.invoke('get-users');

        // 对数据进行排序
        if (sortKey) {
            users.sort((a, b) => {
                const valueA = a[sortKey] ?? 0;
                const valueB = b[sortKey] ?? 0;
                if (sortOrder === 'asc') {
                    return valueA - valueB;
                } else {
                    return valueB - valueA;
                }
            });
        }

        // 清空内容并开始生成列表
        dataListContent.innerHTML = '';

        // 遍历用户数据，生成列表项
        users.forEach((user, index) => {
            const dataItem = document.createElement('div');
            dataItem.classList.add('data-list-item');

            dataItem.innerHTML = `
                <div class="data-list-column id-column">${index + 1}</div>
                <div class="data-list-column name-column">${user.name || ''}</div>
                <div class="data-list-column redid-column">${user.redId || ''}</div>
                <div class="data-list-column impMedian-column">${user.impMedian ?? 0}</div>
                <div class="data-list-column readMedian-column">${user.readMedian ?? 0}</div>
                <div class="data-list-column notes-column">${user.notesNumber ?? 0}</div>
                <div class="data-list-column bus-notes-column">${user.busNotesNumber ?? 0}</div>
            `;
            dataListContent.appendChild(dataItem);
        });

        // 更新上次拉取数据的时间
        const lastFetchTime = localStorage.getItem('lastFetchTime');
        if (lastFetchTime) {
            lastFetchTimeElement.textContent = lastFetchTime;
        } else {
            lastFetchTimeElement.textContent = '未拉取过数据';
        }
    }

    // 处理排序
    function handleSort(key) {
        if (sortKey === key) {
            // 如果再次点击相同列，切换排序顺序
            sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            // 切换到新列，默认升序
            sortKey = key;
            sortOrder = 'asc';
        }
        loadDataList(); // 重新加载并排序数据
    }

    // 点击“拉取用户运营数据”按钮
    fetchDataButton.addEventListener('click', async () => {
        // 检查是否已填写 Cookie
        const customCookie = await ipcRenderer.invoke('get-custom-cookie');
        if (!customCookie) {
            messageModalTitle.textContent = '提示';
            messageModalContent.innerHTML = '请先在设置中填写 Cookie';
            showModal(messageModal);
            return;
        }

        // 获取用户数据
        const users = await ipcRenderer.invoke('get-users');

        if (users.length === 0) {
            messageModalTitle.textContent = '提示';
            messageModalContent.textContent = '没有用户数据可拉取';
            showModal(messageModal);
            return;
        }

        // 显示拉取数据进度窗口
        showModal(fetchProgressModal);

        let completed = 0;
        let hasError = false;

        for (const user of users) {
            try {
                // 更新进度条
                completed++;
                const progress = Math.round((completed / users.length) * 100);
                fetchProgressBar.style.width = `${progress}%`;
                fetchProgressPercentage.textContent = progress;

                // 获取用户信息
                const userInfoResponse = await ipcRenderer.invoke('fetch-user-info', user.userId);
                if (!userInfoResponse.success) {
                    if (userInfoResponse.code === 908) {
                        messageModalTitle.textContent = '拉取失败';
                        messageModalContent.textContent = 'Cookie已过期，请前往设置中重新设置。';
                        showModal(messageModal);
                        hasError = true;
                        break;
                    } else {
                        console.error(`拉取用户 ${user.userId} 信息失败：`, userInfoResponse.message);
                        messageModalTitle.textContent = '拉取失败';
                        messageModalContent.textContent = `拉取用户 ${user.name || user.userId} 信息失败。`;
                        showModal(messageModal);
                        hasError = true;
                        break;
                    }
                }
                const userInfo = userInfoResponse.data;

                // 获取运营数据
                const operationDataResponse = await ipcRenderer.invoke('fetch-operation-data', user.userId);
                if (!operationDataResponse.success) {
                    if (operationDataResponse.code === 908) {
                        messageModalTitle.textContent = '拉取失败';
                        messageModalContent.textContent = 'Cookie已过期，请前往设置中重新设置。';
                        showModal(messageModal);
                        hasError = true;
                        break;
                    } else {
                        console.error(`拉取用户 ${user.userId} 运营数据失败：`, operationDataResponse.message);
                        messageModalTitle.textContent = '拉取失败';
                        messageModalContent.textContent = `拉取用户 ${user.name || user.userId} 运营数据失败。`;
                        showModal(messageModal);
                        hasError = true;
                        break;
                    }
                }
                const operationData = operationDataResponse.data;

                // 获取合作笔记数据
                const busNotesDataResponse = await ipcRenderer.invoke('fetch-busbotes-data', user.userId);
                if (!busNotesDataResponse.success) {
                    if (busNotesDataResponse.code === 908) {
                        messageModalTitle.textContent = '拉取失败';
                        messageModalContent.textContent = 'Cookie已过期，请前往设置中重新设置。';
                        showModal(messageModal);
                        hasError = true;
                        break;
                    } else {
                        console.error(`拉取用户 ${user.userId} 合作笔记数据失败：`, busNotesDataResponse.message);
                        messageModalTitle.textContent = '拉取失败';
                        messageModalContent.textContent = `拉取用户 ${user.name || user.userId} 合作笔记数据失败。`;
                        showModal(messageModal);
                        hasError = true;
                        break;
                    }
                }
                const busNotesData = busNotesDataResponse.data;

                // 更新用户数据
                const updatedUser = {
                    ...user,
                    redId: userInfo?.data?.redId || '',
                    impMedian: operationData?.data?.impMedian ?? 0,
                    readMedian: operationData?.data?.readMedian ?? 0,
                    notesNumber: operationData?.data?.noteNumber ?? 0,
                    busNotesNumber: busNotesData?.data?.noteNumber ?? 0,
                };

                await ipcRenderer.invoke('update-user', updatedUser);
            } catch (error) {
                // 捕获其他可能的错误
                console.error(`处理用户 ${user.userId} 时发生错误：`, error);
                messageModalTitle.textContent = '拉取失败';
                messageModalContent.textContent = `拉取用户 ${user.name || user.userId} 数据失败。`;
                showModal(messageModal);
                hasError = true;
                break;
            }
        }

        // 隐藏拉取数据进度窗口
        hideModal(fetchProgressModal);

        if (!hasError) {
            // 更新上次拉取数据的时间
            const currentTime = new Date().toLocaleString();
            localStorage.setItem('lastFetchTime', currentTime);
            lastFetchTimeElement.textContent = currentTime;

            // 重新加载数据列表
            loadDataList();
        }
    });

    // 点击“过滤”按钮
    filterButton.addEventListener('click', () => {
        showModal(filterModal);
    });

    // 关闭过滤窗口
    closeFilterModal.addEventListener('click', () => {
        hideModal(filterModal);
    });

    // 提交过滤表单
    filterForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const selectedColumns = Array.from(filterForm.elements['columns'])
            .filter(input => input.checked)
            .map(input => input.value);

        // 获取所有列
        const allColumns = [
            'redid-column',
            'impMedian-column',
            'readMedian-column',
            'notes-column',
            'bus-notes-column',
        ];

        // 更新列的显示状态
        allColumns.forEach(columnClass => {
            const elements = document.querySelectorAll(`.${columnClass}`);
            if (selectedColumns.includes(columnClass)) {
                elements.forEach(el => el.style.display = '');
            } else {
                elements.forEach(el => el.style.display = 'none');
            }
        });

        hideModal(filterModal);
    });

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
        if (event.target == filterModal) {
            hideModal(filterModal);
        }
        if (event.target == fetchProgressModal) {
            // 禁止点击进度窗口外部关闭窗口
            event.stopPropagation();
        }
    });

})();
