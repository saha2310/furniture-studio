import { getSiteSettings, getAllContactLinksAdmin, getMenuItemsAdmin } from '@/lib/queries/site';
import { GeneralSettingsForm } from '@/components/admin/settings/GeneralSettingsForm';
import { AssetUploadForm } from '@/components/admin/settings/AssetUploadForm';
import { MenuManager } from '@/components/admin/settings/MenuManager';
import { SocialLinksManager } from '@/components/admin/settings/SocialLinksManager';
import { BackupPanel } from '@/components/admin/backup/BackupPanel';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import { AdminSection } from '@/components/admin/shared/AdminSection';

export default async function AdminSettingsPage() {
  const [settings, contactLinks, menu] = await Promise.all([getSiteSettings(), getAllContactLinksAdmin(), getMenuItemsAdmin()]);
  return <div className="max-w-5xl"><PageHeader title="Настройки" description="Общие данные, SEO, изображения бренда, меню и способы связи." /><div className="mt-6 space-y-3">
    <AdminSection title="Основное и SEO" description="Название, контакты и значения SEO по умолчанию." defaultOpen><GeneralSettingsForm settings={settings} /></AdminSection>
    <AdminSection title="Изображения сайта" description="Логотип, иконка вкладки и картинка для предпросмотра ссылок."><div className="grid gap-4 lg:grid-cols-3"><AssetUploadForm field="logo_path" label="Логотип" currentPath={settings?.logo_path ?? null} help="Логотип бренда в шапке сайта. Сохраняется отдельно и не перекрашивается." /><AssetUploadForm field="favicon_path" label="Иконка вкладки" currentPath={settings?.favicon_path ?? null} help="Маленькая иконка вкладки браузера. Рекомендуется квадратное изображение." /><AssetUploadForm field="og_image_path" label="Картинка превью" currentPath={settings?.og_image_path ?? null} help="Картинка для ссылок в мессенджерах и социальных сетях." /></div></AdminSection>
    <AdminSection title="Меню сайта" description="Название, адрес, порядок и видимость пунктов публичного меню."><MenuManager items={menu} /></AdminSection>
    <AdminSection title="Способы связи" description="Telegram, WhatsApp, VK и другие контакты, которые показываются на сайте."><SocialLinksManager links={contactLinks} /></AdminSection>
    <AdminSection title="Резервные копии" description="Экспорт и импорт каталога и настроек сайта одним файлом."><BackupPanel /></AdminSection>
  </div></div>;
}
