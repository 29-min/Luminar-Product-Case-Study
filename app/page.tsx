import Link from 'next/link';
import { Header } from '@/components/layout/Header';

export default function HomePage() {
    return <div><Header />
        <main>
            <section className="demo-hero">
                <div className="hero-art" aria-hidden="true"><img src="/images/home-main.jpg" alt="" /></div>
                <div className="relative z-10 mx-auto max-w-6xl px-6 py-28 sm:px-12">
                    <p className="mb-8 text-xs font-semibold tracking-[.28em] text-white/70">LUMINAR · PRODUCT CASE STUDY</p>
                    <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-7xl">사진은 남기고,<br />반복 업무는 줄이고.</h1>
                    <p className="mt-8 max-w-xl text-base leading-8 text-white/80 sm:text-lg">사진 제출부터 분류, 순서 결정, SNS 표지 제작까지.<br className="hidden sm:block" /> 대학생 사진 동아리의 운영 흐름을 하나로 연결했습니다.</p>
                    <div className="mt-10 flex flex-wrap gap-3">
                        <Link href="/organize/" className="rounded-xl bg-white px-6 py-3.5 font-semibold text-black">Organizer 체험하기 →</Link>
                        <Link href="/submit/" className="rounded-xl border border-white/40 px-6 py-3.5 font-semibold text-white">사진 제출 체험</Link>
                    </div>
                    <p className="mt-8 text-xs text-white/60">공개 데모 · 가상 회원 · 외부 저장소 연결 없음</p>
                </div>
            </section>
            <section className="mx-auto max-w-6xl px-6 py-20 sm:px-12">
                <p className="text-xs font-semibold tracking-[.2em] text-neutral-500">FROM SUBMISSION TO PUBLISHING</p>
                <h2 className="mt-4 text-3xl font-bold tracking-tight">한 번의 제출이 다음 작업으로 이어지도록</h2>
                <div className="mt-10 grid gap-6 md:grid-cols-3">
                    {[
                        ['01', '제출과 분류', '날짜·조·이름·출사지를 입력하면 폴더와 파일명이 정리됩니다.', '/submit/', '제출하기'],
                        ['02', '조회와 순서 결정', '날짜와 조별로 사진을 확인하고 게시물에 사용할 순서를 정합니다.', '/organize/', 'Organizer 열기'],
                        ['03', 'SNS 표지 제작', '촬영 정보가 채워진 표지를 편집하고 사진과 함께 내려받습니다.', '/editor/', 'Editor 열기'],
                    ].map(([step, title, description, href, label]) => <article key={step} className="rounded-2xl border border-neutral-200 p-7">
                        <span className="text-sm text-neutral-400">{step}</span><h3 className="mt-8 text-xl font-bold">{title}</h3>
                        <p className="mt-4 min-h-20 leading-7 text-neutral-500">{description}</p><Link href={href} className="mt-6 inline-block font-semibold underline underline-offset-4">{label} →</Link>
                    </article>)}
                </div>
            </section>
            <section className="bg-neutral-100 px-6 py-16 text-center">
                <h2 className="text-2xl font-bold">실제 운영 경험을 안전하게 체험하는 공개본</h2>
                <p className="mx-auto mt-5 max-w-2xl leading-8 text-neutral-600">2024년 Google Apps Script MVP에서 시작해 Next.js 서비스로 확장한 프로젝트입니다. 이 데모는 기존 서비스의 Organizer와 Editor를 바탕으로 데이터 연결을 브라우저 저장소로 교체했습니다. 실제 회원 명단과 제출 사진 목록은 포함하지 않습니다.</p>
            </section>
        </main>
        <footer className="p-8 text-center text-xs leading-6 text-neutral-500">LUMINAR · Portfolio Showcase<br />이 화면은 공개 데모이며, 실제 운영 화면과 구분됩니다.</footer>
    </div>;
}
