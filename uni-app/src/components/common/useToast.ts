import { reactive } from "vue";
import type { HaToastState, HaToastType } from "./types";

/** Toast 全局状态 */
export const toastState = reactive<HaToastState>({
  visible: false,
  message: "",
  type: "success",
});

let hideTimer: ReturnType<typeof setTimeout> | null = null;

/** 显示 Toast */
function showToast(message: string, type: HaToastType, duration = 2500): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  toastState.message = message;
  toastState.type = type;
  toastState.visible = true;

  hideTimer = setTimeout(() => {
    toastState.visible = false;
    hideTimer = null;
  }, duration);
}

/** HaToast 命令式 API */
export const HaToast = {
  success(text: string): void {
    showToast(text, "success");
  },
  error(text: string): void {
    showToast(text, "error");
  },
  warning(text: string): void {
    showToast(text, "warning");
  },
};
