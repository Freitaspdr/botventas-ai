#!/bin/bash
# Script de setup inicial del VPS — ejecutar como root en Ubuntu 22.04
set -e

echo "=== BotVentas AI — Setup VPS ==="

# 1. Actualizar sistema
apt-get update && apt-get upgrade -y

# 2. Instalar dependencias base
apt-get install -y curl git ufw

# 3. Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 4. Instalar PM2
npm install -g pm2

# 5. Instalar Docker
curl -fsSL https://get.docker.com | bash
systemctl enable docker
systemctl start docker

# 6. Instalar Docker Compose plugin
apt-get install -y docker-compose-plugin

# 7. Crear directorio de logs
mkdir -p /var/log/botventas

# 8. Firewall: abrir puertos necesarios
ufw allow 22/tcp    # SSH
ufw allow 3000/tcp  # Backend webhook
ufw allow 8080/tcp  # Evolution API
ufw --force enable

echo ""
echo "=== Setup completado ==="
echo "Node: $(node -v)"
echo "npm:  $(npm -v)"
echo "PM2:  $(pm2 -v)"
echo "Docker: $(docker -v)"
echo ""
echo "Siguiente paso: clonar el repo y configurar .env"
