import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import * as crypto from 'crypto';
import axios, { AxiosResponse } from 'axios';
const FormData = require('form-data');

@Injectable()
export class HikService {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    const ip = this.configService.get<string>('HIK_IP') || '192.168.137.23';
    this.username = this.configService.get<string>('HIK_USERNAME') || 'admin';
    this.password = this.configService.get<string>('HIK_PASSWORD') || '1234567890ab';
    this.baseUrl = `http://${ip}`;
  }

  private async request(method: string, url: string, data?: any, customHeaders?: any): Promise<any> {
    const fullUrl = `${this.baseUrl}${url}${url.includes('?') ? '&' : '?'}format=json`;
    
    try {
      // Step 1: Initial request to get the 401 challenge
      const initialResponse = await axios({
        method,
        url: fullUrl,
        data,
        headers: customHeaders,
        validateStatus: () => true, // Don't throw for 401
      });

      if (initialResponse.status !== 401) {
        return initialResponse.data;
      }

      // Step 2: Parse the WWW-Authenticate header
      const authHeader = initialResponse.headers['www-authenticate'];
      if (!authHeader) {
        throw new Error('No WWW-Authenticate header found');
      }

      const params = this.parseDigestParams(authHeader);
      const { realm, nonce, qop, opaque } = params;
      const nc = '00000001';
      const cnonce = crypto.randomBytes(8).toString('hex');
      
      // Step 3: Calculate Digest Response
      const ha1 = this.md5(`${this.username}:${realm}:${this.password}`);
      const ha2 = this.md5(`${method.toUpperCase()}:${url}${url.includes('?') ? '&' : '?'}format=json`);
      
      let responseStr: string;
      if (qop === 'auth') {
        responseStr = this.md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
      } else {
        responseStr = this.md5(`${ha1}:${nonce}:${ha2}`);
      }

      let authValue = `Digest username="${this.username}", realm="${realm}", nonce="${nonce}", uri="${url}${url.includes('?') ? '&' : '?'}format=json", algorithm=MD5, response="${responseStr}"`;
      if (opaque) authValue += `, opaque="${opaque}"`;
      if (qop) authValue += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;

      // Step 4: Final request with Authorization header
      const finalResponse = await axios({
        method,
        url: fullUrl,
        data,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...customHeaders,
          'Authorization': authValue,
        },
      });

      return finalResponse.data;
    } catch (error) {
      console.error('Manual Digest Error:', error.response?.data || error.message);
      throw new HttpException(
        error.response?.data || 'Failed to authenticate with Hikvision device',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private md5(str: string): string {
    return crypto.createHash('md5').update(str).digest('hex');
  }

  private parseDigestParams(header: string): any {
    const params: any = {};
    const matches = header.matchAll(/(\w+)="?([^",]+)"?/g);
    for (const match of matches) {
      params[match[1]] = match[2];
    }
    return params;
  }

  async testConnectivity() {
    return this.request('GET', '/ISAPI/System/deviceInfo');
  }

  async getUsers() {
    const searchData = {
      UserInfoSearchCond: {
        searchID: '1',
        maxResults: 100,
        searchResultPosition: 0,
      },
    };
    return this.request('POST', '/ISAPI/AccessControl/UserInfo/Search', searchData);
  }

  async addUser(userData: any) {
    return this.request('POST', '/ISAPI/AccessControl/UserInfo/Record', {
      UserInfo: {
        ...userData,
        userType: 'normal',
        doorRight: '1',
        RightPlan: [{ doorNo: 1, planTemplateNo: '1' }],
        Valid: {
          enable: true,
          beginTime: "2024-01-01T00:00:00",
          endTime: "2034-01-01T23:59:59",
          timeType: "local"
        }
      },
    });
  }

  async updateUser(userData: any) {
    return this.request('PUT', '/ISAPI/AccessControl/UserInfo/Record', {
      UserInfo: {
        ...userData,
        Valid: {
          enable: true,
          beginTime: "2024-01-01T00:00:00",
          endTime: "2034-01-01T23:59:59",
          timeType: "local"
        }
      },
    });
  }

  async deleteUser(employeeNo: string) {
    const deleteData = {
      UserInfoDetail: {
        mode: 'byEmployeeNo',
        EmployeeNoList: [{ employeeNo }],
      },
    };
    return this.request('PUT', '/ISAPI/AccessControl/UserInfoDetail/Delete', deleteData);
  }

  async openDoor() {
    return this.request('PUT', '/ISAPI/AccessControl/RemoteControl/door/1', {
      RemoteControlDoor: {
        command: 'open',
      },
    });
  }

  async uploadFace(employeeNo: string, base64Image: string) {
    // base64Image comes as "data:image/jpeg;base64,...". Remove the prefix.
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const form = new FormData();
    const faceDataRecord = {
      FaceDataRecord: {
        faceLibType: "blackFD",
        FDID: "1",
        FPID: employeeNo
      }
    };
    form.append('FaceDataRecord', JSON.stringify(faceDataRecord), { contentType: 'application/json' });
    form.append('FaceImage', buffer, { filename: 'face.jpg', contentType: 'image/jpeg' });

    return this.request(
      'POST',
      '/ISAPI/Intelligent/FDLib/FaceDataRecord',
      form,
      form.getHeaders()
    );
  }

  async getAttendanceLogs(startTime?: string, endTime?: string) {
    // We use absolute bounds to completely eliminate Timezone sync issues between
    // the Node server and the physical Hikvision Device bypassing cutoff bugs.
    const st = startTime || "2010-01-01T00:00:00+08:00";
    const et = endTime || "2035-12-31T23:59:59+08:00";

    // STEP 1: Execute a lightweight query to determine exactly how many events exist on the hardware
    const probeData = {
      AcsEventCond: {
        searchID: "1",
        searchResultPosition: 0,
        maxResults: 1,
        major: 0,
        minor: 0,
        startTime: st,
        endTime: et
      }
    };

    try {
      const probeResponse = await this.request('POST', '/ISAPI/AccessControl/AcsEvent', probeData);
      const totalMatches = probeResponse?.AcsEvent?.totalMatches || 0;

      // STEP 2: The device silently limits how much it can return at once (caps around 150).
      // We calculate the precise offset to capture ONLY the absolute newest 40 events
      const position = Math.max(0, totalMatches - 40);

      const finalData = {
        AcsEventCond: {
          searchID: "2", // Different ID to avoid caching issues on the embedded device
          searchResultPosition: position,
          maxResults: 40,
          major: 0,
          minor: 0,
          startTime: st,
          endTime: et
        }
      };

      return await this.request('POST', '/ISAPI/AccessControl/AcsEvent', finalData);
    } catch (e) {
      console.error("Attendance robust fetch failed", e);
      throw e;
    }
  }
}
