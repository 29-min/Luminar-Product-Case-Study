'use client';

import React, { useCallback } from 'react';
import { getInstaId } from '@/lib/members';

interface SubmitterListProps {
    photoOrder: Array<{ filename: string }>;
    dateText?: string;
    locationName?: string;
}

function parseNameFromFilename(filename: string): string {
    return filename.split('-')[0]?.trim() ?? '';
}

export default function SubmitterList({ photoOrder, dateText, locationName }: SubmitterListProps) {
    const generateText = useCallback((): string => {
        let titleLine = '-';
        if (dateText && locationName) {
            titleLine = `- ${dateText} / ${locationName}`;
        } else if (dateText) {
            titleLine = `- ${dateText}`;
        } else if (locationName) {
            titleLine = `- ${locationName}`;
        }

        if (photoOrder.length === 0) return `${titleLine}\n`;

        let result = `${titleLine}\n`;
        let i = 0;

        while (i < photoOrder.length) {
            const currentName = parseNameFromFilename(photoOrder[i].filename);
            if (!currentName) { i++; continue; }

            const instaId = getInstaId(currentName);
            const nameAndId = instaId ? `${currentName} ${instaId}` : currentName;

            let start = i + 1;
            let end = i + 1;
            let j = i + 1;

            while (j < photoOrder.length) {
                if (parseNameFromFilename(photoOrder[j].filename) === currentName) {
                    end = j + 1;
                    j++;
                } else {
                    break;
                }
            }

            const range = start === end ? `${start}` : `${start}-${end}`;
            result += `• ${range} ${nameAndId}\n`;
            i = j;
        }

        return result;
    }, [photoOrder, dateText, locationName]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(generateText());
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-[var(--color-muted)]">제출자 명단</h2>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="text-xs bg-[var(--color-surface)] hover:bg-[var(--color-border)] text-[var(--color-foreground)] font-semibold py-1 px-2.5 rounded-[var(--radius-sm)] transition"
                >
                    복사
                </button>
            </div>
            <textarea
                readOnly
                value={generateText()}
                className="w-full h-40 p-3 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-[var(--radius-sm)] resize-none focus:outline-none text-[var(--color-foreground)] shadow-sm"
            />
        </div>
    );
}
