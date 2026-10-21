'use client';

import React, { useRef, useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ThumbnailEditor, { type ThumbnailEditorHandle } from '@/components/ThumbnailEditor';
import EditorToolbar from '@/components/EditorToolbar';
import { demoFetch, demoImageUrl } from '@/lib/demo-store';
import { Header } from '@/components/layout/Header';
import type { Photo, EditorTextStyle, FolderEntry } from '@/types';

// 사이드바 썸네일 및 캔버스용 원본 이미지 모두 자체 API 프록시 활용 (엑박 방지)
function thumbUrl(fileId: string) {
    return demoImageUrl(fileId);
}

function fullUrl(fileId: string) {
    return demoImageUrl(fileId);
}

function EditorContent() {
    const params = useSearchParams();
    const router = useRouter();
    const date = params?.get('date') ?? '2026-04-18';
    const group = params?.get('group') ?? '1';
    const orderParam = params?.get('order');
    const orderedIds: string[] = orderParam ? orderParam.split(',').filter(Boolean) : [];

    const editorRef = useRef<ThumbnailEditorHandle>(null);

    const [photos, setPhotos] = useState<Photo[]>([]);
    const [activeFileId, setActiveFileId] = useState<string | null>(null);

    // ── 고정 템플릿 상태
    const [category, setCategory] = useState('정기출사');
    const [locationName, setLocationName] = useState('출사지 이름');
    const [dateText, setDateText] = useState('2026-00-00(토)');
    const [timeText, setTimeText] = useState('오후 정기출사');
    const [groupNum, setGroupNum] = useState('0조');
    const [members, setMembers] = useState('조원 이름');

    const [textStyle] = useState<EditorTextStyle>({
        fontFamily: 'sans-serif',
        fontSize: 48,
        fill: '#ffffff',
        fontWeight: 'bold',
        textAlign: 'left',
    });

    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState('');
    const [download, setDownload] = useState<{ url: string; name: string } | null>(null);
    useEffect(() => () => { if (download) URL.revokeObjectURL(download.url); }, [download]);
    const [isLoading, setIsLoading] = useState(true);
    const [structure, setStructure] = useState<FolderEntry[]>([]);

    // ── 폴더 목록 로드
    useEffect(() => {
        demoFetch('/api/folders')
            .then((r) => r.json())
            .then((data: FolderEntry[]) => setStructure(data))
            .catch(console.error);
    }, []);

    const handleSelectGroup = useCallback((newDate: string, newGroup: string) => {
        router.push(`/editor?date=${newDate}&group=${encodeURIComponent(newGroup)}`);
    }, [router]);

    // ── 사진 목록 로드
    useEffect(() => {
        if (!date || !group) { setIsLoading(false); return; }
        (async () => {
            try {
                const res = await demoFetch(`/api/photos?date=${date}&group=${encodeURIComponent(group)}`);
                const data = await res.json();
                let list: Photo[] = data.photos ?? [];

                if (orderedIds.length > 0) {
                    const idx = new Map(orderedIds.map((id, i) => [id, i]));
                    list = [...list].sort((a, b) => (idx.get(a.fileId) ?? 99) - (idx.get(b.fileId) ?? 99));
                }

                setPhotos(list);
                // 첫 번째 사진을 기본 선택
                if (list.length > 0) setActiveFileId(list[0].fileId);

                // 자동 완성: 조, 날짜, 장소, 명단
                setGroupNum(`${group}조`);
                if (date) {
                    const d = new Date(date);
                    if (!isNaN(d.getTime())) {
                        const days = ['일', '월', '화', '수', '목', '금', '토'];
                        setDateText(`${date}(${days[d.getDay()]})`);
                    }
                }
                if (data.location) setLocationName(data.location);
                if (data.members && data.members.length > 0) {
                    setMembers(data.members.join(' '));
                }

            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, group]);

    const handleExport = useCallback(async () => {
        if (!editorRef.current) return;
        setExporting(true);
        setExportError('');
        try {
            const blob = await editorRef.current.exportJPG();
            if (!blob) throw new Error('표지를 준비 중입니다. 사진이 표시된 뒤 다시 시도해주세요.');

            const fileName = `thumbnail_${date}_${group}.jpg`;

            // Standard browser download; no native file picker dependency.
            const jpegBlob = new Blob([blob], { type: 'image/jpeg' });
            const url = URL.createObjectURL(jpegBlob);
            setDownload({ url, name: fileName });
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
            }, 500);
        } catch (error) {
            setExportError(error instanceof Error ? error.message : '내보내기에 실패했습니다.');
        } finally { setExporting(false); }
    }, [date, group]);

    const handleZipExport = useCallback(async () => {
        if (!editorRef.current || photos.length === 0) return;
        setExporting(true);
        setExportError('');
        try {
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();
            const folderName = `${date}_${group}조_사진`;
            const rootFolder = zip.folder(folderName);
            
            if (!rootFolder) throw new Error('Failed to create folder in zip');

            const thumbBlob = await editorRef.current.exportJPG();
            if (!thumbBlob) throw new Error('표지를 준비 중입니다. 사진이 표시된 뒤 다시 시도해주세요.');
            if (thumbBlob) {
                rootFolder.file('00_thumbnail.jpg', thumbBlob);
            }

            await Promise.all(
                photos.map(async (photo, idx) => {
                    try {
                        const res = await demoFetch(`/api/image/${photo.fileId}`);
                        const blob = await res.blob();
                        const ext = blob.type.includes('png') ? 'png' : 'jpg';

                        // 원본 파일명 유지하고, 앞에 순서 식별자 추가
                        const prefix = String(idx + 1).padStart(2, '0');
                        const filename = photo.name || `${photo.fileId}.${ext}`;
                        const numberedFilename = `${prefix}_${filename}`;
                        
                        rootFolder.file(numberedFilename, blob);
                    } catch { throw new Error('사진을 가져오지 못했습니다. 다시 시도해주세요.'); }
                })
            );

            const content = await zip.generateAsync({ type: 'blob' });
            const fileName = `${folderName}.zip`;

            // Standard browser download; no native file picker dependency.
            const a = document.createElement('a');
            const url = URL.createObjectURL(content);
            setDownload({ url, name: fileName });
            a.href = url;
            a.download = fileName;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
            }, 500);
        } catch (error) {
            setExportError(error instanceof Error ? error.message : '내보내기에 실패했습니다.');
        } finally { setExporting(false); }
    }, [photos, date, group]);

    const photoUrl = activeFileId ? fullUrl(activeFileId) : null;

    return (
        <div className="flex h-screen flex-col bg-[var(--color-background)] overflow-hidden">
            <Header />
            <p className="manager-desktop-note">Manager는 데스크톱용 화면입니다. 가로 1,200px 이상의 PC 브라우저에서 체험해주세요.</p>
            {download && <p role="status" className="fixed bottom-4 right-4 z-[80] rounded-xl border border-neutral-200 bg-white p-4 shadow-lg">파일 준비 완료 · <a className="underline" href={download.url} download={download.name}>{download.name} 다운로드</a></p>}
            {exportError && <p role="alert" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[80] rounded-xl bg-red-50 p-4 text-red-800">{exportError}</p>}

            <main className="flex-1 w-full flex overflow-hidden pt-[72px]">
                {/* ── 좌측 도구 패널 (Sidebar) */}
                <aside className="w-[300px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-background)] flex flex-col h-full overflow-hidden">
                    <EditorToolbar
                        photos={photos}
                        structure={structure}
                        selectedDate={date}
                        selectedGroup={group}
                        onSelectGroup={handleSelectGroup}
                        category={category}
                        locationName={locationName}
                        dateText={dateText}
                        timeText={timeText}
                        groupNum={groupNum}
                        members={members}
                        onCategoryChange={setCategory}
                        onLocationNameChange={setLocationName}
                        onDateTextChange={setDateText}
                        onTimeTextChange={setTimeText}
                        onGroupNumChange={setGroupNum}
                        onMembersChange={setMembers}
                        onZipExport={handleZipExport}
                        exporting={exporting}
                    />
                </aside>

                {/* ── 중앙 Canvas 영역 */}
                <section className="flex-1 bg-[var(--color-background)] px-10 pt-10 pb-6 overflow-hidden flex flex-col h-full relative">
                    {/* Header Controls */}
                    <div className="flex items-center justify-between mb-8 shrink-0">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <button
                                className="px-4 py-1.5 rounded-[12px] text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)] transition-colors"
                                onClick={() => router.push(`/organize`)}
                            >
                                Organizer
                            </button>
                            <button className="px-4 py-1.5 rounded-[12px] bg-[var(--color-foreground)] text-[var(--color-background)] shadow-md">
                                Editor
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[var(--color-foreground)] bg-[var(--color-background)] px-3 py-1.5 rounded-full border border-[var(--color-border)] shadow-sm">
                                {date} · {group}조 편집
                            </span>
                            <button
                                onClick={handleExport}
                                disabled={exporting}
                                className="text-xs font-semibold bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 disabled:opacity-50 text-[var(--color-primary-foreground)] px-4 py-1.5 rounded-full shadow-sm transition flex items-center justify-center gap-2"
                            >
                                {exporting ? (
                                    <>
                                        <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg> 처리 중...
                                    </>
                                ) : '📥 화면만 내보내기'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden relative shadow-sm">
                        {/* 캔버스 영역 */}
                        <div className="flex-1 flex flex-col items-center justify-center overflow-auto p-6">
                            {isLoading ? (
                                <div className="text-[var(--color-muted)] text-sm animate-pulse">사진 불러오는 중...</div>
                            ) : photos.length === 0 ? (
                                <div className="text-[var(--color-muted)] text-sm">사진이 없습니다. 오른쪽 목록에서 선택하세요.</div>
                            ) : (
                                <ThumbnailEditor
                                    ref={editorRef}
                                    photoUrl={photoUrl}
                                    category={category}
                                    locationName={locationName}
                                    dateText={dateText}
                                    timeText={timeText}
                                    groupNum={groupNum}
                                    members={members}
                                    textStyle={textStyle}
                                />
                            )}
                        </div>
                    </div>
                </section>

                {/* ── 우측 사진 목록 */}
                <aside className="w-40 shrink-0 bg-[var(--color-background)] border-l border-[var(--color-border)] flex flex-col overflow-hidden">
                    <div className="p-4 text-xs font-bold text-[var(--color-muted)] border-b border-[var(--color-border)] shrink-0">
                        사진 목록 ({photos.length})
                    </div>
                    <div className="flex flex-col gap-2 p-3 overflow-y-auto">
                        {isLoading ? (
                            <p className="text-xs text-[var(--color-muted)] text-center py-4">불러오는 중...</p>
                        ) : photos.map((photo, i) => {
                            const isActive = activeFileId === photo.fileId;
                            return (
                                <button
                                    key={photo.fileId}
                                    onClick={() => setActiveFileId(photo.fileId)}
                                    className={`relative rounded-lg overflow-hidden border-2 transition
                      ${isActive ? 'border-[var(--color-foreground)] shadow-md' : 'border-transparent hover:border-[var(--color-border)]'}`}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={thumbUrl(photo.fileId)}
                                        alt={photo.name}
                                        className="w-full aspect-square object-cover bg-[var(--color-surface)]"
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                    />
                                    <span className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                                        {i + 1}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </aside>
            </main>
        </div>
    );
}

export default function EditorPage() {
    return (
        <>
            <Suspense fallback={
                <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500 text-sm">
                    로딩 중...
                </div>
            }>
                <EditorContent />
            </Suspense>
        </>
    );
}

