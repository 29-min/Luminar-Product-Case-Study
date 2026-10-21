'use client';

import { useEffect, useState } from 'react';
import { initializeDemo, resetDemo } from '@/lib/demo-store';

export default function DemoProvider({ children }: { children: React.ReactNode }) {
    const [ready, setReady] = useState(false);
    const [error, setError] = useState('');
    const [resetting, setResetting] = useState(false);
    useEffect(() => { initializeDemo().then(() => setReady(true)).catch(error => setError(error.message)); }, []);
    const reset = async () => {
        setResetting(true);
        try { await resetDemo(); window.location.assign('/organize/'); }
        catch (error) { setError(error instanceof Error ? error.message : '초기화에 실패했습니다.'); setResetting(false); }
    };
    return <>
        <div className="demo-notice">
            <p><strong>PORTFOLIO DEMO</strong><span>샘플 그래픽과 가상 회원으로 체험합니다. 선택한 사진은 이 브라우저에만 저장됩니다.</span></p>
            <button onClick={reset} disabled={!ready || resetting}>{resetting ? '초기화 중…' : '데모 초기화'}</button>
        </div>
        {error ? <main className="p-12 pt-48 text-center" role="alert"><h1 className="text-xl">브라우저 저장소를 확인해주세요</h1><p className="mt-4">{error}</p><button className="mt-6 underline" onClick={() => window.location.reload()}>다시 시도</button></main>
            : ready ? children : <main className="p-12 pt-48 text-center" role="status">데모 준비 중…</main>}
    </>;
}
