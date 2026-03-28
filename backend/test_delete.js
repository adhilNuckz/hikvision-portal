const axios = require('axios');
const crypto = require('crypto');

function md5(str) { return crypto.createHash('md5').update(str).digest('hex'); }
function parseDigestParams(header) { 
  const params={}; 
  const matches = header.matchAll(/(\w+)="?([^",]+)"?/g); 
  for(let match of matches) params[match[1]]=match[2]; 
  return params; 
}

async function request(method, url, data) {
  const fullUrl = `http://192.168.137.23${url}?format=json`;
  try {
    let r = await axios({ method, url: fullUrl, data, validateStatus: () => true });
    if(r.status !== 401) return r.data;
    const p = parseDigestParams(r.headers['www-authenticate']);
    const ha1 = md5(`admin:${p.realm}:1234567890ab`);
    const ha2 = md5(`${method}:${url}?format=json`);
    const nonce = p.nonce, nc = '00000001', cnonce = crypto.randomBytes(8).toString('hex');
    const qop = p.qop, opaque = p.opaque;
    let respStr = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
    let auth = `Digest username="admin", realm="${p.realm}", nonce="${nonce}", uri="${url}?format=json", algorithm=MD5, response="${respStr}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", opaque="${opaque}"`;
    return (await axios({ method, url: fullUrl, data, headers: { Authorization: auth, 'Content-Type': 'application/json' } })).data;
  } catch(e) { 
    console.error('E:', e.response?.data || e.message); 
  }
}

async function go() {
  const delData = { UserInfoDetail: { mode: 'byEmployeeNo', EmployeeNoList: [{ employeeNo: 'adh2' }] } };
  
  console.log('Testing Record/Delete...');
  console.log(await request('PUT', '/ISAPI/AccessControl/UserInfo/Record/Delete', delData));
  
  console.log('Testing Detail/Delete...');
  console.log(await request('PUT', '/ISAPI/AccessControl/UserInfoDetail/Delete', delData));
}

go();
