# lmy-agent-vue

基于 Vue 3 + Vite 的智能项目助手前端（登录 + 知识库流式对话），目录结构参照 vue3-element 组织。

## 目录结构

```
agent-vue
├── public/                     静态资源（favicon 等）
├── src
│   ├── api/                    接口模块：一个业务一个文件
│   │   ├── ai.js               知识库刷新 / 普通对话 / 流式对话
│   │   └── auth.js             登录校验
│   ├── assets/                 全局样式
│   │   └── main.css
│   ├── router/                 路由配置
│   │   └── index.js            / 登录页，/chat 对话页（带登录守卫）
│   ├── utils/                  工具模块
│   │   ├── conversation.js     会话 ID 的生成与本地持久化
│   │   ├── request.js          fetch 封装（统一前缀、Token、流式读取）
│   │   └── session.js          Token / 账号的本地存储
│   ├── views/                  页面
│   │   ├── LoginPage.vue       登录页
│   │   └── StreamingChat.vue   流式对话页
│   ├── App.vue
│   └── main.js
├── index.html
├── jsconfig.json               @ 别名（指向 src）
├── package.json
└── vite.config.js              开发服务器与 /api 代理
```

## 路由

| 路径    | 页面           | 说明                                       |
| ------- | -------------- | ------------------------------------------ |
| `/`     | `LoginPage`    | 未登录时的登录页；已登录会跳到 `/chat`     |
| `/chat` | `StreamingChat` | 需要 Token，未登录会跳回 `/`               |

登录失效（接口返回 401）或手动退出后，会清除本地 Token 并回到登录页。

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

开发服务器监听 `5173` 端口，`/api` 会代理到 `http://localhost:8080`（在 `vite.config.js` 中修改）。

### Compile and Minify for Production

```sh
npm run build
```

### Preview the production build

```sh
npm run preview
```
