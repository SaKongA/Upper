// pages/userList/userList.js

(function() {
    const { ipcRenderer } = require('electron');
  
    // 获取DOM元素
    const userListContent = document.getElementById('user-list-content');
    const refreshButton = document.getElementById('refresh-button');
    const addButton = document.getElementById('add-button');
    const deleteButton = document.getElementById('delete-button');
    const selectAllCheckbox = document.getElementById('select-all');
  
    // 获取详情窗口的 DOM 元素
    const detailModal = document.getElementById('detail-modal');
    const closeDetailModal = document.getElementById('close-detail-modal');
    const detailName = document.getElementById('detail-name');
    const detailUserId = document.getElementById('detail-userId');
    const detailAddDate = document.getElementById('detail-addDate');
    const detailTraceId = document.getElementById('detail-traceId');
  
    // 获取选择添加方式窗口的 DOM 元素
    const addChoiceModal = document.getElementById('add-choice-modal');
    const closeAddChoiceModal = document.getElementById('close-add-choice-modal');
    const manualAddButton = document.getElementById('manual-add-button');
    const autoExtractButton = document.getElementById('auto-extract-button');
  
    // 获取手动添加用户窗口的 DOM 元素
    const addModal = document.getElementById('add-modal');
    const closeAddModal = document.getElementById('close-add-modal');
    const addUserForm = document.getElementById('add-user-form');
  
    // 获取自动提取窗口的 DOM 元素
    const autoExtractModal = document.getElementById('auto-extract-modal');
    const closeAutoExtractModal = document.getElementById('close-auto-extract-modal');
    const selectFileButton = document.getElementById('select-file-button');
    const selectedFileName = document.getElementById('selected-file-name');
    const extractButton = document.getElementById('extract-button');
  
    let selectedFilePath = null; // 存储选择的文件路径
    let extractedUsers = []; // 存储提取的用户数据
  
    // 获取扫描结果窗口的 DOM 元素
    const extractResultModal = document.getElementById('extract-result-modal');
    const closeExtractResultModal = document.getElementById('close-extract-result-modal');
    const userCount = document.getElementById('user-count');
    const saveExtractButton = document.getElementById('save-extract-button');
    const cancelExtractButton = document.getElementById('cancel-extract-button');
  
    // 获取删除确认窗口的 DOM 元素
    const confirmDeleteModal = document.getElementById('confirm-delete-modal');
    const closeConfirmDeleteModal = document.getElementById('close-confirm-delete-modal');
    const confirmDeleteButton = document.getElementById('confirm-delete-button');
    const cancelDeleteButton = document.getElementById('cancel-delete-button');
  
    // 获取未选择提示窗口的 DOM 元素
    const noSelectionModal = document.getElementById('no-selection-modal');
    const closeNoSelectionModal = document.getElementById('close-no-selection-modal');
    const noSelectionOkButton = document.getElementById('no-selection-ok-button');
  
    // 初始化：加载用户列表
    loadUserList();
  
    // 加载用户列表函数
    async function loadUserList() {
      // 清空列表
      userListContent.innerHTML = '';
  
      // 显示加载动画
      userListContent.innerHTML = '<div class="loading">加载中...</div>';
  
      // 获取用户数据
      const users = await ipcRenderer.invoke('get-users');
  
      // 按添加日期排序
      users.sort((a, b) => new Date(a.addDate) - new Date(b.addDate));
  
      // 清空内容并开始生成列表
      userListContent.innerHTML = '';
  
      // 遍历用户数据，生成列表项
      users.forEach((user, index) => {
        const userItem = document.createElement('div');
        userItem.classList.add('user-list-item');
  
        userItem.innerHTML = `
          <div class="user-list-column checkbox-column"><input type="checkbox" data-id="${user._id}"></div>
          <div class="user-list-column id-column">${index + 1}</div>
          <div class="user-list-column name-column">${user.name}</div>
          <div class="user-list-column date-column">${user.addDate}</div>
          <div class="user-list-column action-column">
            <button class="detail-button" data-id="${user._id}">详情</button>
          </div>
        `;
  
        userListContent.appendChild(userItem);
      });
  
      // 更新全选复选框状态
      updateSelectAllCheckbox();
    }
  
    // 绑定刷新按钮事件
    refreshButton.addEventListener('click', () => {
      loadUserList();
    });
  
    // 点击添加按钮，显示选择添加方式窗口
    addButton.addEventListener('click', () => {
      showModal(addChoiceModal);
    });
  
    // 关闭选择添加方式窗口
    closeAddChoiceModal.addEventListener('click', () => {
      hideModal(addChoiceModal);
    });
  
    // 手动添加按钮
    manualAddButton.addEventListener('click', () => {
      hideModal(addChoiceModal);
      showModal(addModal);
    });
  
    // 自动提取按钮
    autoExtractButton.addEventListener('click', () => {
      hideModal(addChoiceModal);
      showModal(autoExtractModal);
    });
  
    // 关闭手动添加窗口
    closeAddModal.addEventListener('click', () => {
      hideModal(addModal);
    });
  
    // 提交添加用户表单
    addUserForm.addEventListener('submit', async (event) => {
      event.preventDefault(); // 防止表单提交刷新页面
  
      const name = document.getElementById('name').value.trim();
      const userId = document.getElementById('userId').value.trim();
      const traceId = document.getElementById('traceId').value.trim();
  
      if (name && userId && traceId) {
        const newUser = {
          name,
          userId,
          traceId,
          addDate: new Date().toLocaleString(),
        };
  
        await ipcRenderer.invoke('add-user', newUser);
  
        // 关闭添加窗口
        hideModal(addModal);
  
        // 清空表单
        addUserForm.reset();
  
        // 重新加载用户列表
        loadUserList();
      } else {
        alert('请填写所有字段');
      }
    });
  
    // 关闭自动提取窗口
    closeAutoExtractModal.addEventListener('click', () => {
      hideModal(autoExtractModal);
      // 重置状态
      selectedFilePath = null;
      selectedFileName.textContent = '';
      extractedUsers = [];
    });
  
    // 点击“选择文件”按钮
    selectFileButton.addEventListener('click', async () => {
      // 调用主进程方法，打开文件选择对话框
      const filePath = await ipcRenderer.invoke('open-file-dialog');
      if (filePath) {
        selectedFilePath = filePath;
        const fileName = filePath.split(/[/\\]/).pop();
        selectedFileName.textContent = `已选择文件：${fileName}`;
      }
    });
  
    // 点击“下一步”进行提取
    extractButton.addEventListener('click', async () => {
      if (!selectedFilePath) {
        alert('请先选择一个 XLSX 文件');
        return;
      }
  
      // 调用主进程方法进行提取
      const users = await ipcRenderer.invoke('extract-users', selectedFilePath);
  
      extractedUsers = users; // 保存提取的数据
  
      // 显示扫描结果
      userCount.textContent = users.length;
  
      // 隐藏当前窗口，显示扫描结果窗口
      hideModal(autoExtractModal);
      showModal(extractResultModal);
    });
  
    // 关闭扫描结果窗口
    closeExtractResultModal.addEventListener('click', () => {
      hideModal(extractResultModal);
      // 重置状态
      selectedFilePath = null;
      selectedFileName.textContent = '';
      extractedUsers = [];
    });
  
    // 点击“保存”按钮
    saveExtractButton.addEventListener('click', async () => {
      // 将提取的用户保存到数据库
      for (const user of extractedUsers) {
        await ipcRenderer.invoke('add-user', user);
      }
  
      // 重置状态
      selectedFilePath = null;
      selectedFileName.textContent = '';
      extractedUsers = [];
  
      // 关闭扫描结果窗口
      hideModal(extractResultModal);
  
      // 重新加载用户列表
      loadUserList();
    });
  
    // 点击“取消”按钮
    cancelExtractButton.addEventListener('click', () => {
      // 重置状态
      selectedFilePath = null;
      selectedFileName.textContent = '';
      extractedUsers = [];
  
      // 关闭扫描结果窗口
      hideModal(extractResultModal);
    });
  
    // 绑定删除用户按钮事件
    deleteButton.addEventListener('click', async () => {
      // 获取选中的用户ID
      const checkboxes = userListContent.querySelectorAll('input[type="checkbox"]:checked');
      const ids = Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
  
      if (ids.length === 0) {
        // 显示未选择提示窗口
        showModal(noSelectionModal);
        return;
      }
  
      // 显示删除确认窗口
      showModal(confirmDeleteModal);
    });
  
    // 取消删除
    cancelDeleteButton.addEventListener('click', () => {
      hideModal(confirmDeleteModal);
    });
  
    // 关闭删除确认窗口
    closeConfirmDeleteModal.addEventListener('click', () => {
      hideModal(confirmDeleteModal);
    });
  
    // 确认删除
    confirmDeleteButton.addEventListener('click', async () => {
      // 获取选中的用户ID
      const checkboxes = userListContent.querySelectorAll('input[type="checkbox"]:checked');
      const ids = Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
  
      // 删除选中的用户
      for (const id of ids) {
        await ipcRenderer.invoke('delete-user', id);
      }
  
      // 重新加载用户列表
      loadUserList();
  
      // 隐藏删除确认窗口
      hideModal(confirmDeleteModal);
    });
  
    // 关闭未选择提示窗口
    closeNoSelectionModal.addEventListener('click', () => {
      hideModal(noSelectionModal);
    });
  
    noSelectionOkButton.addEventListener('click', () => {
      hideModal(noSelectionModal);
    });
  
    // 详情按钮事件委托
    userListContent.addEventListener('click', async (event) => {
      if (event.target.classList.contains('detail-button')) {
        const userId = event.target.getAttribute('data-id');
  
        // 从数据库获取用户信息
        const user = await ipcRenderer.invoke('get-user-by-id', userId);
  
        // 填充详情信息
        detailName.textContent = user.name;
        detailUserId.textContent = user.userId;
        detailAddDate.textContent = user.addDate;
        detailTraceId.textContent = user.traceId;
  
        // 显示详情窗口
        showModal(detailModal);
      }
    });
  
    // 关闭详情窗口
    closeDetailModal.addEventListener('click', () => {
      hideModal(detailModal);
    });
  
    // 全选功能
    selectAllCheckbox.addEventListener('change', () => {
      const checkboxes = userListContent.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
      });
    });
  
    // 当单个复选框状态改变时，更新全选复选框状态
    userListContent.addEventListener('change', (event) => {
      if (event.target.type === 'checkbox') {
        updateSelectAllCheckbox();
      }
    });
  
    // 更新全选复选框状态
    function updateSelectAllCheckbox() {
      const checkboxes = userListContent.querySelectorAll('input[type="checkbox"]');
      const checkedCheckboxes = userListContent.querySelectorAll('input[type="checkbox"]:checked');
      selectAllCheckbox.checked = checkboxes.length > 0 && checkboxes.length === checkedCheckboxes.length;
    }
  
    // 显示模态窗口，添加动画效果
    function showModal(modal) {
      modal.classList.add('show');
      setTimeout(() => {
        modal.classList.add('visible');
      }, 10);
    }
  
    // 隐藏模态窗口
    function hideModal(modal) {
      modal.classList.remove('visible');
      modal.addEventListener('transitionend', function onTransitionEnd() {
        modal.classList.remove('show');
        modal.removeEventListener('transitionend', onTransitionEnd);
      });
    }
  
    // 点击窗口外部关闭模态窗口
    window.addEventListener('click', (event) => {
      if (event.target == addModal) {
        hideModal(addModal);
      }
      if (event.target == detailModal) {
        hideModal(detailModal);
      }
      if (event.target == confirmDeleteModal) {
        hideModal(confirmDeleteModal);
      }
      if (event.target == noSelectionModal) {
        hideModal(noSelectionModal);
      }
      if (event.target == addChoiceModal) {
        hideModal(addChoiceModal);
      }
      if (event.target == autoExtractModal) {
        hideModal(autoExtractModal);
      }
      if (event.target == extractResultModal) {
        hideModal(extractResultModal);
      }
    });
  
  })();
  