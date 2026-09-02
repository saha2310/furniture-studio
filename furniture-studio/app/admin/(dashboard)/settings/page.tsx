import { getSiteSettings, getAllContactLinksAdmin, getMenuItemsAdmin } from '@/lib/queries/site';
import { GeneralSettingsForm } from '@/components/admin/settings/GeneralSettingsForm';
import { AssetUploadForm } from '@/components/admin/settings/AssetUploadForm';
import { MenuManager } from '@/components/admin/settings/MenuManager';
import { SocialLinksManager } from '@/components/admin/settings/SocialLinksManager';
import { PageHeader } from '@/components/admin/shared/PageHeader';

export default async function AdminSettingsPage() {
  const [settings, contactLinks, menu] = await Promise.all([getSiteSettings(), getAllContactLinksAdmin(), getMenuItemsAdmin()]);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Настройки" />

      <div className="mt-6 flex flex-col gap-6">
        <GeneralSettingsForm settings={settings} />

        <div>
          <h2 className="mb-3 text-lg">Логотип, favicon, OG-картинка</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <AssetUploadForm field="logo_path" label="Логотип" currentPath={settings?.logo_path ?? null} />
            <AssetUploadForm field="favicon_path" label="Favicon" currentPath={settings?.favicon_path ?? null} />
            <AssetUploadForm field="og_image_path" label="OG-картинка" currentPath={settings?.og_image_path ?? null} />
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-lg">Меню сайта</h2>
          <p className="mb-3 text-sm text-espresso">Название, адрес, порядок и видимость каждого пункта управляются здесь.</p>
          <MenuManager items={menu} />
        </div>

        <div>
          <h2 className="mb-3 text-lg">Способы связи</h2>
          <p className="mb-3 text-sm text-espresso">
            Добавляйте любые платформы — Telegram, WhatsApp, VK, TikTok или произвольную ссылку.
          </p>
          <SocialLinksManager links={contactLinks} />
        </div>
      </div>
    </div>
  );
}
