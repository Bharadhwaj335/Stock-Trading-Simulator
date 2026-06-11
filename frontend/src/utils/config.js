export const getBackendBaseUrl = () => {
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname.startsWith('192.168.'));

  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL;
    const isUrlLocal = url.includes('localhost') || url.includes('127.0.0.1') || url.includes('192.168.');
    
    // Only use the env URL if it matches the current environment type (both local, or both production)
    if (isLocalhost === isUrlLocal) {
      return url.endsWith('/api') ? url.slice(0, -4) : url;
    }
  }
  
  if (!isLocalhost) {
    return 'https://stock-trading-simulator-hxjw.onrender.com';
  }
  
  return 'http://localhost:5000';
};

export const getApiBaseUrl = () => {
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname.startsWith('192.168.'));

  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL;
    const isUrlLocal = url.includes('localhost') || url.includes('127.0.0.1') || url.includes('192.168.');
    
    if (isLocalhost === isUrlLocal) {
      return url;
    }
  }
  return `${getBackendBaseUrl()}/api`;
};

export const getSocketUrl = () => {
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname.startsWith('192.168.'));

  if (import.meta.env.VITE_SOCKET_URL) {
    const url = import.meta.env.VITE_SOCKET_URL;
    const isUrlLocal = url.includes('localhost') || url.includes('127.0.0.1') || url.includes('192.168.');
    
    if (isLocalhost === isUrlLocal) {
      return url;
    }
  }
  return getBackendBaseUrl();
};
