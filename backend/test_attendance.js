const axios = require('axios');
const crypto = require('crypto');

const baseUrl = 'http://192.168.137.23';
const username = 'admin';
const password = '1234567890ab';
const url = '/ISAPI/AccessControl/AcsEvent?format=json';

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
  
  const payload = {
    "AcsEventCond": {
      "searchID": "1",
      "searchResultPosition": 0,
      "maxResults": 50,
      "major": 0,
      "minor": 0,
      "startTime": "2024-01-01T00:00:00+08:00",
      "endTime": "2026-12-31T23:59:59+08:00"
    }
  };

  try {
    const res1 = await axios({
      method: 'POST',
      url: fullUrl,
      data: payload,
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
      const ha2 = md5(`POST:${url}`);
      let responseStr = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);

      let authValue = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${url}", algorithm="MD5", response="${responseStr}"`;
      if (opaque) authValue += `, opaque="${opaque}"`;
      authValue += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;

      const res2 = await axios({
        method: 'POST',
        url: fullUrl,
        data: payload,
        headers: {
          'Authorization': authValue,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      });
      console.log('Result status:', res2.status);
      console.log('Result data:', JSON.stringify(res2.data, null, 2));
    } else {
      console.log('Non-401 response:', res1.status, res1.data);
    }
  } catch (err) {
    console.error(err);
  }
}

test();
