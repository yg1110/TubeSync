FROM node:22-alpine AS builder

WORKDIR /app

ENV NODE_ENV=production

# pnpm 사용 (corepack)
RUN corepack enable

COPY package.json pnpm-lock.yaml* ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

FROM nginx:alpine AS runner

WORKDIR /usr/share/nginx/html

COPY --from=builder /app/dist ./

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

