import type { APIGatewayProxyEventV2 } from 'aws-lambda';

export interface MultipartFile {
  fieldname: string;
  filename: string;
  encoding: string;
  mimetype: string;
  data: Buffer;
}

export interface ParsedMultipart {
  files: Record<string, MultipartFile>;
  fields: Record<string, string>;
}

export function parseMultipart(event: APIGatewayProxyEventV2): ParsedMultipart {
  const contentType = event.headers?.['content-type'] || event.headers?.['Content-Type'];
  if (!contentType) {
    throw new Error('Missing Content-Type header');
  }

  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    throw new Error('Unsupported Media Type: must be multipart/form-data');
  }

  const boundaryMatch = contentType.match(/boundary=([^;]+)/);
  if (!boundaryMatch) {
    throw new Error('Multipart boundary not found in Content-Type header');
  }

  let boundary = boundaryMatch[1].trim();
  if (boundary.startsWith('"') && boundary.endsWith('"')) {
    boundary = boundary.substring(1, boundary.length - 1);
  }

  const bodyBuffer = event.body
    ? event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body, 'utf8')
    : Buffer.alloc(0);

  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts: Buffer[] = [];
  let index = bodyBuffer.indexOf(boundaryBuffer);

  while (index !== -1) {
    const nextIndex = bodyBuffer.indexOf(boundaryBuffer, index + boundaryBuffer.length);
    if (nextIndex !== -1) {
      parts.push(bodyBuffer.subarray(index + boundaryBuffer.length, nextIndex));
    }
    index = nextIndex;
  }

  const files: Record<string, MultipartFile> = {};
  const fields: Record<string, string> = {};

  for (const part of parts) {
    let partNormalized = part;
    if (partNormalized.indexOf(Buffer.from('\r\n')) === 0) {
      partNormalized = partNormalized.subarray(2);
    }

    const headerEndIndex = partNormalized.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEndIndex === -1) continue;

    const headersString = partNormalized.subarray(0, headerEndIndex).toString('utf8');
    let content = partNormalized.subarray(headerEndIndex + 4);
    const suffix = Buffer.from('\r\n');
    if (content.lastIndexOf(suffix) === content.length - suffix.length) {
      content = content.subarray(0, content.length - suffix.length);
    }

    // Parse headers
    const headers = headersString.split('\r\n');
    let fieldname = '';
    let filename = '';
    let mimetype = '';

    for (const header of headers) {
      const lowerHeader = header.toLowerCase();
      if (lowerHeader.startsWith('content-disposition:')) {
        const fieldnameMatch = header.match(/name="([^"]+)"/);
        if (fieldnameMatch) fieldname = fieldnameMatch[1];

        const filenameMatch = header.match(/filename="([^"]+)"/);
        if (filenameMatch) filename = filenameMatch[1];
      } else if (lowerHeader.startsWith('content-type:')) {
        const typePart = header.split(':')[1].trim();
        mimetype = typePart.split(';')[0].trim();
      }
    }

    if (fieldname) {
      if (filename) {
        files[fieldname] = {
          fieldname,
          filename,
          encoding: '7bit',
          mimetype,
          data: content,
        };
      } else {
        fields[fieldname] = content.toString('utf8');
      }
    }
  }

  return { files, fields };
}
