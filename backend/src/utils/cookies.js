const parseCookies = (req) => {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name.trim();
    if (!name) return;
    list[name] = decodeURIComponent(rest.join('=').trim());
  });
  return list;
};

const setCookie = (res, name, value, options = {}) => {
  let cookieString = `${name}=${encodeURIComponent(value)}`;
  if (options.httpOnly) cookieString += '; HttpOnly';
  if (options.secure) cookieString += '; Secure';
  if (options.sameSite) cookieString += `; SameSite=${options.sameSite}`;
  if (options.maxAge) {
    const expires = new Date(Date.now() + options.maxAge);
    cookieString += `; Expires=${expires.toUTCString()}`;
  } else if (options.expires) {
    cookieString += `; Expires=${options.expires.toUTCString()}`;
  }
  cookieString += options.path ? `; Path=${options.path}` : '; Path=/';

  const existing = res.getHeader('Set-Cookie');
  if (existing) {
    const arr = Array.isArray(existing) ? existing : [existing];
    arr.push(cookieString);
    res.setHeader('Set-Cookie', arr);
  } else {
    res.setHeader('Set-Cookie', cookieString);
  }
};

const clearCookie = (res, name) => {
  setCookie(res, name, '', { expires: new Date(0), path: '/' });
};

module.exports = { parseCookies, setCookie, clearCookie };
