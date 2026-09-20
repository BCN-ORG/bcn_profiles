import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { AppProviders } from '@/components/providers/app-providers';
import { AuthProvider } from '@/components/auth/auth-provider';
import { LocaleBootstrap } from '@/components/i18n/locale-controls';
import { routing } from '@/i18n/routing';
import '../globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as 'vi' | 'en')) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={jakarta.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            // Theme flash + sync NEXT_LOCALE from localStorage (no reload — LocaleBootstrap soft-refreshes if needed).
            __html: `(function(){try{var t=localStorage.getItem('bcn-theme');if(t!=='light'&&t!=='dark')t='light';document.documentElement.classList.remove('light','dark');document.documentElement.classList.add(t);}catch(e){document.documentElement.classList.add('light');}try{var k='bcn-locale',c='NEXT_LOCALE',m=document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]*)/);var cookie=m?decodeURIComponent(m[1]):'';var stored=null;try{stored=localStorage.getItem(k);}catch(e){}if(stored!=='vi'&&stored!=='en'){if(cookie==='vi'||cookie==='en'){try{localStorage.setItem(k,cookie);}catch(e){}}return;}if(cookie===stored)return;document.cookie=c+'='+stored+'; path=/; max-age=31536000; samesite=lax';}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans">
        <NextIntlClientProvider messages={messages}>
          <AppProviders>
            <AuthProvider>
              <LocaleBootstrap />
              {children}
            </AuthProvider>
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
