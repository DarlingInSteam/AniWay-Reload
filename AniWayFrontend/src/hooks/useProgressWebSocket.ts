import { useEffect, useRef, useState } from 'react'
import type { ProgressData, LogMessage, WebSocketMessage } from '@/types'

interface UseProgressWebSocketOptions {
  onProgress?: (data: ProgressData) => void
  onLog?: (log: LogMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

export function useProgressWebSocket(options: UseProgressWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [subscribedTasks, setSubscribedTasks] = useState<Set<string>>(new Set())
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 10
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isUnmountedRef = useRef(false)

  const connect = () => {
    if (isUnmountedRef.current) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      // Определяем среду выполнения и настраиваем URL соответственно
      const isDevelopment = window.location.port === '5173' // Vite dev server

      let wsUrl: string
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'


      if (isDevelopment) {
        // Для development режима используем Vite proxy
        // Vite проксирует /ws к manga-service:8081
        wsUrl = `${protocol}//${window.location.host}/ws/progress`
      } else {
        // Для production режима - прямое подключение к проброшенному порту
        wsUrl = `${protocol}//${window.location.hostname}:8081/ws/progress`
      }

      console.log('Connecting to WebSocket:', wsUrl, {
        isDevelopment,
        hostname: window.location.hostname,
        host: window.location.host,
        port: window.location.port
      })
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connection established');
        setIsConnected(true);
        if (options.onConnect) options.onConnect();
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket connection closed', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        setIsConnected(false);
        if (options.onDisconnect) options.onDisconnect();
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        try {
          const msg: WebSocketMessage = JSON.parse(event.data);
          if (msg.type === 'progress' && options.onProgress) {
            options.onProgress(msg.data as ProgressData);
          } else if (msg.type === 'log' && options.onLog) {
            options.onLog(msg as LogMessage);
          } else if (msg.type === 'connection') {
            // приветственное сообщение
            console.log('WebSocket handshake message:', msg);
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      }

      wsRef.current.onclose = (event) => {
        console.log('WebSocket connection closed', 'code:', event.code, 'reason:', event.reason)
        setIsConnected(false)
        options.onDisconnect?.()
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
          pingIntervalRef.current = null
        }

        // Автоматическое переподключе��ие
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000) // Exponential backoff
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++
            console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})`)
            connect()
          }, delay)
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        // Можно добавить вывод readyState
        console.error('WebSocket readyState:', wsRef.current?.readyState)
      }

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
    }
  }

  const disconnect = () => {
    isUnmountedRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    setSubscribedTasks(new Set())
  }

  const subscribeToTask = (taskId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg = JSON.stringify({ action: 'subscribe', taskId });
      wsRef.current.send(msg);
      console.log('WebSocket subscribe sent:', msg);
    }
  }

  const unsubscribeFromTask = (taskId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg = JSON.stringify({ action: 'unsubscribe', taskId });
      wsRef.current.send(msg);
      console.log('WebSocket unsubscribe sent:', msg);
    }
  }

  useEffect(() => {
    isUnmountedRef.current = false;
    connect()
    return () => {
      disconnect()
    }
  }, [])

  return {
    isConnected,
    subscribedTasks: Array.from(subscribedTasks),
    subscribeToTask,
    unsubscribeFromTask,
    disconnect,
    reconnect: connect
  }
}
