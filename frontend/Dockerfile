FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build the Next.js app for production
RUN npm run build

EXPOSE 3000

# Start the production server, not the dev server
CMD ["npm", "start"]