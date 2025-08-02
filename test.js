const crypto = require('crypto');

const workingKey = '1FF45E68BC61BF20EFF579F26AF80992'; // Replace with actual working key
const plainText = 'order_id=630dfd2e-9106-482b-b706-0125d272abc5&order_status=Success&amount=150.00';

function encryptCCAvenue(data, workingKey) {
  const key = crypto.createHash('md5').update(workingKey).digest();
  const iv = Buffer.from('000102030405060708090a0b0c0d0e0f', 'hex');

  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

const encResp = encryptCCAvenue(plainText, workingKey);
console.log('✅ EncResp for testing:\n', encResp);
