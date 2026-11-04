#!/bin/bash
set -e
cd "$(dirname "$0")/.."
echo "======================================"
echo "广中医口袋 Web | Safari 私人本地版"
echo "======================================"
if ! command -v node >/dev/null 2>&1; then
  echo "未安装 Node.js 18+。请先前往 https://nodejs.org/ 安装。"
  read -r -p "按回车退出..." unused
  exit 1
fi
(sleep 1; open -a Safari 'http://127.0.0.1:4173/') >/dev/null 2>&1 &
node server/server.js
