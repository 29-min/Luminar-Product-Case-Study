import { Header } from '@/components/layout/Header';
import UploadForm from '@/components/UploadForm';

export default function SubmitPage() {
    return <div className="min-h-screen bg-white"><Header />
        <main className="px-4 pb-20 pt-36 flex justify-center">
            <div className="w-full max-w-[480px] rounded-[20px] border border-neutral-200 bg-white p-6 sm:p-10 shadow-xl">
                <img src="/bg_w_black.png" alt="LUMINAR" className="mx-auto h-20 object-contain" />
                <h1 className="my-6 text-center text-2xl font-bold">루미나르 출사 사진 제출</h1>
                <p className="mb-6 text-sm leading-relaxed text-neutral-500">가상 이름과 테스트 사진을 사용해주세요. 제출한 사진은 외부로 전송되지 않으며, 데모 초기화 시 이 브라우저에서 삭제됩니다.</p>
                <UploadForm />
            </div>
        </main>
    </div>;
}
