const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getKey() {
  const hex = process.env.FILE_ENC_KEY;
  if (!hex || hex.length < 64) throw new Error('FILE_ENC_KEY must be a 32-byte hex string (64 hex chars)');
  return Buffer.from(hex, 'hex');
}

function encryptFile(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);
    // Prepend IV to the encrypted file
    output.write(iv);
    input.pipe(cipher).pipe(output);
    output.on('finish', resolve);
    output.on('error', reject);
    input.on('error', reject);
  });
}

function decryptFileStream(encryptedPath, res) {
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(encryptedPath);
    let ivBuffer = Buffer.alloc(0);
    let ivDone = false;
    let decipher = null;

    input.on('data', (chunk) => {
      if (!ivDone) {
        ivBuffer = Buffer.concat([ivBuffer, chunk]);
        if (ivBuffer.length >= IV_LENGTH) {
          const iv = ivBuffer.slice(0, IV_LENGTH);
          const remaining = ivBuffer.slice(IV_LENGTH);
          decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
          decipher.pipe(res);
          if (remaining.length > 0) decipher.write(remaining);
          ivDone = true;
        }
      } else {
        decipher.write(chunk);
      }
    });
    input.on('end', () => {
      if (decipher) decipher.end();
      resolve();
    });
    input.on('error', reject);
  });
}

module.exports = { encryptFile, decryptFileStream };
