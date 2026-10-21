'use client';

import type { Photo, FolderEntry, PhotosResult } from '@/types';

type DemoPhoto = Photo & { date: string; group: string; location: string; blob?: Blob };
const DB_NAME = 'luminar-showcase-v1';
const STORE = 'photos';
const samples: DemoPhoto[] = Array.from({ length: 8 }, (_, i) => ({
    fileId: `sample-${i + 1}`,
    name: `샘플회원${Math.floor(i / 2) + 1}-${i % 2 + 1}-${i < 6 ? '빛의정원' : '도시산책'}.svg`,
    date: i < 6 ? '2026-04-18' : '2026-04-11',
    group: '1',
    location: i < 6 ? '빛의정원' : '도시산책',
}));
let records = [...samples];
const imageUrls = new Map<string, string>();
let database: IDBDatabase | null = null;
let initializing: Promise<void> | null = null;
let pendingWrites = 0;

export function initializeDemo(): Promise<void> {
    if (initializing) return initializing;
    initializing = new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'fileId' });
        request.onerror = () => reject(new Error('브라우저 저장소를 열 수 없습니다. 저장소 접근을 허용한 뒤 다시 시도해주세요.'));
        request.onsuccess = () => {
            database = request.result;
            const read = database.transaction(STORE).objectStore(STORE).getAll();
            read.onerror = () => reject(new Error('데모 데이터를 읽지 못했습니다.'));
            read.onsuccess = () => {
                const saved = read.result as DemoPhoto[];
                saved.forEach(photo => {
                    if (photo.blob) imageUrls.set(photo.fileId, URL.createObjectURL(photo.blob));
                });
                records = [...samples, ...saved];
                resolve();
            };
        };
    });
    return initializing;
}

export function demoImageUrl(id: string): string {
    const sample = samples.find(photo => photo.fileId === id);
    if (sample) return `/samples/${id}.svg`;
    const url = imageUrls.get(id);
    if (!url) throw new Error('이 브라우저에 없는 사진입니다. 폴더를 다시 선택해주세요.');
    return url;
}

function folders(): FolderEntry[] {
    const dates = new Map<string, Set<string>>();
    records.forEach(photo => {
        if (!dates.has(photo.date)) dates.set(photo.date, new Set());
        dates.get(photo.date)!.add(`${photo.group}조`);
    });
    return [...dates].sort(([a], [b]) => b.localeCompare(a))
        .map(([date, groups]) => ({ date, groups: [...groups].sort() }));
}

function photos(date: string, group: string): PhotosResult {
    const selected = records.filter(photo => photo.date === date && photo.group === group);
    return {
        photos: selected.map(({ fileId, name }) => ({ fileId, name })),
        location: selected[0]?.location ?? '',
        members: [...new Set(selected.map(photo => photo.name.split('-')[0]))],
    };
}

async function savePhoto(form: FormData) {
    if (!database) throw new Error('저장소를 먼저 초기화해주세요.');
    const file = form.get('file');
    if (!(file instanceof File) || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Error('JPG, PNG, WebP 이미지만 사용할 수 있습니다.');
    }
    if (file.size > 12 * 1024 * 1024) throw new Error('사진 한 장은 12MB 이하로 선택해주세요.');
    if (records.length - samples.length + pendingWrites >= 40) throw new Error('데모 사진은 최대 40장입니다. 초기화 후 다시 시도해주세요.');
    const date = String(form.get('date') ?? '');
    const group = String(form.get('group') ?? '');
    const name = String(form.get('name') ?? '').trim();
    const location = String(form.get('location') ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^[1-6]$/.test(group) || !name || !location) {
        throw new Error('날짜, 조, 가상 이름, 출사지를 확인해주세요.');
    }
    // Delimiters are reserved for the original service's filename parsing convention.
    const clean = (value: string) => value.replace(/[\\/<>:"|?*\u0000-\u001f.-]/g, '_').slice(0, 40);
    const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
    const index = Number(form.get('index')) || 1;
    const record: DemoPhoto = {
        fileId: crypto.randomUUID(), date, group, location: clean(location), blob: file,
        name: `${clean(name)}-${index}-${clean(location)}.${extension}`,
    };
    pendingWrites++;
    try { await new Promise<void>((resolve, reject) => {
        const transaction = database!.transaction(STORE, 'readwrite');
        transaction.objectStore(STORE).put(record);
        transaction.oncomplete = () => resolve();
        transaction.onabort = transaction.onerror = () => reject(new Error('저장 공간이 부족하거나 저장이 거부되었습니다. 데모를 초기화해주세요.'));
    });
    records.push(record);
    imageUrls.set(record.fileId, URL.createObjectURL(file));
    } finally { pendingWrites--; }
    return { ok: true, fileId: record.fileId };
}

/** Client-only compatibility adapter for the preserved UI. No HTTP API requests are made. */
export async function demoFetch(input: string, options?: RequestInit): Promise<Response> {
    await initializeDemo();
    const url = new URL(input, window.location.origin);
    if (url.origin !== window.location.origin) throw new Error('외부 주소는 사용할 수 없습니다.');
    if (url.pathname.startsWith('/api/image/')) {
        const id = decodeURIComponent(url.pathname.slice('/api/image/'.length));
        const record = records.find(photo => photo.fileId === id);
        if (!record) throw new Error('사진을 찾을 수 없습니다.');
        if (record.blob) return new Response(record.blob);
        // The only network fetch is for a bundled, same-origin SVG sample asset.
        const response = await fetch(demoImageUrl(id));
        if (!response.ok) throw new Error('샘플 이미지를 불러오지 못했습니다.');
        return response;
    }
    if (url.pathname === '/api/folders') return Response.json(folders());
    if (url.pathname === '/api/photos') return Response.json(photos(url.searchParams.get('date') ?? '', url.searchParams.get('group') ?? ''));
    if (url.pathname === '/api/folders/init') return Response.json({ groupId: 'browser-only' });
    if (url.pathname === '/api/upload' && options?.method === 'POST' && options.body instanceof FormData) {
        return Response.json(await savePhoto(options.body));
    }
    throw new Error('지원하지 않는 데모 동작입니다.');
}

export async function resetDemo(): Promise<void> {
    await initializeDemo();
    await new Promise<void>((resolve, reject) => {
        const transaction = database!.transaction(STORE, 'readwrite');
        transaction.objectStore(STORE).clear();
        transaction.oncomplete = () => resolve();
        transaction.onabort = transaction.onerror = () => reject(new Error('초기화에 실패했습니다. 다시 시도해주세요.'));
    });
    imageUrls.forEach(url => URL.revokeObjectURL(url));
    imageUrls.clear();
    records = [...samples];
}
