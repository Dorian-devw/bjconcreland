import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, Clock, Facebook, Instagram, Twitter } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettingsStore } from '@/store/settingsStore';

export function Footer() {
  const { t } = useLanguage();
  const { logo, footer, fetchFooter } = useSettingsStore();
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchFooter();
  }, [fetchFooter]);

  return (
    <footer className="bg-[#333] text-white">
      <div className="container-custom py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* logo description*/}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              {logo ? (
                <img src={logo} alt="JJ Construcción" className="h-16 w-auto object-contain" />
              ) : (
                <span className="text-xl font-bold text-[#1e5631]">JJ construccion</span>
              )}
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">
              {footer?.description || t('footer.description')}
            </p>
          </div>

          {/* categories*/}
          <div>
            <h4 className="text-lg font-medium mb-4 text-[#c8a48c]">{t('footer.popular_categories')}</h4>
            <ul className="space-y-2">
              {[
                t('footer.power_tools'),
                t('footer.manual_tools'),
                t('footer.construction_materials'),
                t('footer.paints_finishes'),
                t('footer.plumbing'),
                t('footer.electricity'),
              ].map((category) => (
                <li key={category}>
                  <Link
                    to="/catalogo"
                    className="text-gray-400 text-sm hover:text-[#1e5631] transition-colors"
                  >
                    {category}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* client side */}
          <div>
            <h4 className="text-lg font-bold mb-4 text-[#2d9d5f]">{t('footer.contact_title')}</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#e85d04]" />
                <a href={`tel:${footer?.phone || '+18013472165'}`} className="text-gray-400 text-sm hover:text-[#2d9d5f] transition-colors">{footer?.phone || '+1 (801) 347-2165'}</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#e85d04]" />
                <a href={`mailto:${footer?.email || 'josarzc@hotmail.com'}`} className="text-gray-400 text-sm hover:text-[#2d9d5f] transition-colors">{footer?.email || 'josarzc@hotmail.com'}</a>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-[#e85d04] mt-0.5" />
                <div className="text-gray-400 text-sm">
                  <p>{t('footer.mon_fri')}: {footer?.scheduleWeekdays || '8:00 - 18:00'}</p>
                  <p>{t('footer.sat')}: {footer?.scheduleWeekends || '8:00 - 13:00'}</p>
                </div>
              </li>
            </ul>
            <div className="mt-4 rounded-lg overflow-hidden h-48 border border-gray-700 bg-gray-800">
              <iframe
                title="Location Map"
                src={footer?.mapUrl || "https://maps.google.com/maps?q=6873%20S%20Heather%20way%2C%20West%20Jordan%20UT%2084084&t=&z=15&ie=UTF8&iwloc=&output=embed"}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>

          {/* social network */}
          <div>
            <h4 className="text-lg font-bold mb-4 text-[#2d9d5f]">{t('footer.follow_us')}</h4>
            <div className="flex gap-4">
              <a
                href={footer?.facebookUrl || "https://www.facebook.com/share/14Wq4uekiZY/?mibextid=wwXIfr"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#1e5631] rounded-full flex items-center justify-center transition-all hover:bg-[#164a28] hover:scale-110"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href={footer?.instagramUrl || "https://www.instagram.com/bj_concrete?igsh=MXZ6NXZvamRicnA3dg%3D%3D&utm_source=qr"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#1e5631] rounded-full flex items-center justify-center transition-all hover:bg-[#164a28] hover:scale-110"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href={footer?.twitterUrl || "#"}
                target={footer?.twitterUrl && footer.twitterUrl !== "#" ? "_blank" : undefined}
                rel={footer?.twitterUrl && footer.twitterUrl !== "#" ? "noopener noreferrer" : undefined}
                className="w-10 h-10 bg-[#1e5631] rounded-full flex items-center justify-center transition-all hover:bg-[#164a28] hover:scale-110"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* bottom bar */}
      <div className="border-t border-gray-700">
        <div className="container-custom py-4">
          <p className="text-center text-gray-500 text-sm">
            © {currentYear} JJ construccion. {t('footer.rights')}
          </p>
        </div>
      </div>
    </footer>
  );
}
