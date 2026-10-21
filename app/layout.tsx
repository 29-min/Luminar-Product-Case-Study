import type { Metadata } from 'next';
import DemoProvider from '@/components/DemoProvider';
import './globals.css';

export const metadata: Metadata = {
    title: 'LUMINAR | Product Case Study & Demo',
    description: '사진 제출부터 SNS 표지 제작까지, 루미나르 운영 흐름을 체험하는 포트폴리오 데모입니다.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
    return <html lang="ko"><body><DemoProvider>{children}</DemoProvider></body></html>;
}
