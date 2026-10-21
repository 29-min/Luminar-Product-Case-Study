'use client';

import React from 'react';

interface ProgressOverlayProps {
    total: number;
    completed: number;
    failed: number;
    message: string;
    onBack: () => void;
    isDone: boolean;
    isSuccess: boolean;
}

export default function ProgressOverlay({
    total,
    completed,
    failed,
    message,
    onBack,
    isDone,
    isSuccess,
}: ProgressOverlayProps) {
    const progressPercent = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;

    return (
        <div className="fixed inset-0 bg-white/95 z-50 flex flex-col items-center justify-center text-center p-8">
            {!isDone ? (
                <>
                    {/* 스피너 */}
                    <div className="w-14 h-14 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin mb-6" />
                    <h2 className="text-2xl font-bold text-gray-800">{message}</h2>
                    <p className="text-gray-500 mt-2 text-sm">
                        {completed + failed} / {total} 처리 중...
                    </p>
                    {/* 진행률 바 */}
                    <div className="w-full max-w-xs bg-gray-200 rounded-full h-2 mt-4">
                        <div
                            className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </>
            ) : (
                <>
                    <div className={`text-5xl mb-4`}>{isSuccess ? '✅' : '⚠️'}</div>
                    <h2 className={`text-2xl font-bold ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
                        {isSuccess ? '브라우저 저장 완료!' : '일부 실패'}
                    </h2>
                    <p className="text-gray-600 mt-2 text-sm">
                        외부 전송 없이 {completed}개 저장 {failed > 0 && `/ ${failed}개 실패`}
                    </p>
                    <button
                        onClick={onBack}
                        className="mt-8 bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-8 rounded-lg transition"
                    >
                        다른 사진 제출
                    </button>
                    <a href="/organize/" className="mt-4 underline underline-offset-4">Organizer에서 확인하기 →</a>
                </>
            )}
        </div>
    );
}
