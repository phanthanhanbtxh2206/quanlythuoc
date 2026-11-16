/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GoogleDriveUploadResult {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  folderId?: string;
  error?: string;
}

/**
 * Find or create a single Google Drive folder under a parent folder ID
 */
const getOrCreateSingleFolder = async (
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<string> => {
  const cleanName = folderName.replace(/'/g, "\\'").trim();
  const qParts = [
    `name = '${cleanName}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    `trashed = false`,
  ];
  if (parentId) {
    qParts.push(`'${parentId}' in parents`);
  }

  const query = encodeURIComponent(qParts.join(' and '));
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=1`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
  }

  const createBody: Record<string, any> = {
    name: folderName.trim(),
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    createBody.parents = [parentId];
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createBody),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Không thể tạo thư mục "${folderName}" trên Google Drive (${createRes.status}): ${errText}`);
  }

  const created = await createRes.json();
  return created.id;
};

/**
 * Traverse/create nested folder hierarchy (e.g., "QUAN_LY_THUOC_TRUNG_TAM/2026/PHIEU_NHAP")
 */
export const ensureDriveFolderPath = async (
  accessToken: string,
  folderPath: string
): Promise<string | undefined> => {
  const segments = (folderPath || '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length === 0) return undefined;

  let currentParentId: string | undefined = undefined;
  for (const seg of segments) {
    currentParentId = await getOrCreateSingleFolder(accessToken, seg, currentParentId);
  }
  return currentParentId;
};

/**
 * Upload real file content (HTML/JSON/CSV) to Google Drive v3 using multipart upload
 */
export const uploadFileToGoogleDrive = async (
  accessToken: string,
  folderPath: string,
  fileName: string,
  content: string,
  mimeType = 'text/html'
): Promise<GoogleDriveUploadResult> => {
  try {
    const folderId = await ensureDriveFolderPath(accessToken, folderPath);

    const metadata: Record<string, any> = {
      name: fileName,
      mimeType,
    };
    if (folderId) {
      metadata.parents = [folderId];
    }

    const boundary = 'btxh_drive_boundary_' + Date.now();
    const multipartBody =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
      `${content}\r\n` +
      `--${boundary}--`;

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return {
        success: false,
        error: `Google Drive API trả về lỗi (${uploadRes.status}): ${errText}`,
      };
    }

    const fileData = await uploadRes.json();
    return {
      success: true,
      fileId: fileData.id,
      webViewLink: fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view`,
      folderId,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Lỗi tải tệp lên Google Drive.',
    };
  }
};

/**
 * Find a file by exact name inside a Google Drive folder path
 */
const findFileInDriveFolder = async (
  accessToken: string,
  folderPath: string,
  fileName: string
): Promise<{ fileId?: string; folderId?: string; webViewLink?: string }> => {
  const folderId = await ensureDriveFolderPath(accessToken, folderPath);
  const cleanName = fileName.replace(/'/g, "\\'").trim();
  const qParts = [`name = '${cleanName}'`, `trashed = false`];
  if (folderId) {
    qParts.push(`'${folderId}' in parents`);
  }
  const query = encodeURIComponent(qParts.join(' and '));
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)&pageSize=1`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) return { folderId };
  const data = await res.json();
  const found = data.files?.[0];
  return {
    fileId: found?.id,
    webViewLink: found?.webViewLink,
    folderId,
  };
};

/**
 * Upsert (overwrite existing or create new) the JSON system state snapshot on Google Drive
 */
export const upsertJsonFileInGoogleDrive = async (
  accessToken: string,
  folderPath: string,
  fileName: string,
  jsonContent: string
): Promise<GoogleDriveUploadResult> => {
  try {
    const existing = await findFileInDriveFolder(accessToken, folderPath, fileName);
    if (existing.fileId) {
      const updateRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existing.fileId}?uploadType=media&fields=id,name,webViewLink`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
          body: jsonContent,
        }
      );
      if (updateRes.ok) {
        const updated = await updateRes.json();
        return {
          success: true,
          fileId: updated.id,
          webViewLink: updated.webViewLink || `https://drive.google.com/file/d/${updated.id}/view`,
          folderId: existing.folderId,
        };
      }
    }

    return await uploadFileToGoogleDrive(accessToken, folderPath, fileName, jsonContent, 'application/json');
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Lỗi ghi tệp trạng thái JSON lên Google Drive.',
    };
  }
};

/**
 * Read the JSON system state snapshot from Google Drive for two-way sync
 */
export const readJsonFileFromGoogleDrive = async (
  accessToken: string,
  folderPath: string,
  fileName: string
): Promise<{ success: boolean; content?: string; fileId?: string; error?: string }> => {
  try {
    const found = await findFileInDriveFolder(accessToken, folderPath, fileName);
    if (!found.fileId) {
      return { success: false, error: 'Chưa tìm thấy bản sao lưu trạng thái JSON trên Google Drive.' };
    }
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${found.fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Lỗi đọc tệp Drive (${res.status}): ${errText}` };
    }
    const content = await res.text();
    return { success: true, content, fileId: found.fileId };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Không thể tải dữ liệu từ Google Drive.' };
  }
};

