# BDL server on Railway — Dockerfile يتجاوز مُنشئ Nixpacks/Railpack (فشل apt "no active session")
FROM node:20-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY . .
ENV NODE_ENV=production
CMD ["node","server.js"]
