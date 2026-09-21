'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActionResult } from '@/lib/actions/works';

// Общая механика «сохраняется само» для админки категорий: у неё нет кнопки
// «Сохранить», каждое изменение сразу уходит в БД отдельным Server Action.

export type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string };

// Оборачивает любую мутацию: показывает «Сохраняем…» → «Сохранено» или
// ошибку, а сетевые/серверные сбои (когда экшен вообще не долетел) превращает
// в понятное сообщение вместо необработанного исключения.
export type Track = (task: () => Promise<ActionResult>) => Promise<ActionResult>;

export function useSaveStatus() {
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' });
  const pending = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const track: Track = useCallback(async (task) => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    pending.current += 1;
    setStatus({ kind: 'saving' });

    let result: ActionResult;
    try {
      result = await task();
    } catch {
      result = { success: false, message: 'Не удалось сохранить. Проверьте соединение и повторите.' };
    }

    pending.current -= 1;
    if (!result.success) {
      setStatus({ kind: 'error', message: result.message });
    } else if (pending.current === 0) {
      setStatus({ kind: 'saved' });
      timer.current = setTimeout(() => setStatus({ kind: 'idle' }), 2500);
    }
    return result;
  }, []);

  return { status, track };
}

// Поле названия: сохраняется через 0,9 с после последнего нажатия клавиши и
// сразу при уходе из поля / Enter. Название короче minLength в БД не уходит —
// при уходе из поля возвращается последнее сохранённое значение.
export function useAutosavedText({
  serverValue,
  save,
  minLength = 2,
  delay = 900,
}: {
  serverValue: string;
  save: (value: string) => Promise<ActionResult>;
  minLength?: number;
  delay?: number;
}) {
  const [value, setValue] = useState(serverValue);
  const [hint, setHint] = useState<string | null>(null);
  const valueRef = useRef(serverValue);
  const lastSaved = useRef(serverValue);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => { lastSaved.current = serverValue; }, [serverValue]);

  const flush = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === lastSaved.current || trimmed.length < minLength) return;
    const result = await saveRef.current(trimmed);
    if (result.success) lastSaved.current = trimmed;
  }, [minLength]);

  function clearTimer() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }

  function onChange(next: string) {
    valueRef.current = next;
    setValue(next);
    setHint(null);
    clearTimer();
    timer.current = setTimeout(() => { timer.current = null; void flush(valueRef.current); }, delay);
  }

  function onBlur() {
    clearTimer();
    const trimmed = valueRef.current.trim();
    if (trimmed.length < minLength) {
      valueRef.current = lastSaved.current;
      setValue(lastSaved.current);
      setHint(`Название — минимум ${minLength} символа. Вернули прежнее.`);
      return;
    }
    void flush(trimmed);
  }

  return { value, onChange, onBlur, hint };
}
