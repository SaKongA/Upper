(function () {
    // 检查是否可以使用 ipcRenderer，防止重复声明
    const { ipcRenderer } = require('electron');
  
    function updateTime() {
      // 检查日期和时间元素是否存在
      const dateElement = document.getElementById('date');
      const timeElement = document.getElementById('time');
  
      if (dateElement && timeElement) {
        const now = new Date();
  
        // 使用汉字格式化日期为 YYYY年MM月DD日
        const date = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  
        // 格式化时间为 HH:MM:SS
        const time = now.toTimeString().split(' ')[0];
  
        dateElement.textContent = date;
        timeElement.textContent = time;
      }
    }
  
    // 每秒更新一次时间
    setInterval(updateTime, 1000);
  
    // 初次加载时立即显示时间
    updateTime();
  
    // 函数来处理打开外部链接的操作
    function openExternalLink(url) {
      if (ipcRenderer) {
        ipcRenderer.send('open-external-link', url); // 发送 IPC 消息到主进程
      } else {
        console.error("ipcRenderer is not available.");
      }
    }
  
    // 为每个快捷方式添加点击事件，确保元素存在再添加事件监听器
    const xhsShortcut = document.getElementById('xhs');
    if (xhsShortcut) {
      xhsShortcut.addEventListener('click', () => {
        openExternalLink('https://www.xiaohongshu.com/explore');
      });
    }
  
    const xhspgyShortcut = document.getElementById('xhspgy');
    if (xhspgyShortcut) {
      xhspgyShortcut.addEventListener('click', () => {
        openExternalLink('https://pgy.xiaohongshu.com/solar/pre-trade/home');
      });
    }
  
    const googleShortcut = document.getElementById('google');
    if (googleShortcut) {
      googleShortcut.addEventListener('click', () => {
        openExternalLink('https://www.google.com/');
      });
    }
  
    const githubShortcut = document.getElementById('github');
    if (githubShortcut) {
      githubShortcut.addEventListener('click', () => {
        openExternalLink('https://github.com/');
      });
    }
  })();
  