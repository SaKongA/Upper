// utils/renderer.js

const content = document.getElementById('content');
const sidebarLinks = document.querySelectorAll('.sidebar ul li a');

// 定义一个函数，用于加载页面
function loadPage(page) {
  fetch(`pages/${page}/${page}.html`)
    .then(response => response.text())
    .then(html => {
      // 解析返回的 HTML 文本
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      // 获取 <body> 内的内容
      const bodyContent = doc.body.innerHTML;
      // 将内容插入到 content 容器中
      content.innerHTML = bodyContent;
      // 将页面的 CSS 添加到主页面
      const styleLinks = doc.head.querySelectorAll('link[rel="stylesheet"]');
      styleLinks.forEach(link => {
        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = `pages/${page}/${link.getAttribute('href')}`;
        document.head.appendChild(newLink);
      });
      // 执行页面的 JS 脚本
      const scripts = doc.querySelectorAll('script');
      scripts.forEach(script => {
        const newScript = document.createElement('script');
        if (script.src) {
          newScript.src = `pages/${page}/${script.getAttribute('src')}`;
        } else {
          newScript.textContent = script.textContent;
        }
        document.body.appendChild(newScript);
      });
    })
    .catch(err => {
      console.error('无法加载页面：', err);
      content.innerHTML = '<h1>页面加载失败</h1>';
    });
}

// 初始加载主页内容
loadPage('home');

sidebarLinks.forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    // 移除所有链接的 active 类
    sidebarLinks.forEach(link => link.classList.remove('active'));
    // 为当前点击的链接添加 active 类
    this.classList.add('active');

    // 获取要加载的页面 ID
    const pageId = this.id;
    // 加载对应的页面
    loadPage(pageId);
  });
});
