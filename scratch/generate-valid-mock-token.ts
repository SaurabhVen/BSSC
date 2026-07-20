import jwt from 'jsonwebtoken';
import config from '../src/config';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const userId = '51a35d0a-5001-7094-7db6-06129b279c74';
const email = 'anil@yopmail.com';

const token = jwt.sign(
  {
    sub: userId,
    username: email,
    'cognito:groups': ['Candidates']
  },
  config.JWT_SECRET,
  { expiresIn: '30d' }
);

console.log('Generated token:');
console.log(token);
