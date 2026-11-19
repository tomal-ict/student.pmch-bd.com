import CryptoJS from 'crypto-js';

const RAW_KEY = import.meta.env.VITE_PAYLOAD_KEY || 'SecuRe_AES256_Stud3nt_P0rtal_Key!';
const KEY = CryptoJS.SHA256(RAW_KEY);

export const encryptPayload = (data) => {
  try {
    const jsonStr = JSON.stringify(data);
    const iv = CryptoJS.lib.WordArray.random(16);

    const encrypted = CryptoJS.AES.encrypt(jsonStr, KEY, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const ivBase64 = CryptoJS.enc.Base64.stringify(iv);
    const valueBase64 = CryptoJS.enc.Base64.stringify(encrypted.ciphertext);

    // Calculate HMAC-SHA256 of IV + Ciphertext (raw bytes concatenation)
    const combined = iv.clone().concat(encrypted.ciphertext);
    const mac = CryptoJS.HmacSHA256(combined, KEY).toString(CryptoJS.enc.Hex);

    return {
      iv: ivBase64,
      value: valueBase64,
      mac: mac,
    };
  } catch (error) {
    console.error('Encryption error:', error);
    return data;
  }
};

export const decryptPayload = (payload) => {
  try {
    if (!payload || !payload.iv || !payload.value || !payload.mac) {
      return payload;
    }

    const iv = CryptoJS.enc.Base64.parse(payload.iv);
    const ciphertext = CryptoJS.enc.Base64.parse(payload.value);

    // Verify HMAC
    const combined = iv.clone().concat(ciphertext);
    const calculatedMac = CryptoJS.HmacSHA256(combined, KEY).toString(CryptoJS.enc.Hex);

    if (calculatedMac !== payload.mac) {
      throw new Error('HMAC signature verification failed. Possible data tampering.');
    }

    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext },
      KEY,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );

    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedStr);
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
};
