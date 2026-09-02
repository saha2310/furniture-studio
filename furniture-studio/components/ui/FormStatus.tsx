export function FormStatus({ state }: { state: { status: 'idle' | 'success' | 'error'; message?: string } }) {
  if (state.status === 'idle') return null;
  if (state.status === 'success') {
    return (
      <p role="status" className="rounded bg-surface px-4 py-3 text-sm text-espresso">
        {state.message ?? 'Готово.'}
      </p>
    );
  }
  return (
    <p role="alert" className="rounded bg-red-50 px-4 py-3 text-sm text-red-700">
      {state.message ?? 'Что-то пошло не так. Попробуйте ещё раз.'}
    </p>
  );
}
