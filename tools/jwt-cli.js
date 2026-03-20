#!/usr/bin/env node

/**
 * Supabase JWT 工具
 * 功能：生成和验证 Supabase JWT token
 * 用法：
 *   node jwt-cli.js generate [user-id] [email]  # 生成 token
 *   node jwt-cli.js verify <token>              # 验证 token
 *   node jwt-cli.js decode <token>              # 解码 token (不验证签名)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============ JWT 实现 (无外部依赖) ============

function base64UrlEncode(data) {
  const base64 = Buffer.from(data).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return Buffer.from(base64, 'base64').toString();
}

function createSignature(header, payload, secret) {
  const data = `${header}.${payload}`;
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

function generateToken(payload, secret, expiresIn = '1h') {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));

  const now = Math.floor(Date.now() / 1000);
  const exp = parseExpiresIn(expiresIn);

  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + exp,
  };

  const payloadEncoded = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = createSignature(header, payloadEncoded, secret);

  return `${header}.${payloadEncoded}.${signature}`;
}

function verifyToken(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid token format' };
  }

  const [header, payload, signature] = parts;
  const expectedSignature = createSignature(header, payload, secret);

  if (signature !== expectedSignature) {
    return { valid: false, error: 'Invalid signature' };
  }

  const decodedPayload = JSON.parse(base64UrlDecode(payload));

  if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
    return { valid: false, error: 'Token expired', payload: decodedPayload };
  }

  return { valid: true, payload: decodedPayload };
}

function decodeToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { error: 'Invalid token format' };
  }

  try {
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return { header, payload };
  } catch (e) {
    return { error: 'Failed to decode token' };
  }
}

function parseExpiresIn(str) {
  const match = str.match(/^(\d+)([smhd]?)$/);
  if (!match) return 3600;

  const value = parseInt(match[1]);
  const unit = match[2] || 's';

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return value;
  }
}

// ============ 环境变量加载 ============

function loadEnv() {
  const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          if (key && !process.env[key]) {
            process.env[key] = value;
          }
        }
      });
      console.log(`✓ 已加载环境变量: ${envPath}\n`);
      return true;
    }
  }
  return false;
}

// ============ CLI 入口 ============

function printUsage() {
  console.log(`
Supabase JWT 工具

用法:
  node jwt-cli.js generate [user-id] [email]  生成 token
  node jwt-cli.js verify <token>               验证 token
  node jwt-cli.js decode <token>               解码 token (不验证签名)

参数:
  user-id    用户唯一标识 (默认: test-user-001)
  email      用户邮箱 (默认: test@example.com)
  token      JWT token 字符串

示例:
  node jwt-cli.js generate
  node jwt-cli.js generate my-user-123 user@example.com
  node jwt-cli.js verify eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  node jwt-cli.js decode eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

环境变量:
  SUPABASE_JWT_SECRET  JWT 密钥 (必需)
`);
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '-h' || command === '--help') {
    printUsage();
    process.exit(0);
  }

  // 加载 .env
  loadEnv();

  const secret = process.env.SUPABASE_JWT_SECRET;

  if (!secret && command !== 'decode') {
    console.error('错误: 未设置 SUPABASE_JWT_SECRET 环境变量');
    console.error('请在 .env 文件中设置或通过环境变量传入');
    process.exit(1);
  }

  switch (command) {
    case 'generate': {
      const userId = args[1] || 'test-user-001';
      const email = args[2] || 'test@example.com';

      const payload = {
        sub: userId,
        role: 'authenticated',
        aud: 'authenticated',
        email: email,
        app_metadata: {},
        user_metadata: {},
      };

      const token = generateToken(payload, secret, '1h');

      console.log('='.repeat(60));
      console.log('生成的 Token:');
      console.log('='.repeat(60));
      console.log(token);
      console.log('\n' + '='.repeat(60));
      console.log('Payload 内容:');
      console.log('='.repeat(60));
      console.log(JSON.stringify(payload, null, 2));
      console.log('\n有效期: 1 小时');
      break;
    }

    case 'verify': {
      const token = args[1];
      if (!token) {
        console.error('错误: 请提供要验证的 token');
        process.exit(1);
      }

      console.log('='.repeat(60));
      console.log('验证 Token:');
      console.log('='.repeat(60));

      const result = verifyToken(token, secret);

      if (result.valid) {
        console.log('✓ Token 有效\n');
        console.log('Payload:');
        console.log(JSON.stringify(result.payload, null, 2));
      } else {
        console.log('✗ Token 无效');
        console.log('错误:', result.error);
        if (result.payload) {
          console.log('\nPayload (已解码):');
          console.log(JSON.stringify(result.payload, null, 2));
        }
      }
      break;
    }

    case 'decode': {
      const token = args[1];
      if (!token) {
        console.error('错误: 请提供要解码的 token');
        process.exit(1);
      }

      console.log('='.repeat(60));
      console.log('解码 Token (不验证签名):');
      console.log('='.repeat(60));

      const result = decodeToken(token);

      if (result.error) {
        console.log('✗ 解码失败:', result.error);
      } else {
        console.log('Header:');
        console.log(JSON.stringify(result.header, null, 2));
        console.log('\nPayload:');
        console.log(JSON.stringify(result.payload, null, 2));
      }
      break;
    }

    default:
      console.error(`未知命令: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main();
