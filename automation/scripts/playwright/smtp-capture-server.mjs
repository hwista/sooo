import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const host = process.env.PLAYWRIGHT_SMTP_HOST ?? '127.0.0.1';
const port = Number(process.env.PLAYWRIGHT_SMTP_PORT ?? '2525');
const capturePath = process.env.PLAYWRIGHT_SMTP_CAPTURE_PATH
  ?? path.resolve(process.env.TMPDIR ?? '/tmp', 'ssoo-playwright-runtime/logs/auth-email.jsonl');

fs.mkdirSync(path.dirname(capturePath), { recursive: true });
fs.writeFileSync(capturePath, '', { mode: 0o600 });

function write(socket, line) {
  socket.write(`${line}\r\n`);
}

const server = net.createServer((socket) => {
  socket.setEncoding('utf8');
  let buffer = '';
  let dataMode = false;
  let dataLines = [];
  let authStep = null;
  let envelopeFrom = '';
  let envelopeTo = '';

  write(socket, '220 ssoo-playwright-smtp ESMTP ready');

  socket.on('data', (chunk) => {
    buffer += chunk;
    let lineEnd = buffer.indexOf('\n');
    while (lineEnd >= 0) {
      const rawLine = buffer.slice(0, lineEnd + 1);
      buffer = buffer.slice(lineEnd + 1);
      const line = rawLine.replace(/\r?\n$/u, '');

      if (dataMode) {
        if (line === '.') {
          const payload = dataLines.join('\n');
          fs.appendFileSync(capturePath, `${JSON.stringify({
            receivedAt: new Date().toISOString(),
            envelopeFrom,
            envelopeTo,
            payload,
          })}\n`, { mode: 0o600 });
          dataMode = false;
          dataLines = [];
          write(socket, '250 2.0.0 queued');
        } else {
          dataLines.push(line.startsWith('..') ? line.slice(1) : line);
        }
        lineEnd = buffer.indexOf('\n');
        continue;
      }

      if (authStep === 'username') {
        authStep = 'password';
        write(socket, '334 UGFzc3dvcmQ6');
        lineEnd = buffer.indexOf('\n');
        continue;
      }
      if (authStep === 'password') {
        authStep = null;
        write(socket, '235 2.7.0 authentication successful');
        lineEnd = buffer.indexOf('\n');
        continue;
      }

      const command = line.toUpperCase();
      if (command.startsWith('EHLO') || command.startsWith('HELO')) {
        socket.write('250-ssoo-playwright-smtp\r\n250-AUTH PLAIN LOGIN\r\n250 SIZE 10485760\r\n');
      } else if (command.startsWith('AUTH PLAIN')) {
        write(socket, '235 2.7.0 authentication successful');
      } else if (command === 'AUTH LOGIN') {
        authStep = 'username';
        write(socket, '334 VXNlcm5hbWU6');
      } else if (command.startsWith('MAIL FROM:')) {
        envelopeFrom = line.slice('MAIL FROM:'.length).trim();
        write(socket, '250 2.1.0 sender accepted');
      } else if (command.startsWith('RCPT TO:')) {
        envelopeTo = line.slice('RCPT TO:'.length).trim();
        write(socket, '250 2.1.5 recipient accepted');
      } else if (command === 'DATA') {
        dataMode = true;
        dataLines = [];
        write(socket, '354 end with <CRLF>.<CRLF>');
      } else if (command === 'RSET' || command === 'NOOP') {
        write(socket, '250 2.0.0 ok');
      } else if (command === 'QUIT') {
        write(socket, '221 2.0.0 bye');
        socket.end();
      } else {
        write(socket, '250 2.0.0 ok');
      }

      lineEnd = buffer.indexOf('\n');
    }
  });
});

server.listen(port, host, () => {
  process.stdout.write(`[playwright-smtp] listening on ${host}:${port}\n`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
