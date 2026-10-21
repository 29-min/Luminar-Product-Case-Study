'use client';

import { demoImageUrl } from '@/lib/demo-store';

import React, { useEffect, useCallback } from 'react';
import type { Photo } from '@/types';

interface OrganizerLightboxProps {
    photos: Photo[];
    currentIndex: number;
    date: string;
    group: string;
    location: string;
    onClose: () => void;
    onNavigate: (index: number) => void;
}

export default function OrganizerLightbox({
    photos, currentIndex, date, group, location, onClose, onNavigate
}: OrganizerLightboxProps) {
    const currentPhoto = photos[currentIndex];

    const handlePrevious = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (currentIndex > 0) {
            onNavigate(currentIndex - 1);
        }
    }, [currentIndex, onNavigate]);

    const handleNext = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (currentIndex < photos.length - 1) {
            onNavigate(currentIndex + 1);
        }
    }, [currentIndex, photos.length, onNavigate]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowLeft') {
                handlePrevious();
            } else if (e.key === 'ArrowRight') {
                handleNext();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        // Prevent background scrolling when modal is open
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'auto';
        };
    }, [onClose, handlePrevious, handleNext]);

    if (!currentPhoto) return null;

    const imageUrl = demoImageUrl(currentPhoto.fileId);
    const locationText = location ? `📍 ${location}` : `조별 사진 (${group})`;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md transition-opacity duration-300"
            onClick={onClose}
        >
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start pointer-events-none z-10">
                <div className="text-white drop-shadow-md">
                    <p className="font-bold text-lg">{currentPhoto.name.split('-')[0]}</p>
                    <p className="text-sm opacity-80">{date} &middot; {locationText}</p>
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="pointer-events-auto p-2 bg-black/40 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md"
                    aria-label="닫기"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Left Navigation */}
            {currentIndex > 0 && (
                <button
                    onClick={handlePrevious}
                    className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 p-3 md:p-4 bg-black/40 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md z-10"
                    aria-label="이전 사진"
                >
                    <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            )}

            {/* Image Container */}
            <div className="relative w-full h-full max-w-[90vw] max-h-[85vh] flex items-center justify-center px-12 md:px-24">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={imageUrl}
                    alt={currentPhoto.name}
                    className="max-w-full max-h-full object-contain shadow-2xl rounded-sm"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>

            {/* Right Navigation */}
            {currentIndex < photos.length - 1 && (
                <button
                    onClick={handleNext}
                    className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 p-3 md:p-4 bg-black/40 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md z-10"
                    aria-label="다음 사진"
                >
                    <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            )}

            {/* Bottom Counter */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium tracking-widest">
                {currentIndex + 1} / {photos.length}
            </div>
        </div>
    );
}
