'use client';

import { demoFetch } from '@/lib/demo-store';

import React, { useState, useRef, useCallback } from 'react';
import ImagePreview from './ImagePreview';
import ProgressOverlay from './ProgressOverlay';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

const MAX_FILES = 4;
const MAX_WIDTH = 1920;
const JPEG_QUALITY = 0.82;

// Canvas API로 이미지 리사이즈 → Blob 반환
async function resizeImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = (ev) => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(
                    (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
                    'image/jpeg',
                    JPEG_QUALITY,
                );
            };
            img.src = ev.target!.result as string;
        };
        reader.readAsDataURL(file);
    });
}

interface UploadState {
    show: boolean;
    total: number;
    completed: number;
    failed: number;
    message: string;
    isDone: boolean;
    isSuccess: boolean;
}

const initialUploadState: UploadState = {
    show: false, total: 0, completed: 0, failed: 0,
    message: '업로드 준비 중...', isDone: false, isSuccess: false,
};

function useToast() {
    const [toast, setToast] = useState('');
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const show = useCallback((msg: string) => {
        setToast(msg);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setToast(''), 3000);
    }, []);
    return { toast, show };
}

export default function UploadForm() {
    const [date, setDate] = useState('');
    const [group, setGroup] = useState('');
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [optimize, setOptimize] = useState(true);
    const [uploadState, setUploadState] = useState<UploadState>(initialUploadState);
    const { toast, show: showToast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.target.files ?? []);
        if (files.length + selected.length > MAX_FILES) {
            showToast(`사진은 최대 ${MAX_FILES}개까지 선택할 수 있습니다.`);
            e.target.value = '';
            return;
        }
        if (selected.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024)) {
            showToast('JPG, PNG, WebP 파일을 한 장당 12MB 이하로 선택해주세요.');
            e.target.value = ''; return;
        }
        setFiles((prev) => [...prev, ...selected]);
        e.target.value = '';
    };

    const handleRemove = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!date || !group || !name || !location || files.length === 0) {
            showToast('모든 항목을 입력하고 사진을 선택해주세요.');
            return;
        }

        setUploadState({ ...initialUploadState, show: true, total: files.length, message: '이 브라우저에서 폴더 준비 중...' });

        let completed = 0;
        let failed = 0;

        let targetGroupId = '';
        try {
            const initRes = await demoFetch('/api/folders/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, group })
            });
            if (!initRes.ok) throw new Error('Failed to init folders');
            const data = await initRes.json();
            targetGroupId = data.groupId;
        } catch (err) {
            console.error('Folder init error:', err);
            showToast('업로드 폴더 생성에 실패했습니다.');
            setUploadState(initialUploadState);
            return;
        }

        setUploadState((prev) => ({ ...prev, message: '브라우저에 사진 저장 중...' }));

        // 각 파일을 multipart/form-data로 서버에 전송 (병렬)
        await Promise.allSettled(
            files.map(async (file, i) => {
                try {
                    const blob = optimize ? await resizeImage(file) : file;

                    const formData = new FormData();
                    formData.append('date', date);
                    formData.append('group', group);
                    formData.append('name', name);
                    formData.append('location', location);
                    formData.append('index', String(i + 1));
                    formData.append('groupId', targetGroupId);
                    formData.append('file', blob, file.name);

                    const res = await demoFetch('/api/upload', { method: 'POST', body: formData });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);

                    completed++;
                    setUploadState((prev) => ({ ...prev, completed }));
                } catch (err) {
                    console.error('Demo save error:', err);
                    showToast(err instanceof Error ? err.message : '사진을 저장하지 못했습니다.');
                    failed++;
                    setUploadState((prev) => ({ ...prev, failed }));
                }
            }),
        );

        setUploadState((prev) => ({
            ...prev,
            isDone: true,
            isSuccess: failed === 0,
            completed,
            failed,
        }));
    };

    const handleBack = () => {
        setUploadState(initialUploadState);
        setFiles([]);
        setDate('');
        setGroup('');
        setName('');
        setLocation('');
        setOptimize(true);
    };

    return (
        <>
            {/* 토스트 알림 */}
            <div
                className={`fixed top-5 right-5 bg-red-500 text-primary-foreground text-sm font-semibold px-4 py-3 rounded-lg shadow-lg z-50
                    transition-all duration-300 ${toast ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}
            >
                {toast}
            </div>

            {/* 업로드 진행 오버레이 */}
            {uploadState.show && (
                <ProgressOverlay
                    total={uploadState.total}
                    completed={uploadState.completed}
                    failed={uploadState.failed}
                    message={uploadState.message}
                    onBack={handleBack}
                    isDone={uploadState.isDone}
                    isSuccess={uploadState.isSuccess}
                />
            )}

            <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">

                {/* 날짜 */}
                <Input
                    id="photoDate"
                    type="date"
                    label="촬영 날짜"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                />

                {/* 조 + 이름 */}
                <div className="flex w-full items-center gap-4">
                    <div className="flex w-1/2 flex-col gap-2">
                        <label htmlFor="userGroup" className="text-sm font-bold text-foreground">
                            조
                        </label>
                        <select
                            id="userGroup"
                            value={group}
                            onChange={(e) => setGroup(e.target.value)}
                            required
                            className="h-11 w-full rounded-[12px] border border-border bg-background px-4 py-2 text-sm text-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                        >
                            <option value="" disabled>선택</option>
                            {[1, 2, 3, 4, 5, 6].map((n) => (
                                <option key={n} value={String(n)}>{n}조</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-1/2">
                        <Input
                            id="userName"
                            type="text"
                            label="가상 이름"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="예: 샘플회원"
                            required
                        />
                    </div>
                </div>

                {/* 출사지 */}
                <Input
                    id="photoLocation"
                    type="text"
                    label="출사지"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="예: 서울숲"
                    required
                />

                {/* 파일 선택 (Dropzone) */}
                <div className="flex flex-col gap-2 pt-2">
                    <label className="text-sm font-bold text-foreground">
                        사진 선택 ({files.length}/{MAX_FILES}개)
                    </label>
                    <label
                        htmlFor="photoFiles"
                        className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-muted bg-background transition hover:bg-surface"
                    >
                        <svg className="mb-2 h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        <span className="text-sm font-medium text-muted">
                            {files.length < MAX_FILES ? `클릭하여 사진 선택` : `최대 업로드 개수 도달`}
                        </span>
                    </label>
                    <input
                        id="photoFiles"
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        disabled={files.length >= MAX_FILES}
                        className="hidden"
                    />
                    <ImagePreview files={files} onRemove={handleRemove} maxFiles={MAX_FILES} />
                </div>

                {/* 빠른 업로드 옵션 */}
                <label className="flex cursor-pointer items-start gap-3 mt-2">
                    <input
                        type="checkbox"
                        checked={optimize}
                        onChange={(e) => setOptimize(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] bg-[var(--color-primary)] checked:bg-[var(--color-primary)]"
                    />
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground">빠른 업로드</span>
                        <p className="text-xs text-muted">
                            {optimize ? '브라우저에서 이미지를 줄여 저장합니다.' : '원본 용량 그대로 업로드합니다.'}
                        </p>
                    </div>
                </label>

                {/* 제출 버튼 */}
                <Button type="submit" variant="primary" fullWidth className="mt-4">
                    이 브라우저에 제출
                </Button>
            </form>
        </>
    );
}
