import { useState, useEffect, useCallback, useRef } from 'react';
import { getWebSocketURL } from '../services/api';

/**
 * Custom hook for WebSocket connections with auto-reconnect
 */
export const useWebSocket = (path, options = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  const { 
    onMessage, 
    onConnect, 
    onDisconnect, 
    reconnectInterval = 3000,
    maxMessages = 100 
  } = options;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    const url = getWebSocketURL(path);
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected:', path);
      if (onConnect) onConnect();
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
        setMessages((prev) => {
          const updated = [data, ...prev];
          return updated.slice(0, maxMessages);
        });
        if (onMessage) onMessage(data);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected:', path);
      if (onDisconnect) onDisconnect();
      
      // Auto-reconnect
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('WebSocket reconnecting:', path);
        connect();
      }, reconnectInterval);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    wsRef.current = ws;
  }, [path, onMessage, onConnect, onDisconnect, reconnectInterval, maxMessages]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    messages,
    sendMessage,
    connect,
    disconnect,
  };
};

export default useWebSocket;
