'use client';

import React, { useRef, useEffect } from 'react';

interface ImagePreviewProps {
    files: File[];
    onRemove: (index: number) => void;
    maxFiles: number;
}

export default function ImagePreview({ files, onRemove, maxFiles }: ImagePreviewProps) {
    // 이미지 URL 캐시 (파일마다 objectURL 생성)
    const urlCacheRef = useRef<Map<File, string>>(new Map());
    useEffect(() => {
        for (const [file, url] of urlCacheRef.current) {
            if (!files.includes(file)) { URL.revokeObjectURL(url); urlCacheRef.current.delete(file); }
        }
    }, [files]);
    useEffect(() => {
        const cache = urlCacheRef.current;
        return () => { cache.forEach(url => URL.revokeObjectURL(url)); cache.clear(); };
    }, []);

    function getUrl(file: File): string {
        if (!urlCacheRef.current.has(file)) {
            urlCacheRef.current.set(file, URL.createObjectURL(file));
        }
        return urlCacheRef.current.get(file)!;
    }

    return (
        <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">
                사진 선택 <span className="font-normal text-gray-500">({files.length}/{maxFiles})</span>
            </p>
            {files.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                    {files.map((file, i) => (
                        <div key={i} className="relative group aspect-square">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={getUrl(file)}
                                alt={file.name}
                                className="w-full h-full object-cover rounded-lg"
                            />
                            <button
                                type="button"
                                onClick={() => onRemove(i)}
                                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs
                           flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                aria-label="사진 삭제"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
