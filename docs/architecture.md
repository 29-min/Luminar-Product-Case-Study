# 서비스 구조

## 운영 서비스

Next.js App Router에서 회원용 제출 화면과 관리자용 Organizer·Editor를 구성했습니다. 서버는 Google Drive API로 사진과 폴더를 관리하고, 브라우저는 사진 정렬과 표지 편집을 처리합니다.

```text
회원 브라우저
  ├─ 촬영 날짜·조·이름·출사지 입력
  ├─ Canvas 이미지 축소 (선택)
  ├─ 날짜/조 폴더 초기화 요청
  └─ multipart 파일 전송
          ↓
Next.js Route Handlers
  ├─ 폴더 조회·생성
  ├─ 파일명 생성
  └─ OAuth2 인증 → Google Drive API v3
          ↓
Google Drive
  └─ 루트 / 날짜 / 조 / 이름-번호-출사지.jpg

관리자 브라우저
  ├─ 폴더·사진 목록 조회
  ├─ 이미지 프록시로 사진 로드
  ├─ Organizer: 정렬·명단 생성
  └─ Editor: Fabric.js 편집 → JPG / ZIP 내보내기
```

### 업로드와 자동 분류

날짜와 조에 해당하는 폴더를 먼저 준비한 뒤 사진별로 파일을 전송합니다. 서버는 제출 정보로 파일명을 만들고 Drive에 저장합니다.

```text
촬영 날짜: 2026-04-18
조: 1조
이름: 샘플회원
출사지: 빛의정원

저장 위치: 루트 / 2026-04-18 / 1조 / 샘플회원-1-빛의정원.jpg
```

여기서 자동 라벨링은 입력한 촬영 정보를 파일명과 폴더에 반영하는 기능입니다. 사진 내용을 인식해 태그를 붙이는 방식은 아닙니다.

최적화 옵션을 켜면 Canvas에서 가로 폭을 최대 1,920px로 줄이고 JPEG quality 0.82로 인코딩합니다. 여러 파일은 `Promise.allSettled`로 처리해 개별 성공·실패 수를 표시합니다.

### Drive 인증

서버에 보관한 OAuth2 Refresh Token으로 Drive API를 호출합니다. 회원이 각자 Google에 로그인할 필요는 없습니다. 루트 폴더는 ID로 지정하거나 이름으로 조회합니다.

초기에는 Service Account와 브라우저 직접 업로드를 시도했습니다. 저장공간 오류와 업로드 테스트의 CORS 문제에 대응하면서 OAuth2·서버 중계 방식으로 변경했습니다. [변경 이유와 해결 과정](product-decisions.md)을 참고하세요.

### 사진 조회와 내보내기

목록 API는 파일 ID와 이름을 반환합니다. 사진은 이미지 프록시에서 가져오고, 제출자와 장소는 파일명에서 읽습니다.

Organizer의 정렬 순서는 Editor URL에 전달됩니다. ZIP 내보내기에서는 파일명 앞에 `01_`, `02_`를 붙여 순서를 보존합니다. 표지는 Fabric.js의 1,080×1,350 캔버스에서 편집하고 2배 크기의 JPEG로 출력합니다. 표지와 사진을 묶는 작업은 브라우저에서 JSZip으로 처리합니다.

## 공개 데모

Google Drive와 운영 API를 제거하고 정적 페이지로 구성했습니다. 제출·조회·편집 흐름은 브라우저 안에서 체험할 수 있습니다.

```text
Next.js 정적 빌드 → HTML / JS / CSS / 샘플 이미지
                            ↓
브라우저
  ├─ 기본 샘플 데이터
  ├─ IndexedDB: 제출한 사진 Blob과 촬영 정보
  ├─ Blob URL: 미리보기와 편집 이미지
  └─ Fabric.js + JSZip: 표지·사진 다운로드
```

기존 UI의 요청 형식을 유지하기 위해 `demoFetch` 어댑터를 두었습니다. `/api/photos` 같은 문자열을 받아 로컬 데이터를 읽는 함수이며, 서버로 API 요청을 전송하지 않습니다. 기본 샘플 이미지만 같은 출처의 정적 파일에서 읽습니다.

저장 데이터는 새로고침 후에도 유지됩니다. ‘데모 초기화’를 누르면 제출한 사진을 삭제하고 Blob URL을 해제합니다. 다른 브라우저나 기기와 동기화되지는 않습니다.

### 코드 안내

| 파일 | 역할 |
| --- | --- |
| [`lib/demo-store.ts`](../lib/demo-store.ts) | 샘플 데이터, IndexedDB 저장·조회·초기화, 이미지 URL |
| [`components/UploadForm.tsx`](../components/UploadForm.tsx) | 파일 선택·검증·축소·진행 상태 |
| [`app/organize/page.tsx`](../app/organize/page.tsx) | 날짜·조 선택, 명단, 다운로드, Editor 이동 |
| [`components/PhotoGrid.tsx`](../components/PhotoGrid.tsx) | 사진 그리드와 순서 변경 |
| [`app/editor/page.tsx`](../app/editor/page.tsx) | 편집 상태와 내보내기 |
| [`components/ThumbnailEditor.tsx`](../components/ThumbnailEditor.tsx) | Fabric.js 캔버스와 표지 레이어 |
| [`next.config.ts`](../next.config.ts) | 정적 export 설정 |

Manager는 데스크톱 전용입니다. 데모의 업로드 한도는 한 장 12MB, 한 번 4장, 저장 사진 40장입니다. 최적화를 끄면 원본 파일이 메타데이터와 함께 로컬에 저장될 수 있으므로 테스트 사진을 사용해주세요.
