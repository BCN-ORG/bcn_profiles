export type AvatarUploadSignature = {
  uploadUrl: string;
  method: string;
  maxBytes: number;
  expiresAt: string;
  secureUrl: string;
  publicId: string;
};

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
    throw new Error(`${uploadFailedMessage} (${put.status})`);
  }
}
