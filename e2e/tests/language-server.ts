import { type ChildProcess, fork } from 'child_process';
import * as path from 'path';
import { EventEmitter } from 'events';
import readline from 'readline';

class TSServer {
  _responseEventEmitter: EventEmitter;
  _responseCommandEmitter: EventEmitter;
  _exitPromise: Promise<number | null>;
  _isClosed: boolean;
  _server: ChildProcess;
  _seq: number;
  responses: Array<any>;

  constructor() {
    this._responseEventEmitter = new EventEmitter();
    this._responseCommandEmitter = new EventEmitter();
    const tsserverPath = require.resolve('typescript/lib/tsserver');
    const server = fork(tsserverPath, {
      cwd: path.resolve(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });
    this._exitPromise = new Promise((resolve, reject) => {
      server.on('exit', (code) => resolve(code));
      server.on('error', (reason) => reject(reason));
    });
    server.stdout!.setEncoding('utf-8');
    readline
      .createInterface({
        input: server.stdout!,
      })
      .on('line', (line) => {
        if (line[0] === '{') {
          try {
            const obj = JSON.parse(line);
            if (obj.type === 'event') {
              this._responseEventEmitter.emit(obj.event, obj);
            } else if (obj.type === 'response') {
              this._responseCommandEmitter.emit(obj.command, obj);
            }
            this.responses.push(obj);
          } catch (e) {
            // console.log(line);
          }
        }
      });
    this._isClosed = false;
    this._server = server;
    this._seq = 0;
    this.responses = [];
  }

  send(command: { command: string; arguments: any }) {
    const seq = ++this._seq;
    const req =
      JSON.stringify(Object.assign({ seq: seq, type: 'request' }, command)) +
      '\n';
    this._server.stdin!.write(req);
  }

  close() {
    if (!this._isClosed) {
      this._isClosed = true;
      this._server.stdin!.end();
    }
    return this._exitPromise;
  }

  wait(time = 0) {
    return new Promise((res) => setTimeout(() => res(null), time));
  }

  waitEvent(eventName: string) {
    return new Promise((res) =>
      this._responseEventEmitter.once(eventName, () => res(null)),
    );
  }

  waitResponse(commandName: string) {
    return new Promise((res) =>
      this._responseCommandEmitter.once(commandName, () => res(null)),
    );
  }
}

export function findResponse(responses: any[], name: string) {
  return responses.find(
    (response) => response.command === name || response.event === name,
  );
}

export function createServer() {
  return new TSServer();
}
