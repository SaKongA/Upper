<div align="center">

<img src="./icon.ico" alt="logo" width="128px" />

<h1 align="center">Upper</h1>

一个简洁的小红书蒲公英账号运营批量概览程序
</div>

## 下载
* 请前往[Github Release](https://github.com/SaKongA/Upper/releases)下载最新预构建版本。

## 构建
0. 确保设备已经安装[Node.js](https://nodejs.org/)
1. 安装项目所需依赖
```bash
> npm install
```
2. 临时启动项目
```bash
> npm start
```
3. 构建项目包
```bash
> npm run build
```

## 远程更新
* 程序在`main.js`中定义了更新服务器的URL
```js
// 检查更新
ipcMain.handle('check-for-updates', async () => {
  try {
    const response = await axios.get('https://example.com/ex-update.json');  //此处为更新配置文件链接
    return response.data;
  } catch (error) {
    console.error('检查更新失败：', error);
    return null;
  }
});
```

* 当前版本号定义在`pages/settings/settings.js`中，程序会比对当前版本号与服务器配置文件的版本号
```js
// 当前版本号
const currentVersion = '1.0.2';
```

* 我们需要设置直接指向`json`格式的更新配置文件链接，该配置文件格式参考见源码中的`ex-update.json`

* 其中，各项定义如下

| 字段 | 描述 |
| --- | ----------- |
| version | 版本号 |
| date | 更新日期，精确到分钟格式为`年.月.日-小时:分钟` |
| msg | 更新日志，使用`<br>`来进行换行 |
| link | 新版本程序下载链接，指向`exe`可执行程序 |

## 特性
* 使用[Electron](https://github.com/electron/electron)开发，开发、构建简便快捷，UI简洁、友好；

* 支持从XLSX表格中导入用户，支持通过`UserID`与`TraceID`手动导入用户；

* 目前支持拉取小红书号、曝光中位数、阅读中位数、日常笔记数量、合作笔记数量一键拉取；

* 支持远程更新程序；

* 更多特性，正在陆续更新...

## 截图
<div align="center">
	<img src="./Pictures/home.png">
    <img src="./Pictures/userlist.png">
    <img src="./Pictures/dataAna.png">
    <img src="./Pictures/setting.png">
</div>

## 支持
* 欢迎前往[Issue](https://github.com/SaKongA/Upper/issues)提出您遇到的任何问题；
* 如果您对我的项目感兴趣，需要更多帮助与支持，再或需要完善其他功能，欢迎联系我！

## 声明
* 本项目仅供学习交流使用，由于不正当使用程序等造成的一切责任与本人无关！