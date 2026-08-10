/** 应用内品牌图标（Vite 打包，App WebView 可正常加载） */
import icon180 from "./icon-180.png";
import icon120 from "./icon-120.png";
import icon80 from "./icon-80.png";
import icon60 from "./icon-60.png";
import icon40 from "./icon-40.png";

export const brandIcons = {
  xlarge: icon180,
  large: icon120,
  medium: icon80,
  small: icon60,
  tiny: icon40,
} as const;

export type BrandIconKey = keyof typeof brandIcons;
