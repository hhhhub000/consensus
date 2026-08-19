# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Firebase 設定はリポジトリ内の .env.production から vite build 時に埋め込まれる
# (Cloud Run コンソールの GitHub 連携ビルドは build-arg を渡せないため env ファイル方式)
RUN npm run build

# ---- serve (Cloud Run) ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
