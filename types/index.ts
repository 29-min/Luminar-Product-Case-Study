export interface Photo {
  name: string;
  fileId: string;
}

export interface FolderEntry {
  date: string;
  groups: string[];
}

export interface PhotosResult {
  photos: Photo[];
  location: string;
  members: string[];
}

// ============================================================
// 썸네일 에디터 타입
// ============================================================

export interface CanvasRatio {
  label: string;
  width: number;
  height: number;
}

export const CANVAS_RATIOS: CanvasRatio[] = [
  { label: '1:1', width: 1080, height: 1080 },
  { label: '4:5', width: 1080, height: 1350 },
  { label: '2:3', width: 1080, height: 1620 },
  { label: '9:16', width: 1080, height: 1920 },
];

export interface OverlayItem {
  id: string;
  name: string;
  file: string | null;
  preview: string | null;
}

export interface EditorTextStyle {
  fontFamily: string;
  fontSize: number;
  fill: string;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
}

export const EDITOR_FONTS = [
  { label: 'Noto Sans KR', value: 'Noto Sans KR' },
  { label: 'Pretendard', value: 'Pretendard' },
  { label: '나눔스퀘어', value: 'NanumSquare' },
  { label: 'Gmarket Sans', value: 'GmarketSans' },
];

export interface EditorLayer {
  id: string;
  type: 'text' | 'image';
  preview: string; // 텍스트 내용 또는 이미지 이름
  objectRef?: any; // fabric object reference (optional, internal use)
}


