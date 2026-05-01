FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

FROM node:20-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /app/uploads && chown -R app:app /app
USER app
EXPOSE 4000
CMD ["node", "src/app.js"]
