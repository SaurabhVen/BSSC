import { config } from 'dotenv';
config();
import { captchaRepository } from '../src/repositories/common.repository';
import { v4 as uuidv4 } from 'uuid';

async function test() {
  try {
    const data = {
      id: uuidv4(),
      code: 'test1234',
      expiresAt: new Date(Date.now() + 100000)
    };
    console.log('Inserting captcha', data);
    const result = await captchaRepository.create(data);
    console.log('Success:', result);
  } catch (err) {
    console.error('Error:', err);
    if ((err as any).cause) {
      console.error('Cause:', (err as any).cause);
    }
  }
  process.exit();
}

test();
