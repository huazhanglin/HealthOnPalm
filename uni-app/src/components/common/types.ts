/** HaButton 类型 */
export type HaButtonType = "primary" | "default" | "text";

/** HaButton 尺寸 */
export type HaButtonSize = "large" | "medium" | "small";

/** HaAvatar 尺寸 */
export type HaAvatarSize = "large" | "medium" | "small";

/** HaAvatar 占位样式 */
export type HaAvatarFallback = "brand" | "initial";

/** HaBrandLogo 尺寸 */
export type HaBrandLogoSize = "xlarge" | "large" | "medium" | "small";

/** HaToast 类型 */
export type HaToastType = "success" | "error" | "warning";

/** HaRadioGroup 选项 */
export interface HaRadioOption {
  label: string;
  value: string | number;
}

/** HaToast 状态 */
export interface HaToastState {
  visible: boolean;
  message: string;
  type: HaToastType;
}
