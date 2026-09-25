import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { logError } from '@/services/logger';

export type ImagePickErrorCode = 'PERMISSION_DENIED' | 'UNAVAILABLE';

export class ImagePickError extends Error {
  code: ImagePickErrorCode;

  constructor(code: ImagePickErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export type PickedAsset = {
  uri: string;
  width: number;
  height: number;
};

export type ProcessedImage = {
  uri: string;
  base64: string;
  mimeType: 'image/jpeg';
};

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.75;

/** Opens the camera and returns the captured photo, or null if the user canceled. */
export async function pickImageFromCamera(): Promise<PickedAsset | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    throw new ImagePickError(
      'PERMISSION_DENIED',
      'SnapVocab cần quyền truy cập camera để chụp ảnh. Vui lòng cấp quyền trong Cài đặt.',
    );
  }

  let result: ImagePicker.ImagePickerResult;
  try {
    result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
  } catch (err) {
    logError('image.camera', err);
    throw new ImagePickError('UNAVAILABLE', 'Không thể mở camera trên thiết bị này.');
  }

  return toPickedAsset(result);
}

/** Opens the photo library and returns the selected photo, or null if the user canceled. */
export async function pickImageFromLibrary(): Promise<PickedAsset | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new ImagePickError(
      'PERMISSION_DENIED',
      'SnapVocab cần quyền truy cập thư viện ảnh để chọn ảnh. Vui lòng cấp quyền trong Cài đặt.',
    );
  }

  let result: ImagePicker.ImagePickerResult;
  try {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
  } catch (err) {
    logError('image.library', err);
    throw new ImagePickError('UNAVAILABLE', 'Không thể mở thư viện ảnh trên thiết bị này.');
  }

  return toPickedAsset(result);
}

function toPickedAsset(result: ImagePicker.ImagePickerResult): PickedAsset | null {
  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }
  const asset = result.assets[0];
  return { uri: asset.uri, width: asset.width, height: asset.height };
}

/**
 * Resizes the image so its longest edge is at most MAX_EDGE, re-encodes it as
 * JPEG, and returns a base64 payload small enough for the Gemini request.
 * The original photo file is never modified or stored permanently.
 */
export async function processImageForAnalysis(asset: PickedAsset): Promise<ProcessedImage> {
  const isLandscape = asset.width >= asset.height;
  const longEdge = Math.min(Math.max(asset.width, asset.height), MAX_EDGE);

  const context = ImageManipulator.manipulate(asset.uri).resize(
    isLandscape ? { width: longEdge, height: null } : { width: null, height: longEdge },
  );
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: JPEG_QUALITY,
    base64: true,
  });

  if (!saved.base64) {
    throw new Error('Image manipulation did not return base64 data.');
  }

  return { uri: saved.uri, base64: saved.base64, mimeType: 'image/jpeg' };
}
