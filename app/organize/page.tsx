'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import JSZip from 'jszip';
import { demoFetch, demoImageUrl } from '@/lib/demo-store';
import FolderList from '@/components/FolderList';
import PhotoGrid from '@/components/PhotoGrid';
import OrganizerLightbox from '@/components/OrganizerLightbox';
import SubmitterList from '@/components/SubmitterList';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import type { FolderEntry, Photo, PhotosResult } from '@/types';

// 재미있는 로딩 메시지 (organizer.html에서 이어받음)
const LOADING_MESSAGES_FIXED = [
    '서버에 연결하는 중...',
    '폴더를 스캔하고 있습니다...',
    '사진 목록을 가져오는 중...',
    '이미지가 많은 경우 잠깐 기다려주세요 🥹',
];

const LOADING_MESSAGES_RANDOM = [
    '카메라 렌즈를 닦는 중...',
    '구도를 잡는 중입니다...',
    '필름을 현상하는 중... (라이카?)',
    '화이트밸런스를 조정하고 있습니다.',
    '루미나르는 2022년 3월 활동을 시작했습니다.',
    'Tip: 빛을 등지지 마세요! 피사체가 빛을 바라보게 해보세요.',
    'Tip: 역광에서는 노출을 +1~2스탑 올려보세요.',
    'Tip: 가로 사진, 세로 사진 둘 다 찍어보는 습관을 들여보세요.',
    'Tip: 배경을 정리하면 주제가 더 돋보여요.',
    '조리개를 조이고 있습니다... F8!',
];

function getRandomLoadingMessages(): string[] {
    const shuffled = [...LOADING_MESSAGES_RANDOM].sort(() => Math.random() - 0.5);
    return [...LOADING_MESSAGES_FIXED, ...shuffled, '거의 다 됐습니다...'];
}

function thumbnailUrl(fileId: string) {
    return demoImageUrl(fileId);
}

export default function OrganizePage() {
    return (
        <>
            <OrganizeContent />
        </>
    );
}

function OrganizeContent() {
    const router = useRouter();
    const [structure, setStructure] = useState<FolderEntry[]>([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('');
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [orderedPhotos, setOrderedPhotos] = useState<Photo[]>([]);
    const [location, setLocation] = useState('');
    const [isLoadingFolders, setIsLoadingFolders] = useState(false);
    const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState('');
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [toast, setToast] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    }, []);

    // 브라우저에 저장된 데모 폴더 목록 로드
    useEffect(() => {
        setIsLoadingFolders(true);
        demoFetch('/api/folders')
            .then((r) => r.json())
            .then((data: any) => {
                if (Array.isArray(data)) {
                    setStructure(data);
                    if (data[0]?.groups[0]) handleSelectGroup(data[0].date, data[0].groups[0].replace('조', ''));
                } else {
                    console.error('API Error:', data);
                    setStructure([]);
                    showToast(data.error || '폴더 목록을 불러올 수 없습니다.');
                }
            })
            .catch(() => {
                showToast('폴더를 불러오지 못했습니다.');
                setStructure([]);
            })
            .finally(() => setIsLoadingFolders(false));
    }, [showToast]);

    // 조 선택 → 사진 로드
    const handleSelectGroup = useCallback((date: string, group: string) => {
        setSelectedDate(date);
        setSelectedGroup(group);
        setPhotos([]);
        setOrderedPhotos([]);
        setLocation('');
        setIsLoadingPhotos(true);

        // 로딩 메시지 순환
        const messages = getRandomLoadingMessages();
        let idx = 0;
        setLoadingMsg(messages[0]);
        const interval = setInterval(() => {
            idx++;
            if (idx < messages.length) setLoadingMsg(messages[idx]);
            else clearInterval(interval);
        }, 3000);

        demoFetch(`/api/photos?date=${date}&group=${group}`)
            .then((r) => r.json())
            .then((data: PhotosResult) => {
                clearInterval(interval);
                setPhotos(data.photos);
                setLocation(data.location);
            })
            .catch(() => {
                clearInterval(interval);
                showToast('사진을 불러오지 못했습니다.');
            })
            .finally(() => setIsLoadingPhotos(false));
    }, [showToast]);

    const handleDownload = async () => {
        if (orderedPhotos.length === 0) { showToast('다운로드할 사진이 없습니다.'); return; }
        setIsDownloading(true);
        showToast('사진을 압축하고 있습니다...');

        try {
            // JSZip 동적 임포트 (클라이언트에서만)
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();
            const folderName = `${selectedDate}_${selectedGroup}조_사진`;
            const rootFolder = zip.folder(folderName);
            
            if (!rootFolder) throw new Error('Failed to create folder in zip');

            await Promise.all(
                orderedPhotos.map(async (photo, idx) => {
                    // CORS를 피하기 위해 Next.js 내장 API 프록시 활용
                    const res = await demoFetch(`/api/image/${photo.fileId}`);
                    const blob = await res.blob();

                    // 순서를 유지하기 위해 파일명 앞에 01_, 02_ 식별자를 붙임
                    const prefix = String(idx + 1).padStart(2, '0');
                    const numberedName = `${prefix}_${photo.name}`;
                    rootFolder.file(numberedName, blob);
                }),
            );

            const content = await zip.generateAsync({ type: 'blob' });
            const fileName = `${folderName}.zip`;

            // Standard browser download.
            const link = document.createElement('a');
            const url = URL.createObjectURL(content);
            link.href = url;
            link.download = fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 500);
            
            showToast('다운로드가 시작되었습니다.');
        } catch {
            showToast('다운로드 중 오류가 발생했습니다.');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="flex h-screen flex-col bg-[var(--color-background)] overflow-hidden">
            <Header />
            <p className="manager-desktop-note">Manager는 데스크톱용 화면입니다. 가로 1,200px 이상의 PC 브라우저에서 체험해주세요.</p>

            {/* 토스트 */}
            <div
                className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-sm px-5 py-3 rounded-[var(--radius-full)] shadow-lg z-50
                    transition-all duration-300 ${toast ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
            >
                {toast}
            </div>

            {/* 원본 이미지 모달 */}
            {lightboxIndex !== null && (
                <OrganizerLightbox
                    photos={orderedPhotos}
                    currentIndex={lightboxIndex}
                    date={selectedDate}
                    group={selectedGroup}
                    location={location}
                    onClose={() => setLightboxIndex(null)}
                    onNavigate={setLightboxIndex}
                />
            )}

            <main className="flex-1 w-full flex overflow-hidden pt-[72px]">

                {/* Left Sidebar */}
                <aside className="w-[300px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-background)] flex flex-col p-6 h-full overflow-y-auto gap-8">
                    <div className="overflow-y-auto min-h-0 shrink-0">
                        {isLoadingFolders ? (
                            <p className="text-sm text-[var(--color-muted)]">폴더 목록 불러오는 중...</p>
                        ) : (
                            <FolderList
                                structure={structure}
                                onSelect={handleSelectGroup}
                                selectedDate={selectedDate}
                                selectedGroup={selectedGroup ? `${selectedGroup}조` : ''}
                            />
                        )}
                    </div>
                    {/* 하단 패널 (제출자 목록 및 다운로드) */}
                    {(photos.length > 0) && (
                        <div className="border-t border-[var(--color-border)] pt-6 flex flex-col gap-4 shrink-0">
                            <SubmitterList 
                                photoOrder={orderedPhotos.map((p) => ({ filename: p.name }))} 
                                dateText={
                                    selectedDate && !isNaN(new Date(selectedDate).getTime()) 
                                    ? `${selectedDate}(${['일', '월', '화', '수', '목', '금', '토'][new Date(selectedDate).getDay()]})`
                                    : selectedDate
                                }
                                locationName={location}
                            />

                            {selectedDate && selectedGroup && orderedPhotos.length > 0 && (
                                <Button
                                    variant="primary"
                                    onClick={handleDownload}
                                    disabled={isDownloading}
                                    fullWidth
                                    className="h-11 mt-2 text-sm font-bold shadow-sm"
                                >
                                    {isDownloading ? '압축 중...' : '전체 다운로드'}
                                </Button>
                            )}
                        </div>
                    )}
                </aside>

                {/* Right Content Area */}
                <section className="flex-1 bg-[var(--color-background)] p-10 overflow-y-auto h-full">

                    {/* Header Controls */}
                    <div className="flex items-center gap-2 mb-8 text-sm font-medium">
                        <button className="px-4 py-1.5 rounded-[12px] bg-[var(--color-foreground)] text-[var(--color-background)]">
                            Organizer
                        </button>
                        <button
                            className="px-4 py-1.5 rounded-[12px] text-[var(--color-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-foreground)] transition-colors"
                            onClick={() => {
                                const order = orderedPhotos.map((p) => p.fileId).join(',');
                                const query = new URLSearchParams();
                                if (selectedDate) query.set('date', selectedDate);
                                if (selectedGroup) query.set('group', selectedGroup);
                                if (order) query.set('order', order);
                                router.push(`/editor?${query.toString()}`);
                            }}
                        >
                            Editor
                        </button>
                    </div>

                    {(photos.length > 0 || isLoadingPhotos) ? (
                        <div className="flex flex-col gap-6">

                            <div className="flex items-center gap-6">
                                <h1 className="text-3xl font-display font-bold text-[var(--color-foreground)] tracking-tight">
                                    {selectedDate} {location && `(${location})`}
                                </h1>
                            </div>

                            <div className="min-h-40">
                                <PhotoGrid
                                    photos={photos}
                                    onOrderChange={setOrderedPhotos}
                                    onPhotoClick={(src, photoId) => {
                                        const idx = orderedPhotos.findIndex(p => p.fileId === photoId);
                                        if (idx >= 0) setLightboxIndex(idx);
                                    }}
                                    isLoading={isLoadingPhotos}
                                    loadingMessage={loadingMsg}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center text-[var(--color-muted)] h-full">
                            왼쪽 폴더 목록에서 날짜와 조를 선택해주세요.
                        </div>
                    )}

                </section>
            </main>
        </div>
    );
}
