export function FormStatus({ state }: { state: { status: 'idle' | 'success' | 'error'; message?: string } }) {
  if (state.status === 'idle') return null;
  return (
    <p role={state.status === 'success' ? 'status' : 'alert'} className={`border px-4 py-3 text-sm ${state.status === 'success' ? 'border-white/15 bg-white/[0.03] text-ink' : 'border-red-400/30 bg-red-400/5 text-red-200'}`}>
      {state.message ?? (state.status === 'success' ? 'Заявка отправлена.' : 'Что-то пошло не так. Попробуйте ещё раз.')}
    </p>
  );
}
