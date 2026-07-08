import svgCaptcha from 'svg-captcha';
import { generateUUID } from './crypto';

export interface CaptchaData {
  captchaId: string;
  svg: string;
  text: string;
}

export const generateCaptcha = (): CaptchaData => {
  const captcha = svgCaptcha.create({
    size: 6,
    noise: 3,
    color: true,
    background: '#f0f0f0',
  });
  return {
    captchaId: generateUUID(),
    svg: captcha.data,
    text: captcha.text.toLowerCase(),
  };
};

export const verifyCaptchaText = (userInput: string, storedText: string): boolean =>
  userInput.toLowerCase().trim() === storedText.toLowerCase().trim();
