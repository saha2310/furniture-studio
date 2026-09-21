export function FormStatus({ state }: { state: { status: 'idle' | 'success' | 'error'; message?: string } }) {
  if (state.status === 'idle') return null;
  return (
    <p
      role={state.status === 'success' ? 'status' : 'alert'}
      className={`border px-4 py-3 text-sm ${
        state.status === 'success'
          ? 'border-ink/15 bg-ink/[0.03] text-ink/90'
          : 'border-danger/25 bg-danger/5 text-danger'
      }`}
    >
      {state.message ?? (state.status === 'success' ? 'Сохранено.' : 'Не удалось сохранить изменения.')}
    </p>
  );
}
