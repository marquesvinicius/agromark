# Estágio de build
FROM node:18-alpine AS build

# Aceitar o argumento de build e defini-lo como uma variável de ambiente
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

WORKDIR /app

# Copiar package.json e package-lock.json
COPY package.json package-lock.json ./
RUN npm ci

# Copiar o resto do código
COPY . .

# Adiciona a variável de ambiente para compatibilidade com OpenSSL
ENV NODE_OPTIONS=--openssl-legacy-provider

RUN npm run build

FROM nginx:1.27-alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]


