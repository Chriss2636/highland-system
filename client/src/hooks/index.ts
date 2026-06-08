export { usePermissions } from './permissions';

export const useNotify = () => ({
  success: (msg: string) => alert("✅ " + msg),
  error: (msg: string) => alert("❌ " + msg),
});