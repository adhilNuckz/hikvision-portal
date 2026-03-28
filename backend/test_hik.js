const axios = require('axios');
const crypto = require('crypto');

const baseUrl = 'http://192.168.137.23';
const username = 'admin';
const password = '1234567890ab';
const url = '/ISAPI/System/deviceInfo?format=json';

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function parseDigestParams(header) {
  const params = {};
  const matches = header.matchAll(/(\w+)="?([^",]+)"?/g);
  for (const match of matches) {
    params[match[1]] = match[2];
  }
  return params;
}

async function test() {
  const fullUrl = `${baseUrl}${url}`;
  try {
    const res1 = await axios({
      method: 'GET',
      url: fullUrl,
      validateStatus: () => true
    });

    if (res1.status === 401) {
      console.log('Got 401 challenge');
      const authHeader = res1.headers['www-authenticate'];
      const params = parseDigestParams(authHeader);
      const { realm, nonce, qop, opaque } = params;
      const nc = '00000001';
      const cnonce = crypto.randomBytes(8).toString('hex');
      
      const ha1 = md5(`${username}:${realm}:${password}`);
      const ha2 = md5(`GET:${url}`);
      
      let responseStr;
      if (qop === 'auth') {
        responseStr = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
      } else {
        responseStr = md5(`${ha1}:${nonce}:${ha2}`);
      }

      let authValue = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${url}", algorithm="MD5", response="${responseStr}"`;
      if (opaque) authValue += `, opaque="${opaque}"`;
      if (qop) authValue += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;

      console.log('Sending authorization:', authValue);

      const res2 = await axios({
        method: 'GET',
        url: fullUrl,
        headers: {
          'Authorization': authValue
        },
        validateStatus: () => true
      });
      
      console.log('Result status:', res2.status);
      console.log('Result data:', res2.data);
    } else {
      console.log('No 401, got status:', res1.status);
    }
  } catch (err) {
    console.error(err);
  }
}

test();
