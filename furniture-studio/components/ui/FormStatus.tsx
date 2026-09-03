export function FormStatus({ state }: { state: { status: 'idle' | 'success' | 'error'; message?: string } }) {
  if (state.status === 'idle') return null;
  return (
    <p
      role={state.status === 'success' ? 'status' : 'alert'}
      className={`border px-4 py-3 text-sm ${
        state.status === 'success'
          ? 'border-white/15 bg-white/[0.03] text-white/90'
          : 'border-red-300/25 bg-red-300/5 text-red-200'
      }`}
    >
      {state.message ?? (state.status === 'success' ? 'Сохранено.' : 'Не удалось сохранить изменения.')}
    </p>
  );
}
