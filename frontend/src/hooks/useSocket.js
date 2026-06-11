import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

import { getSocketUrl } from '../utils/config';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const token = useAuthStore.getState().accessToken;
    const socketUrl = getSocketUrl();
    socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
};

/** Subscribe to live price updates for a stock symbol */
export const useStockPriceSocket = (symbol, onUpdate) => {
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useEffect(() => {
    if (!symbol) return;
    const sock = getSocket();
    sock.emit('subscribe:stock', symbol);
    const handler = (data) => callbackRef.current(data);
    sock.on('priceUpdate', handler);
    return () => {
      sock.emit('unsubscribe:stock', symbol);
      sock.off('priceUpdate', handler);
    };
  }, [symbol]);
};

/** Listen to wallet updates (after buy/sell) */
export const useWalletSocket = (onUpdate) => {
  const { updateWallet } = useAuthStore();
  useEffect(() => {
    const sock = getSocket();
    const handler = (data) => {
      updateWallet(data.walletBalance);
      onUpdate(data);
    };
    sock.on('walletUpdate', handler);
    return () => { sock.off('walletUpdate', handler); };
  }, []);
};

/** Listen for triggered alerts */
export const useAlertSocket = (onAlert) => {
  useEffect(() => {
    const sock = getSocket();
    sock.on('alertTriggered', onAlert);
    return () => { sock.off('alertTriggered', onAlert); };
  }, []);
};

/** Market ticker — all stocks */
export const useMarketTickerSocket = (onTick) => {
  const callbackRef = useRef(onTick);
  callbackRef.current = onTick;
  useEffect(() => {
    const sock = getSocket();
    const handler = (data) => callbackRef.current(data);
    sock.on('marketTick', handler);
    return () => { sock.off('marketTick', handler); };
  }, []);
};
