import { useState } from 'react';
import { Phone, Mail, Send, Facebook, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/context/LanguageContext';
import { useSettingsStore } from '@/store/settingsStore';
import { API } from '@/lib/api';
import { useEffect } from 'react';

export function Contact() {
  const { t } = useLanguage();
  const { contactInfo, fetchContactInfo } = useSettingsStore();

  useEffect(() => {
    if (!contactInfo) {
      fetchContactInfo();
    }
  }, [contactInfo, fetchContactInfo]);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    agreeSms: false,
  });

  const ASUNTO_OPTIONS = [
    t('contact.select_subject'),
    t('contact.subject_general'),
    t('contact.subject_orders'),
    t('contact.subject_support'),
    t('contact.subject_other'),
  ];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const smsPromise = fetch(`${API}/contact/sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const emailPromise = fetch(`${API}/contact/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      // Send both simultaneously
      const results = await Promise.allSettled([smsPromise, emailPromise]);
      const [smsResult, emailResult] = results;

      let smsSuccess = false;
      let emailSuccess = false;

      // Check SMS result
      if (smsResult.status === 'fulfilled' && smsResult.value.ok) {
        smsSuccess = true;
      }

      // Check Email result
      if (emailResult.status === 'fulfilled' && emailResult.value.ok) {
        emailSuccess = true;
      }

      // If both fail, throw error
      if (!smsSuccess && !emailSuccess) {
        throw new Error('No se pudo enviar ni por SMS ni por correo.');
      }

      // At least one succeeded
      setSubmitStatus({ type: 'success', text: t('contact.success') });
      setForm({ fullName: '', email: '', phone: '', subject: '', message: '', agreeSms: false });
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus({ type: 'error', text: t('contact.error') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] pt-[6.25rem]">
      {/* ─── Hero Banner: Solid Brand Header ─── */}
      <section className="w-full bg-[#a8876c] px-[5%] py-16 md:py-24 text-[#3a2f2a]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest mb-3 block text-[#3a2f2a]/80">
              LET'S TALK ABOUT YOUR PROJECT
            </span>
            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl leading-[1.05] max-w-3xl text-[#3a2f2a]">
              {contactInfo?.title || 'Get in Touch with Us'}
            </h1>
            <p className="text-sm md:text-base text-[#3a2f2a]/90 mt-5 max-w-xl font-medium leading-relaxed">
              {contactInfo?.description || 'Ready to bring your concrete and landscaping visions to reality? Contact us for a free estimate or any questions.'}
            </p>
          </div>

          <div className="flex-shrink-0">
            <a
              href={`tel:${contactInfo?.phone ? contactInfo.phone.replace(/[^0-9+]/g, '') : '+18013472165'}`}
              className="inline-block bg-[#3a2f2a] hover:bg-black text-white font-bold uppercase text-xs tracking-widest px-8 py-4 transition-colors"
            >
              Call {contactInfo?.phone || '+1 (801) 347-2165'}
            </a>
          </div>
        </div>
      </section>

      {/* ─── Main Content: Split Contact Info & Form ─── */}
      <div className="w-full py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            
            {/* Left Column: Direct Info, Hours & Map (5 cols) */}
            <div className="lg:col-span-5 space-y-10">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#a8876c] block mb-2">
                  DIRECT CONTACT
                </span>
                <h2 className="font-serif text-3xl font-bold text-[#3a2f2a] mb-6">
                  We're Here to Help
                </h2>
                
                <div className="space-y-6 pt-2 border-t border-gray-200">
                  <a
                    href={`tel:${contactInfo?.phone ? contactInfo.phone.replace(/[^0-9+]/g, '') : '+18013472165'}`}
                    className="group flex items-start gap-4 text-[#3a2f2a] hover:text-[#a8876c] transition-colors"
                  >
                    <div className="w-12 h-12 bg-white border border-gray-200 flex items-center justify-center shrink-0 group-hover:border-[#a8876c] transition-colors">
                      <Phone className="w-5 h-5 text-[#a8876c]" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">Phone Number</p>
                      <p className="font-serif text-lg font-bold">{contactInfo?.phone || '+1 (801) 347-2165'}</p>
                    </div>
                  </a>

                  <a
                    href={`mailto:${contactInfo?.email || 'josarzc@hotmail.com'}`}
                    className="group flex items-start gap-4 text-[#3a2f2a] hover:text-[#a8876c] transition-colors"
                  >
                    <div className="w-12 h-12 bg-white border border-gray-200 flex items-center justify-center shrink-0 group-hover:border-[#a8876c] transition-colors">
                      <Mail className="w-5 h-5 text-[#a8876c]" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">Email Address</p>
                      <p className="font-serif text-lg font-bold break-all">{contactInfo?.email || 'josarzc@hotmail.com'}</p>
                    </div>
                  </a>
                </div>
              </div>

              {/* Location Map */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3">Service Location</p>
                <div className="overflow-hidden border border-gray-200 h-64 bg-white shadow-sm">
                  <iframe
                    title="Location Map"
                    src="https://maps.google.com/maps?q=6873%20S%20Heather%20way%2C%20West%20Jordan%20UT%2084084&t=&z=15&ie=UTF8&iwloc=&output=embed"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>

              {/* Social links */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3">Follow Us</p>
                <div className="flex gap-3">
                  <a
                    href="https://www.facebook.com/share/14Wq4uekiZY/?mibextid=wwXIfr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-11 h-11 bg-white border border-gray-200 flex items-center justify-center text-[#3a2f2a] hover:border-[#a8876c] hover:text-[#a8876c] transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook className="w-4 h-4" />
                  </a>
                  <a
                    href="https://www.instagram.com/bj_concrete?igsh=MXZ6NXZvamRicnA3dg%3D%3D&utm_source=qr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-11 h-11 bg-white border border-gray-200 flex items-center justify-center text-[#3a2f2a] hover:border-[#a8876c] hover:text-[#a8876c] transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Right Column: Clean Editorial Form (7 cols) */}
            <div className="lg:col-span-7 bg-white p-8 md:p-12 border border-gray-100 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#a8876c] block mb-2">
                ESTIMATE REQUEST
              </span>
              <h2 className="font-serif text-3xl font-bold text-[#3a2f2a] mb-2">
                {t('contact.form_title') || 'Send us a message'}
              </h2>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                {t('contact.form_desc') || 'Fill out the form below and our team will get back to you with an estimate or answer your inquiry as soon as possible.'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-[#3a2f2a]">
                      {t('contact.name')}
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      required
                      placeholder={t('contact.name_placeholder')}
                      value={form.fullName}
                      onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                      className="mt-2 bg-[#fdfbf9] border-gray-200 rounded-none h-11 text-xs text-[#3a2f2a] focus:border-[#a8876c]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-[#3a2f2a]">
                      {t('contact.phone')}
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      placeholder={t('contact.phone_placeholder')}
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      className="mt-2 bg-[#fdfbf9] border-gray-200 rounded-none h-11 text-xs text-[#3a2f2a] focus:border-[#a8876c]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-[#3a2f2a]">
                      {t('contact.email')}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="john@example.com"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="mt-2 bg-[#fdfbf9] border-gray-200 rounded-none h-11 text-xs text-[#3a2f2a] focus:border-[#a8876c]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="subject" className="text-xs font-bold uppercase tracking-wider text-[#3a2f2a]">
                      {t('contact.subject')}
                    </Label>
                    <select
                      id="subject"
                      value={form.subject}
                      onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                      className="mt-2 w-full h-11 border border-gray-200 bg-[#fdfbf9] px-3 py-2 text-xs text-[#3a2f2a] focus:outline-none focus:border-[#a8876c]"
                    >
                      {ASUNTO_OPTIONS.map((opt) => (
                        <option key={opt} value={opt === t('contact.select_subject') ? '' : opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="message" className="text-xs font-bold uppercase tracking-wider text-[#3a2f2a]">
                    {t('contact.message')}
                  </Label>
                  <textarea
                    id="message"
                    rows={5}
                    required
                    placeholder={t('contact.message_placeholder')}
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    className="mt-2 w-full border border-gray-200 bg-[#fdfbf9] px-4 py-3 text-xs text-[#3a2f2a] placeholder:text-gray-400 focus:outline-none focus:border-[#a8876c] resize-none"
                  />
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="agreeSms"
                    required
                    checked={form.agreeSms}
                    onChange={(e) => setForm((f) => ({ ...f, agreeSms: e.target.checked }))}
                    className="mt-1 h-4 w-4 shrink-0 rounded-none border-gray-300 text-[#a8876c] focus:ring-[#a8876c]"
                  />
                  <Label htmlFor="agreeSms" className="text-xs text-gray-500 font-normal leading-relaxed cursor-pointer">
                    I agree to receive SMS messages from JJ Construction. Message frequency varies. Message and data rates may apply. Reply STOP to opt out. Reply HELP for assistance.
                  </Label>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#a8876c] hover:bg-[#3a2f2a] text-white font-bold uppercase text-xs tracking-widest py-6 rounded-none transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? t('contact.sending') : t('contact.send')}
                    {!isSubmitting && <Send className="w-4 h-4 ml-2" />}
                  </Button>

                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-400 mt-4 text-center">
                    <span>
                      <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-[#a8876c]">Privacy Policy</a>
                    </span>
                    <span>•</span>
                    <span>
                      <a href="/terms-conditions" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-[#a8876c]">Terms & Conditions</a>
                    </span>
                  </div>
                </div>

                {submitStatus && (
                  <p
                    className={`text-sm font-semibold text-center p-3 ${
                      submitStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {submitStatus.text}
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
