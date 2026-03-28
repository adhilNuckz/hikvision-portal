import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import * as crypto from 'crypto';
import axios, { AxiosResponse } from 'axios';

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

  private async request(method: string, url: string, data?: any): Promise<any> {
    const fullUrl = `${this.baseUrl}${url}${url.includes('?') ? '&' : '?'}format=json`;
    
    try {
      // Step 1: Initial request to get the 401 challenge
      const initialResponse = await axios({
        method,
        url: fullUrl,
        data,
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
          'Authorization': authValue,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
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
    return this.request('PUT', '/ISAPI/AccessControl/UserInfo/Record/Delete', deleteData);
  }

  async openDoor() {
    return this.request('PUT', '/ISAPI/AccessControl/RemoteControl/door/1', {
      RemoteControlDoor: {
        command: 'open',
      },
    });
  }
}
