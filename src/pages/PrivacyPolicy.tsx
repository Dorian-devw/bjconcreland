import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

export function PrivacyPolicy() {
    const { privacyPolicy, loading, fetchPrivacyPolicy } = useSettingsStore();

    useEffect(() => {
        fetchPrivacyPolicy();
    }, [fetchPrivacyPolicy]);
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 pt-[8.75rem] pb-24">
            <div className="max-w-3xl mx-auto px-[5%]">
                <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy &ndash; JJ construcci&oacute;n</h1>
                    <p className="text-gray-500 mb-8">Effective Date: 04/03/2026</p>

                    <div className="space-y-4 text-gray-700 whitespace-pre-wrap">
                        {loading && !privacyPolicy ? (
                            <div className="animate-pulse space-y-4">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-full"></div>
                                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                                <div className="h-4 bg-gray-200 rounded w-full"></div>
                            </div>
                        ) : privacyPolicy ? (
                            privacyPolicy.split('\n').map((paragraph, index) => (
                                paragraph.trim() ? (
                                    <p key={index} className="text-lg leading-relaxed">
                                        {paragraph}
                                    </p>
                                ) : (
                                    <br key={index} />
                                )
                            ))
                        ) : (
                            <p className="text-lg">Las políticas de privacidad no están disponibles en este momento.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}