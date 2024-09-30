// main.js

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Datastore = require('nedb');
const xlsx = require('xlsx');
const axios = require('axios');
const fs = require('fs');
const { shell } = require('electron');

// 数据库实例
let db;
let customCookie = ''; // 保存自定义Cookie

// 捕获主进程的控制台日志
global.consoleLogs = [];
const originalConsoleLog = console.log;
console.log = function (...args) {
  originalConsoleLog.apply(console, args);
  global.consoleLogs.push(args.join(' '));
};

const originalConsoleError = console.error;
console.error = function (...args) {
  originalConsoleError.apply(console, args);
  global.consoleLogs.push(args.join(' '));
};

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
  });

  win.loadFile('index.html');

  const userDataPath = app.getPath('userData');
  db = new Datastore({ filename: path.join(userDataPath, 'users.db'), autoload: true });

  // 加载保存的自定义Cookie
  const cookiePath = path.join(userDataPath, 'cookie.txt');
  if (fs.existsSync(cookiePath)) {
    customCookie = fs.readFileSync(cookiePath, 'utf-8');
  }
}

// 保存自定义Cookie
ipcMain.handle('save-custom-cookie', async (event, cookie) => {
  const userDataPath = app.getPath('userData');
  const cookiePath = path.join(userDataPath, 'cookie.txt');
  fs.writeFileSync(cookiePath, cookie, 'utf-8');
  customCookie = cookie;
  return true;
});

// 获取自定义Cookie
ipcMain.handle('get-custom-cookie', async () => {
  return customCookie;
});

// 保存调试Log
ipcMain.handle('save-debug-log', async () => {
  const logs = global.consoleLogs || [];
  const desktopPath = app.getPath('desktop'); // 保存到桌面

  const logContent = logs.join('\n');

  const logFileName = `debug-log-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;

  const logPath = path.join(desktopPath, logFileName);

  fs.writeFileSync(logPath, logContent, 'utf-8');

  return logPath; // 返回日志文件路径
});

// 检查更新
ipcMain.handle('check-for-updates', async () => {
  try {
    const response = await axios.get('https://aitv.rth5.com/latest.json');
    return response.data;
  } catch (error) {
    console.error('检查更新失败：', error);
    return null;
  }
});

// 下载更新
ipcMain.handle('download-update', async (event, downloadUrl) => {
  const win = BrowserWindow.getFocusedWindow();

  const downloadPath = path.join(app.getPath('downloads'), 'update.exe'); // 下载到用户的下载目录

  const writer = fs.createWriteStream(downloadPath);

  try {
    const response = await axios({
      method: 'get',
      url: downloadUrl,
      responseType: 'stream',
    });

    const totalLength = response.headers['content-length'];

    let downloadedLength = 0;

    response.data.on('data', (chunk) => {
      downloadedLength += chunk.length;
      const progress = (downloadedLength / totalLength) * 100;
      win.webContents.send('download-progress', progress);
    });

    response.data.pipe(writer);

    writer.on('finish', () => {
      win.webContents.send('download-complete');
      // 保存下载路径，供安装时使用
      global.downloadedUpdatePath = downloadPath;
    });

    writer.on('error', (err) => {
      console.error('下载错误：', err);
    });
  } catch (error) {
    console.error('下载更新失败：', error);
  }
});

// 安装更新
ipcMain.handle('install-update', () => {
  const updatePath = global.downloadedUpdatePath;
  if (updatePath && fs.existsSync(updatePath)) {
    // 运行安装程序
    shell.openPath(updatePath);
    // 退出应用程序
    app.quit();
  } else {
    console.error('更新文件不存在');
  }
});

// 监听来自渲染进程的 open-external-link 事件
ipcMain.on('open-external-link', (event, url) => {
  shell.openExternal(url); // 使用 shell 打开默认浏览器
});

app.whenReady().then(() => {
  createWindow();

  // IPC通信：获取用户列表
  ipcMain.handle('get-users', async () => {
    return new Promise((resolve, reject) => {
      db.find({}, (err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });
  });

  // IPC通信：添加用户
  ipcMain.handle('add-user', async (event, user) => {
    return new Promise((resolve, reject) => {
      db.insert(user, (err, newDoc) => {
        if (err) reject(err);
        else resolve(newDoc);
      });
    });
  });

  // IPC通信：删除用户
  ipcMain.handle('delete-user', async (event, userId) => {
    return new Promise((resolve, reject) => {
      db.remove({ _id: userId }, {}, (err, numRemoved) => {
        if (err) reject(err);
        else resolve(numRemoved);
      });
    });
  });

  // IPC通信：根据ID获取用户
  ipcMain.handle('get-user-by-id', async (event, userId) => {
    return new Promise((resolve, reject) => {
      db.findOne({ _id: userId }, (err, doc) => {
        if (err) reject(err);
        else resolve(doc);
      });
    });
  });

  // IPC通信：打开文件选择对话框
  ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择 XLSX 文件',
      filters: [{ name: 'XLSX Files', extensions: ['xlsx'] }],
      properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    } else {
      return result.filePaths[0];
    }
  });

  // IPC通信：提取用户数据
  ipcMain.handle('extract-users', async (event, filePath) => {
    return new Promise((resolve, reject) => {
      try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const range = xlsx.utils.decode_range(worksheet['!ref']);
        const users = [];

        for (let rowNum = range.s.r + 1; rowNum <= range.e.r; rowNum++) {
          const cellAddress = { c: 1, r: rowNum }; // B 列
          const cellRef = xlsx.utils.encode_cell(cellAddress);
          const cell = worksheet[cellRef];

          if (cell && cell.l && cell.l.Target) {
            const name = cell.v;
            const hyperlink = cell.l.Target;

            // 从 hyperlink 中提取 userId 和 traceId
            const url = new URL(hyperlink);
            const pathSegments = url.pathname.split('/');
            const userId = pathSegments[pathSegments.length - 1];

            const searchParams = new URLSearchParams(url.search);
            const traceId = searchParams.get('track_id');

            const addDate = new Date().toLocaleString();

            users.push({
              name,
              userId,
              traceId,
              addDate,
            });
          }
        }

        resolve(users);
      } catch (error) {
        reject(error);
      }
    });
  });

  // IPC 通信：获取用户信息
  ipcMain.handle('fetch-user-info', async (event, userId) => {
    try {
      const response = await axios.get(`https://pgy.xiaohongshu.com/api/solar/cooperator/user/blogger/${userId}`, {
        headers: {
          'Cookie': customCookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          // 其他必要的请求头
        }
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`获取用户信息失败：${error}`);
      const errorCode = error.response?.data?.code || error.code;
      const errorMessage = error.response?.data?.msg || error.message;
      return { success: false, code: errorCode, message: errorMessage };
    }
  });

  // IPC 通信：获取运营数据
  ipcMain.handle('fetch-operation-data', async (event, userId) => {
    try {
      const response = await axios.get(`https://pgy.xiaohongshu.com/api/solar/kol/data_v3/notes_rate`, {
        params: {
          userId: userId,
          business: 0,
          noteType: 3,
          dateType: 1,
          advertiseSwitch: 1
        },
        headers: {
          'Cookie': customCookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          // 其他必要的请求头
        }
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`获取运营数据失败：${error}`);
      const errorCode = error.response?.data?.code || error.code;
      const errorMessage = error.response?.data?.msg || error.message;
      return { success: false, code: errorCode, message: errorMessage };
    }
  });

  // IPC 通信：获取合作笔记
  ipcMain.handle('fetch-busbotes-data', async (event, userId) => {
    try {
      const response = await axios.get(`https://pgy.xiaohongshu.com/api/solar/kol/data_v3/notes_rate`, {
        params: {
          userId: userId,
          business: 1,
          noteType: 3,
          dateType: 1,
          advertiseSwitch: 1
        },
        headers: {
          'Cookie': customCookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          // 其他必要的请求头
        }
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`获取合作笔记失败：${error}`);
      const errorCode = error.response?.data?.code || error.code;
      const errorMessage = error.response?.data?.msg || error.message;
      return { success: false, code: errorCode, message: errorMessage };
    }
  });

  // IPC 通信：更新用户数据
  ipcMain.handle('update-user', async (event, user) => {
    return new Promise((resolve, reject) => {
      db.update({ _id: user._id }, user, {}, (err, numReplaced) => {
        if (err) reject(err);
        else resolve(numReplaced);
      });
    });
  });

});
