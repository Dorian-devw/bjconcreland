import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSettingsStore } from '@/store/settingsStore';
import { formatRichText } from '@/lib/richText';

export function TermsConditions() {
    const { terms, fetchTerms } = useSettingsStore();

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchTerms();
    }, [fetchTerms]);

    return (
        <div className="min-h-screen bg-gray-50 pt-[8.75rem] pb-24">
            <div className="max-w-3xl mx-auto px-[5%]">
                <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms &amp; Conditions &ndash; JJ construcci&oacute;n</h1>
                    {/* If we have dynamic terms, render them */}
                    {terms ? (
                       <div
                           className="space-y-4 text-gray-700"
                           dangerouslySetInnerHTML={{ __html: formatRichText(terms) }}
                       />
                    ) : (
                    <>
                    <p className="text-gray-500 mb-8">Effective Date: 04/03/2026</p>

                    <div className="space-y-8 text-gray-700">
                        <p className="text-lg">
                            By using our website and submitting our contact form, you agree to the following terms:
                        </p>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Program Description</h2>
                            <p>
                                JJ contrucci&oacute;n provides SMS notifications related to inquiries submitted through our website.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Message Frequency</h2>
                            <p>
                                Message frequency varies and depends on user interaction.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Fees</h2>
                            <p>
                                Message and data rates may apply depending on your mobile carrier plan.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Opt-Out Instructions</h2>
                            <ul className="list-none space-y-2 text-gray-600">
                                <li>You may opt out at any time by replying <strong>STOP</strong> to any SMS message.</li>
                                <li>You may receive assistance by replying <strong>HELP</strong>.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Support</h2>
                            <p className="mb-2">For support, contact:</p>
                            <p className="font-medium text-gray-900">Email: josarzc@hotmail.com</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Privacy</h2>
                            <p className="mb-2">Your information will be handled in accordance with our Privacy Policy:</p>
                            <p>
                                <Link to="/privacy-policy" className="text-[#e85d04] hover:underline font-medium break-all">
                                    https://www.bjconcreland.com/politica
                                </Link>
                            </p>
                        </section>
                    </div>
                    </>
                    )}
                </div>
            </div>
        </div>
    );
}
