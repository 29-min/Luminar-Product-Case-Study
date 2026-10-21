'use client';

import { demoImageUrl } from '@/lib/demo-store';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import type { Photo } from '@/types';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function useFlip(containerRef: React.RefObject<HTMLDivElement | null>, items: any[], draggingId: string | null) {
    const previousRects = useRef<Map<string, DOMRect>>(new Map());

    useIsomorphicLayoutEffect(() => {
        if (!containerRef.current) return;
        const children = Array.from(containerRef.current.children) as HTMLElement[];

        // Cancel mid-flight animations to read true destination bounds
        children.forEach(child => {
            child.getAnimations().forEach(anim => anim.cancel());
        });

        children.forEach(child => {
            const key = child.getAttribute('data-flip-id');
            if (key) {
                const prevRect = previousRects.current.get(key);
                const currentRect = child.getBoundingClientRect();

                if (prevRect && key !== draggingId) {
                    const dx = prevRect.left - currentRect.left;
                    const dy = prevRect.top - currentRect.top;
                    if (dx !== 0 || dy !== 0) {
                        child.animate(
                            [
                                { transform: `translate(${dx}px, ${dy}px)` },
                                { transform: 'translate(0px, 0px)' }
                            ],
                            {
                                duration: 300,
                                easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                            }
                        );
                    }
                }
                previousRects.current.set(key, currentRect);
            }
        });
    }, [items, draggingId]);
}

interface PhotoItem extends Photo {
    orientation?: 'landscape' | 'portrait' | 'square';
}

interface PhotoGridProps {
    photos: Photo[];
    onOrderChange: (ordered: Photo[]) => void;
    onPhotoClick: (url: string, fileId: string) => void;
    isLoading: boolean;
    loadingMessage: string;
}

function thumbnailUrl(fileId: string) {
    return demoImageUrl(fileId);
}
function originalUrl(fileId: string) {
    return demoImageUrl(fileId);
}

export default function PhotoGrid({
    photos,
    onOrderChange,
    onPhotoClick,
    isLoading,
    loadingMessage,
}: PhotoGridProps) {
    const [items, setItems] = useState<PhotoItem[]>([]);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const activeIdRef = useRef<string | null>(null);
    const latestItems = useRef<PhotoItem[]>([]);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const lastSwapTime = useRef<number>(0);

    useFlip(containerRef, items, draggingId);

    useEffect(() => {
        latestItems.current = items;
    }, [items]);

    // photos prop이 바뀌면 orientation 감지 후 상태 초기화
    useEffect(() => {
        let cancelled = false;
        const withOrientation = photos.map((p) => ({ ...p, orientation: undefined as PhotoItem['orientation'] }));
        setItems(withOrientation);

        // setTimeout 0으로 감싸서 렌더링 중 다른 컴포넌트(부모)의 state를 즉시 변경하는 것을 피함
        setTimeout(() => {
            onOrderChange(withOrientation);
        }, 0);

        // 썸네일 로드 후 방향 감지
        withOrientation.forEach((p, idx) => {
            const img = new Image();
            img.onload = () => {
                const orientation: PhotoItem['orientation'] =
                    img.width > img.height ? 'landscape' : img.width < img.height ? 'portrait' : 'square';
                if (cancelled) return;
                setItems(prev => prev.map(item => item.fileId === p.fileId ? { ...item, orientation } : item));
            };
            img.src = thumbnailUrl(p.fileId);
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [photos]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, fileId: string) => {
        activeIdRef.current = fileId;
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
        }
        setTimeout(() => setDraggingId(fileId), 0);
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
        e.preventDefault();

        const now = Date.now();
        if (now - lastSwapTime.current < 120) return;

        const activeId = activeIdRef.current;
        if (!activeId || activeId === targetId) return;

        lastSwapTime.current = now;

        setItems((prevItems) => {
            const dragIdx = prevItems.findIndex(i => i.fileId === activeId);
            const targetIdx = prevItems.findIndex(i => i.fileId === targetId);

            if (dragIdx === -1 || targetIdx === -1 || dragIdx === targetIdx) return prevItems;

            const newItems = [...prevItems];
            const [movedItem] = newItems.splice(dragIdx, 1);
            newItems.splice(targetIdx, 0, movedItem);
            return newItems;
        });
    };

    const handleContainerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();

        const now = Date.now();
        if (now - lastSwapTime.current < 120) return;

        const activeId = activeIdRef.current;
        if (!activeId) return;

        // 빈 여백(목록의 마지막 끝)에 드래그하면 꼬리로 보냄
        // 단, gap-5 사이 공간에 마우스가 스쳐도 container 이벤트가 발생하므로,
        // 무분별하게 맨 끝으로 가는 현상(사방팔방 튀는 버그)을 막기 위해 실제 마지막 아이템 아래/우측인지 검사
        if (e.target === e.currentTarget && containerRef.current) {
            const children = containerRef.current.children;
            if (children.length > 0) {
                const lastChild = children[children.length - 1];
                const lastRect = lastChild.getBoundingClientRect();

                // 마우스가 맨 마지막 줄 아래 있거나, 같은 줄 우측 끝에 있을 때만 작동
                const isBelow = e.clientY > lastRect.bottom;
                const isRight = e.clientY >= lastRect.top && e.clientX > lastRect.right;

                if (isBelow || isRight) {
                    lastSwapTime.current = now;
                    setItems((prevItems) => {
                        const dragIdx = prevItems.findIndex(i => i.fileId === activeId);
                        if (dragIdx === -1) return prevItems;

                        const targetIdx = prevItems.length - 1;
                        if (dragIdx === targetIdx) return prevItems;

                        const newItems = [...prevItems];
                        const [movedItem] = newItems.splice(dragIdx, 1);
                        newItems.splice(targetIdx, 0, movedItem);
                        return newItems;
                    });
                }
            }
        }
    };

    // handleDragOver logic was merged into the individual item onDragOver handle

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        handleDragEnd();
    };

    const handleDragEnd = () => {
        activeIdRef.current = null;
        setDraggingId(null);
        setTimeout(() => {
            onOrderChange(latestItems.current);
        }, 0);
    };

    const movePhoto = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= items.length) return;
        const next = [...items];
        [next[index], next[target]] = [next[target], next[index]];
        latestItems.current = next;
        setItems(next);
        onOrderChange(next);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-48 text-gray-400 text-sm gap-3">
                <div className="w-8 h-8 border-3 border-gray-200 border-t-indigo-400 rounded-full animate-spin" />
                <p>{loadingMessage}</p>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-48 text-gray-400 text-sm">
                폴더를 선택하면 사진이 표시됩니다.
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="grid gap-5 pb-10 content-start"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', minHeight: '300px' }}
            onDragOver={handleContainerDragOver}
            onDrop={handleDrop}
        >
            {items.map((item, index) => {
                const isDragging = draggingId === item.fileId;

                return (
                    <div
                        key={item.fileId}
                        data-flip-id={item.fileId}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.fileId)}
                        onDragEnter={handleDragEnter}
                        onDragOver={(e) => handleDragOver(e, item.fileId)}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
                        className={`relative p-3 rounded-[var(--radius-lg)] transform-gpu transition-opacity transition-shadow transition-colors duration-200 ease-out cursor-grab active:cursor-grabbing flex flex-col ${isDragging ? 'bg-[var(--color-surface)] ring-2 ring-[var(--color-foreground)] ring-inset opacity-40 shadow-inner border-2 border-[var(--color-foreground)] border-dashed z-0' : 'bg-[var(--color-background)] opacity-100 shadow-sm hover:shadow-md z-10'}`}
                    >
                        <div role="button" tabIndex={0} aria-label={`${item.name} 확대 보기`} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPhotoClick(originalUrl(item.fileId), item.fileId); } }} className="w-full pt-[75%] rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-surface)] relative group cursor-pointer" onClick={() => onPhotoClick(originalUrl(item.fileId), item.fileId)}>
                            {/* Orientation Badge */}
                            {item.orientation && (
                                <div className="absolute top-2 left-2 z-10 bg-black/80 text-white rounded-[6px] p-1.5 shadow-sm font-bold flex items-center justify-center pointer-events-none">
                                    {item.orientation === 'landscape' && (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect>
                                        </svg>
                                    )}
                                    {item.orientation === 'portrait' && (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="6" y="2" width="12" height="20" rx="2" ry="2"></rect>
                                        </svg>
                                    )}
                                    {item.orientation === 'square' && (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        </svg>
                                    )}
                                </div>
                            )}

                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={thumbnailUrl(item.fileId)}
                                alt={item.name}
                                draggable={false}
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                                loading="lazy"
                            />
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2 text-xs">
                            <span className="text-neutral-500">{index + 1} / {items.length}</span>
                            <div className="flex gap-2">
                                <button type="button" disabled={index === 0} aria-label={`${item.name} 앞으로 이동`} onClick={() => movePhoto(index, -1)} className="rounded border border-neutral-200 px-2 py-1 disabled:opacity-25">← 앞</button>
                                <button type="button" disabled={index === items.length - 1} aria-label={`${item.name} 뒤로 이동`} onClick={() => movePhoto(index, 1)} className="rounded border border-neutral-200 px-2 py-1 disabled:opacity-25">뒤 →</button>
                            </div>
                        </div>

                        <div className="mt-3 flex justify-between items-center gap-2">
                            <div className="flex-1 min-w-0 pointer-events-none">
                                <p className="text-sm font-bold text-[var(--color-foreground)] truncate" title={item.name}>
                                    {item.name.split('-').slice(0, 2).join('-')}
                                </p>
                            </div>
                            <div className="shrink-0 pointer-events-none">
                                <span className="bg-[var(--color-foreground)] text-[var(--color-background)] px-2 py-0.5 rounded-[6px] text-[10px] font-bold uppercase tracking-wider">
                                    {item.name.split('.').pop()?.toUpperCase() || 'IMG'}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
