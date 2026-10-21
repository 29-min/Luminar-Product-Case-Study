'use client';

import React from 'react';
import type { FolderEntry, Photo } from '@/types';
import FolderList from '@/components/FolderList';
import SubmitterList from '@/components/SubmitterList';

interface Props {
    photos: Photo[];
    structure: FolderEntry[];
    selectedDate: string;
    selectedGroup: string;
    onSelectGroup: (date: string, group: string) => void;
    category: string;
    locationName: string;
    dateText: string;
    timeText: string;
    groupNum: string;
    members: string;
    onCategoryChange: (s: string) => void;
    onLocationNameChange: (s: string) => void;
    onDateTextChange: (s: string) => void;
    onTimeTextChange: (s: string) => void;
    onGroupNumChange: (s: string) => void;
    onMembersChange: (s: string) => void;
    onZipExport: () => void;
    exporting: boolean;
}

export default function EditorToolbar({
    photos, structure, selectedDate, selectedGroup, onSelectGroup,
    category, locationName, dateText, timeText, groupNum, members,
    onCategoryChange, onLocationNameChange, onDateTextChange, onTimeTextChange, onGroupNumChange, onMembersChange,
    onZipExport, exporting,
}: Props) {
    return (
        <div className="flex flex-col gap-6 p-6 h-full text-[var(--color-foreground)] overflow-y-auto">

            {/* 폴더 선택 */}
            <section className="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)]">
                <h3 className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider mb-2">폴더 선택</h3>
                <FolderList
                    structure={structure}
                    selectedDate={selectedDate}
                    selectedGroup={`${selectedGroup}조`}
                    onSelect={onSelectGroup}
                />
            </section>

            <hr className="border-[var(--color-border)] opacity-50" />

            {/* 텍스트 입력 */}
            <section className="space-y-4">
                <h3 className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider mb-2">내용 입력</h3>

                {/* 분류 */}
                <div>
                    <label className="text-xs text-[var(--color-muted)] mb-1.5 block font-medium">분류</label>
                    <input
                        type="text"
                        value={category}
                        onChange={(e) => onCategoryChange(e.target.value)}
                        placeholder="정기출사, 번개 등"
                        className="w-full bg-[var(--color-surface)] text-[var(--color-foreground)] text-sm px-3 py-2.5 rounded-[12px] border border-[var(--color-border)] outline-none transition focus:border-[var(--color-foreground)] focus:ring-1 focus:ring-[var(--color-foreground)] placeholder-[var(--color-muted)]"
                    />
                </div>

                {/* 출사지 이름 */}
                <div>
                    <label className="text-xs text-[var(--color-muted)] mb-1.5 block font-medium">출사지 이름</label>
                    <textarea
                        value={locationName}
                        onChange={(e) => onLocationNameChange(e.target.value)}
                        placeholder="출사지 이름 입력"
                        rows={2}
                        className="w-full bg-[var(--color-surface)] text-[var(--color-foreground)] text-sm px-3 py-2.5 rounded-[12px] border border-[var(--color-border)] outline-none transition focus:border-[var(--color-foreground)] focus:ring-1 focus:ring-[var(--color-foreground)] resize-none placeholder-[var(--color-muted)]"
                    />
                </div>

                {/* 날짜 텍스트 */}
                <div>
                    <label className="text-xs text-[var(--color-muted)] mb-1.5 block font-medium">날짜 텍스트</label>
                    <input
                        type="text"
                        value={dateText}
                        onChange={(e) => onDateTextChange(e.target.value)}
                        placeholder="2026-00-00(토)"
                        className="w-full bg-[var(--color-surface)] text-[var(--color-foreground)] text-sm px-3 py-2.5 rounded-[12px] border border-[var(--color-border)] outline-none transition focus:border-[var(--color-foreground)] focus:ring-1 focus:ring-[var(--color-foreground)] placeholder-[var(--color-muted)]"
                    />
                </div>

                {/* 세부 타이틀 */}
                <div>
                    <label className="text-xs text-[var(--color-muted)] mb-1.5 block font-medium">세부 타이틀 (Time/Type)</label>
                    <input
                        type="text"
                        value={timeText}
                        onChange={(e) => onTimeTextChange(e.target.value)}
                        placeholder="오후 정기출사 등"
                        className="w-full bg-[var(--color-surface)] text-[var(--color-foreground)] text-sm px-3 py-2.5 rounded-[12px] border border-[var(--color-border)] outline-none transition focus:border-[var(--color-foreground)] focus:ring-1 focus:ring-[var(--color-foreground)] placeholder-[var(--color-muted)]"
                    />
                </div>

                {/* 조 번호 + 참여자 */}
                <div className="flex gap-4">
                    <div className="w-1/3">
                        <label className="text-xs text-[var(--color-muted)] mb-1.5 block font-medium">조 번호</label>
                        <input
                            type="text"
                            value={groupNum}
                            onChange={(e) => onGroupNumChange(e.target.value)}
                            placeholder="0조"
                            className="w-full bg-[var(--color-surface)] text-[var(--color-foreground)] text-sm px-3 py-2.5 rounded-[12px] border border-[var(--color-border)] outline-none transition focus:border-[var(--color-foreground)] focus:ring-1 focus:ring-[var(--color-foreground)] placeholder-[var(--color-muted)]"
                        />
                    </div>
                    <div className="w-2/3">
                        <label className="text-xs text-[var(--color-muted)] mb-1.5 block font-medium">참여자 명단</label>
                        <input
                            type="text"
                            value={members}
                            onChange={(e) => onMembersChange(e.target.value)}
                            placeholder="이름 띄어쓰기로 구분"
                            className="w-full bg-[var(--color-surface)] text-[var(--color-foreground)] text-sm px-3 py-2.5 rounded-[12px] border border-[var(--color-border)] outline-none transition focus:border-[var(--color-foreground)] focus:ring-1 focus:ring-[var(--color-foreground)] placeholder-[var(--color-muted)]"
                        />
                    </div>
                </div>
            </section>

            {/* 전체 사진 내보내기 & 제출자 명단 */}
            <div className="mt-auto pt-6 border-t border-[var(--color-border)] flex flex-col gap-4">
                {photos.length > 0 && (
                    <SubmitterList 
                        photoOrder={photos.map((p) => ({ filename: p.name }))} 
                        dateText={dateText}
                        locationName={locationName}
                    />
                )}
                <button
                    onClick={onZipExport}
                    disabled={exporting}
                    className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 disabled:opacity-50 text-[var(--color-primary-foreground)] font-bold py-3.5 rounded-[12px] transition flex items-center justify-center gap-2 text-sm shadow-sm"
                >
                    {exporting ? (
                        <>
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>내보내는 중...
                        </>
                    ) : '📦 전체 사진 다운로드'}
                </button>
            </div>

        </div>
    );
}
