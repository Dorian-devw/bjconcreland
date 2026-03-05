import { useEffect } from 'react';

export function PrivacyPolicy() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 pt-[8.75rem] pb-24">
            <div className="max-w-3xl mx-auto px-[5%]">
                <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy &ndash; JJ construcci&oacute;n</h1>
                    <p className="text-gray-500 mb-8">Effective Date: 04/03/2026</p>

                    <div className="space-y-8 text-gray-700">
                        <p className="text-lg">
                            JJ construcci&oacute;n respects your privacy and is committed to protecting your personal information.
                        </p>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>
                            <p className="mb-3">We collect the following information when users voluntarily submit our contact form:</p>
                            <ul className="list-disc pl-6 space-y-2 text-gray-600">
                                <li>Full name</li>
                                <li>Phone number</li>
                                <li>Email address</li>
                                <li>Message content</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. How We Use Information</h2>
                            <p className="mb-3">We use the information solely to:</p>
                            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                                <li>Respond to inquiries</li>
                                <li>Provide requested information</li>
                                <li>Send SMS notifications related to user requests</li>
                            </ul>
                            <p className="font-medium">We do NOT sell, rent, or share personal information with third parties for marketing purposes.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. SMS Communications</h2>
                            <p className="mb-4">
                                By providing your phone number and checking the consent box on our website, you agree to receive SMS messages from JJ construcci&oacute;n.
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-gray-600">
                                <li>Message frequency varies.</li>
                                <li>Message and data rates may apply.</li>
                                <li>You may reply <strong>STOP</strong> to unsubscribe at any time.</li>
                                <li>You may reply <strong>HELP</strong> for assistance.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Data Protection</h2>
                            <p>We implement reasonable security measures to protect your information.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Contact Us</h2>
                            <p className="mb-2">If you have questions about this Privacy Policy, contact us at:</p>
                            <p className="font-medium text-gray-900">Email: josarzc@hotmail.com</p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}