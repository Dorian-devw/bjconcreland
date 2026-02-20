import { useState } from 'react';
import { Phone, Mail, Send, Facebook, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/context/LanguageContext';
import { API } from '@/lib/api';

export function Contact() {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
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
      const response = await fetch(`${API}/contact/sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Error al enviar el mensaje');
      }

      setSubmitStatus({ type: 'success', text: t('contact.success') });
      setForm({ fullName: '', email: '', phone: '', subject: '', message: '' });
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus({ type: 'error', text: t('contact.error') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8] pt-[8.75rem]">
      <div className="max-w-6xl mx-auto px-[5%] py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[520px] rounded-xl overflow-hidden shadow-lg">
          {/* Panel izquierdo - verde oscuro */}
          <div className="bg-[#1e5631] text-white p-10 lg:p-12 flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <h1 className="text-3xl lg:text-4xl font-bold mb-4">{t('contact.title')}</h1>
              <p className="text-white/95 text-base lg:text-lg leading-relaxed mb-10">
                {t('contact.description')}
              </p>
              <div className="space-y-6">
                <a
                  href="tel:+18013472165"
                  className="flex items-center gap-4 text-white hover:opacity-90 transition-opacity"
                >
                  <div className="w-12 h-12 rounded-full bg-[#e85d04] flex items-center justify-center shrink-0">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-white/80">Teléfono</p>
                    <p className="text-lg font-semibold">+1 (801) 347-2165</p>
                  </div>
                </a>
                <a
                  href="mailto:josarzc@hotmail.com"
                  className="flex items-center gap-4 text-white hover:opacity-90 transition-opacity"
                >
                  <div className="w-12 h-12 rounded-full bg-[#e85d04] flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-white/80">{t('contact.email')}</p>
                    <p className="text-lg font-semibold break-all">josarzc@hotmail.com</p>
                  </div>
                </a>
              </div>
            </div>
            <div className="mt-8 rounded-xl overflow-hidden h-48 shadow-lg border-2 border-white/20 relative z-10">
              <iframe
                title="Location Map"
                src="https://maps.google.com/maps?q=6873%20S%20Heather%20way%2C%20West%20Jordan%20UT%2084084&t=&z=15&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
            <div className="flex gap-3 mt-8 relative z-10">
              <a
                href="https://www.facebook.com/share/14Wq4uekiZY/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://www.instagram.com/bj_concrete?igsh=MXZ6NXZvamRicnA3dg%3D%3D&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Panel derecho - formulario */}
          <div className="bg-white p-10 lg:p-12 flex flex-col justify-center">
            <h2 className="text-2xl font-bold text-[#333] mb-2">{t('contact.form_title')}</h2>
            <p className="text-gray-500 text-sm mb-8">
              {t('contact.form_desc')}
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="fullName" className="text-[#333] font-medium">
                  {t('contact.name')}
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder={t('contact.name_placeholder')}
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="mt-1.5 border-gray-200"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-[#333] font-medium">
                  {t('contact.phone')}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={t('contact.phone_placeholder')}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="mt-1.5 border-gray-200"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-[#333] font-medium">
                  {t('contact.email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="juan@ejemplo.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1.5 border-gray-200"
                />
              </div>
              <div>
                <Label htmlFor="subject" className="text-[#333] font-medium">
                  {t('contact.subject')}
                </Label>
                <select
                  id="subject"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  className="mt-1.5 w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#1e5631] focus:border-[#1e5631]"
                >
                  {ASUNTO_OPTIONS.map((opt) => (
                    <option key={opt} value={opt === t('contact.select_subject') ? '' : opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="message" className="text-[#333] font-medium">
                  {t('contact.message')}
                </Label>
                <textarea
                  id="message"
                  rows={4}
                  placeholder={t('contact.message_placeholder')}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  className="mt-1.5 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-[#333] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e5631] focus:border-[#1e5631] resize-none"
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#e85d04] hover:bg-[#d35400] text-white font-semibold py-3 text-base disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t('contact.sending') : t('contact.send')}
                {!isSubmitting && <Send className="w-5 h-5 ml-2" />}
              </Button>
              {submitStatus && (
                <p
                  className={`text-sm font-medium ${
                    submitStatus.type === 'success' ? 'text-green-600' : 'text-red-600'
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
  );
}
