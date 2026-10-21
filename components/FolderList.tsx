'use client';

import React, { useState, useEffect } from 'react';
import type { FolderEntry } from '@/types';

interface FolderListProps {
    structure: FolderEntry[];
    onSelect: (date: string, group: string) => void;
    selectedDate?: string;
    selectedGroup?: string;
}

export default function FolderList({ structure, onSelect, selectedDate, selectedGroup }: FolderListProps) {
    const [openDate, setOpenDate] = useState<string | null>(
        structure.length > 0 ? structure[0].date : null,
    );

    useEffect(() => {
        setOpenDate(selectedDate || structure[0]?.date || null);
    }, [selectedDate, structure]);

    if (structure.length === 0) {
        return <p className="text-gray-500 text-sm py-4 text-center">업로드된 폴더가 없습니다.</p>;
    }

    return (
        <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
            {structure.map((entry) => (
                <div key={entry.date} className="overflow-hidden">
                    {/* 날짜 헤더 */}
                    <button
                        type="button"
                        onClick={() => setOpenDate(openDate === entry.date ? null : entry.date)}
                        className={`w-full flex items-center gap-3 px-3 py-2 font-medium text-sm rounded-[var(--radius-sm)] ${openDate === entry.date ? 'bg-[var(--color-surface)] text-[var(--color-foreground)]' : 'text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]'}`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <span className="flex-1 text-left">{entry.date}</span>
                        <svg
                            className={`w-4 h-4 transition-transform duration-200 ${openDate === entry.date ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* 조 버튼 */}
                    {openDate === entry.date && (
                        <div className="flex flex-col gap-1 mt-1 pl-6">
                            {entry.groups.map((grp) => {
                                const isSelected = selectedDate === entry.date && selectedGroup === grp;
                                return (
                                    <button
                                        key={grp}
                                        type="button"
                                        onClick={() => onSelect(entry.date, grp.replace('조', ''))}
                                        className={`flex items-center gap-3 text-sm px-3 py-2 rounded-[12px] transition font-medium border-2 ${isSelected
                                            ? 'border-[var(--color-foreground)] bg-white text-[var(--color-foreground)]'
                                            : 'border-transparent text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]'
                                            }`}
                                    >
                                        <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                        </svg>
                                        {grp}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
