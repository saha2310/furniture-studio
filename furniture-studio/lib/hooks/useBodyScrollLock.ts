'use client';

import { useEffect } from 'react';

// Модуль-уровневый счётчик, а не useState/useRef внутри компонента: диалоги
// иногда открываются друг над другом (например «Открыть галерею» поверх уже
// открытого кроп-редактора), и снятие блокировки при закрытии ВНУТРЕННЕГО
// диалога не должно случайно отпустить страницу, пока ВНЕШНИЙ ещё открыт.
// Реально снимаем блокировку только когда счётчик доходит до нуля.
let lockCount = 0;
let savedScrollY = 0;

/**
 * Блокирует скролл/pull-to-refresh/pinch-zoom страницы под модальным
 * диалогом, пока тот открыт (`active !== false`).
 *
 * Зачем это вообще нужно: сами диалоги — `position: fixed inset-0` — по
 * себе НЕ мешают жестам (пинч, два пальца, прокрутка колёсиком/трекпадом)
 * «протекать» сквозь них и двигать страницу позади, особенно на мобильных,
 * где fixed-позиционирование само по себе не останавливает bounce-скролл
 * body. Раньше в ImageCropDialog/CatalogImageSettingsDialog/
 * MediaLibraryPicker это никак не блокировалось — отсюда и ощущение "пытаюсь
 * приблизить фото, а вместо этого едет вся страница".
 *
 * Способ рабочий на iOS Safari (obычный `overflow: hidden` на body там не
 * держит скролл при жестах): запоминаем текущий scrollY, "приклеиваем" body
 * через position: fixed с отрицательным top, а при снятии — возвращаем как
 * было и прокручиваем обратно на то же место.
 */
export function useBodyScrollLock(active: boolean = true) {
  useEffect(() => {
    if (!active) return;

    if (lockCount === 0) {
      savedScrollY = window.scrollY;
      const body = document.body.style;
      body.position = 'fixed';
      body.top = `-${savedScrollY}px`;
      body.left = '0';
      body.right = '0';
      body.overflow = 'hidden';
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount > 0) return;
      const body = document.body.style;
      body.position = '';
      body.top = '';
      body.left = '';
      body.right = '';
      body.overflow = '';
      window.scrollTo(0, savedScrollY);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
