import { PageHeader } from '@/components/admin/shared/PageHeader';
import { MediaLibraryManager } from '@/components/admin/media/MediaLibraryManager';

export default function AdminMediaPage() {
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Медиатека"
        description="Все файлы в хранилище: фото работ, обложки категорий и картинки сайта. Показывает, какие из них нигде не используются, и позволяет удалить их — по одному или сразу пачкой."
      />
      <div className="mt-6">
        <MediaLibraryManager />
      </div>
    </div>
  );
}
