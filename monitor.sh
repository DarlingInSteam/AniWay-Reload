#!/bin/bash

echo "🔍 AniWay Server Monitoring"
echo "=========================="

echo "💾 Disk Usage:"
df -h | grep -E '(Filesystem|/dev/)'

echo ""
echo "🧠 Memory Usage:"
free -h

echo ""
echo "⚡ CPU Usage:"
top -bn1 | grep "Cpu(s)" | awk '{print $2 $3}' | awk -F'%' '{print $1"%"}'

echo ""
echo "🐳 Docker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "📊 Docker System Usage:"
docker system df

echo ""
echo "🌐 Server IP:"
curl -s ifconfig.me && echo

echo ""
echo "📈 Uptime:"
uptime
