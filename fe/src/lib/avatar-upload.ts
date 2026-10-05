export type AvatarUploadSignature = {
  uploadUrl: string;
  method: string;
  maxBytes: number;
  expiresAt: string;
  secureUrl: string;
  publicId: string;
};

export type UploadStage = 'signature' | 'storage' | 'confirm';

export class UploadStageError extends Error {
  constructor(
    readonly stage: UploadStage,
    message: string,
    readonly details: {
      status?: number;
      code?: string;
      requestId?: string;
      fileSize?: number;
      mime?: string;
    } = {},
  ) {
    super(message);
  }
}

export async function putAvatarFile(
  file: File,
  signature: AvatarUploadSignature,
  invalidTypeMessage: string,
  tooLargeMessage: string,
  uploadFailedMessage: string,
) {
  if (!file.type.startsWith('image/')) {
    throw new Error(invalidTypeMessage);
  }
  if (file.size === 0 || file.size > signature.maxBytes) {
    throw new Error(tooLargeMessage);
  }
  if (Date.now() >= Date.parse(signature.expiresAt)) {
    throw new Error(uploadFailedMessage);
  }

  const put = await fetch(signature.uploadUrl, {
    method: signature.method || 'PUT',
    credentials: 'omit',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!put.ok) {
    const storage = await readStorageError(put);
    throw new UploadStageError('storage', `${uploadFailedMessage} (${put.status})`, {
      status: put.status,
      code: storage.code,
      requestId: storage.requestId,
      fileSize: file.size,
      mime: file.type || 'application/octet-stream',
    });
  }
}

export function logUploadStageError(error: unknown) {
  if (!(error instanceof UploadStageError)) return;
  console.warn('avatar_upload_failed', {
    stage: error.stage,
    ...error.details,
  });
}

async function readStorageError(response: Response) {
  const text = await response.text().catch(() => '');
  return {
    code: text.match(/<Code>([^<]+)<\/Code>/)?.[1],
    requestId:
      text.match(/<RequestId>([^<]+)<\/RequestId>/)?.[1] ||
      response.headers.get('x-amz-request-id') ||
      response.headers.get('x-request-id') ||
      undefined,
  };
}
